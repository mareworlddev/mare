'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  Home,
  Languages,
  ListChecks,
  LogOut,
  Menu,
  PenLine,
  Route,
  Search,
  Settings2,
  Sparkles,
  User,
  Binary,
  Image as ImageIcon,
} from 'lucide-react';

import type { SlashCommand } from './MareComposer';
import { ThreadList, type Thread } from './MareThreadList';
import { MareProjectsSection } from './MareProjectsSection';
import { MareKanban } from './MareKanban';
import { Conversation } from './MareConversation';
import { MessageBubble } from './MareMessageBubble';
import { MessageActions } from './MareMessageActions';
import { StreamingText } from './MareStreamingText';
import { Reasoning } from './MareReasoning';
import { TextShimmer } from './MareTextShimmer';
import { SourcesStack, type Source } from './MareSourcesStack';
import { ToolCallCard } from './MareToolCallCard';
import { EmptyStateGreeting, type Starter } from './MareEmptyState';
import { EffortPicker, type EffortLevel, type ModelOption } from './MareModelPicker';
import { ComposerToolsMenu, type ToolToggle } from './MareToolsMenu';

import { MareAvatar } from './MareIcon';
import { MareBackground } from './MareBackground';
import { AnimatedPetSprite } from './MareSprite';
import { MarePet } from './MarePet';
import { MarePlayground } from './MarePlayground';
import { CollapsibleText, markdownComponents, markdownRehypePlugins } from './MareMarkdown';
import { MareComposer } from './MareComposer';
import { MareImageGenerating, MareImageNote } from './MareImageGenerating';
import type { PendingAttachment } from './MareAttachments';
import { DitherField } from '@/components/ui/dither-field';

import { DEFAULT_MARE_AI_MODEL, isMareAiModelId, MARE_AI_MODELS } from '@/constants/aiModels';
import {
  MARE_CHAT_ROWS,
  MARE_DEFAULT_SETTINGS,
  MARE_SKILLS,
  MARE_STARTERS,
  MARE_TOOLS,
} from '@/lib/mare/constants';
import { isMareCompliment } from '@/lib/mare/compliments';
import { embed, pgVector } from '@/lib/mare/embeddings';
import { streamMareChat } from '@/lib/mare/client';
import {
  createNote,
  createProject,
  deleteNote,
  deleteProject,
  listNotes,
  listProjects,
  projectPayload,
  type MareNote,
  type MareProject,
  type MareTask,
} from '@/lib/mare/projects';
import { isMareUuid } from '@/lib/mare/mirror';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { isSafeExternalUrl } from '@/lib/security/url';
import { useMareSounds } from '@/hooks/useMareSounds';
import type {
  MareConversation,
  MareMessage,
  MareMessageAttachment,
  MarePersistedState,
  MareSettings,
  MareSkillId,
  MareSource,
  MareToolCall,
} from '@/lib/mare/types';

const STORAGE_KEY = 'agentmare-workspace:v2';

/** Marca do markdown de uma imagem que a própria Mare gerou (proxy interno). */
const GENERATED_IMAGE = /!\[[^\]]*\]\((\/api\/mare\/image\?[^)\s]+)\)/;

function generatedImageUrl(content: string) {
  return GENERATED_IMAGE.exec(content)?.[1];
}

/** Sem a imagem: o cartão de carregamento fica no lugar dela até a arte chegar. */
function withoutGeneratedImage(content: string) {
  return content.replace(GENERATED_IMAGE, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Rejeição de fetch/sinal abortado (AbortError e semelhantes). */
function abortReason(cause: unknown): boolean {
  const error = cause as Error | undefined;
  return (
    !!error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError' || /aborted|abort(i|i)do/i.test(error.message || ''))
  );
}

/** Conversas precisam de uuid real: é a chave do espelho durável no Supabase. */
function newConversationId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : uid('chat');
}

/** Conta logada, só com o que pertence à sessão — nada de auth.users na API pública. */
interface MareSessionUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

function iconFor(name: string, size = 16) {
  const props = { size, strokeWidth: 1.8 };
  switch (name) {
    case 'search': return <Search {...props} />;
    case 'book': return <BookOpen {...props} />;
    case 'list': return <ListChecks {...props} />;
    case 'plan': return <Route {...props} />;
    case 'pen': return <PenLine {...props} />;
    case 'check': return <CheckCircle2 {...props} />;
    case 'languages': return <Languages {...props} />;
    case 'sparkles': return <Sparkles {...props} />;
    case 'image': return <ImageIcon {...props} />;
    case 'code': return <Code2 {...props} />;
    default: return <FileText {...props} />;
  }
}

function emptyState(): MarePersistedState {
  return {
    conversations: [],
    activeId: '',
    settings: { ...MARE_DEFAULT_SETTINGS, enabledTools: [...MARE_DEFAULT_SETTINGS.enabledTools] },
    // Estado nunca carregado não tem marca própria: senão um workspace vazio
    // "ganha" do blob remoto na comparação por updatedAt após o login.
    updatedAt: '',
  };
}

function normalizeState(value: unknown): MarePersistedState {
  const base = emptyState();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Partial<MarePersistedState>;
  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations
        .filter((item): item is MareConversation => Boolean(item && typeof item.id === 'string' && Array.isArray(item.messages)))
        .map((item) => ({
          ...item,
          messages: item.messages.map((message) => ({
            ...message,
            toolCalls: Array.isArray(message.toolCalls) ? message.toolCalls : [],
            sources: Array.isArray(message.sources) ? message.sources : [],
          })),
        }))
    : [];
  return {
    conversations,
    activeId: raw.activeId && conversations.some((item) => item.id === raw.activeId) ? raw.activeId : conversations[0]?.id || '',
    // Modelos removidos do catálogo voltam para o default, sem vazar id bruto na interface.
    settings: {
      ...base.settings,
      ...(raw.settings || {}),
      model: raw.settings?.model && isMareAiModelId(raw.settings.model) ? raw.settings.model : DEFAULT_MARE_AI_MODEL,
    },
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  };
}

function groupFor(date: string): Thread['group'] {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 24 * 60 * 60 * 1000) return 'today';
  if (diff < 48 * 60 * 60 * 1000) return 'yesterday';
  return 'week';
}

function sourceToStackSource(source: MareSource, index: number): Source {
  const rawUrl = source.url;
  // Defesa em profundidade: o blob sincronizado também passa por aqui, então a
  // URL é revalidada no ponto de render, não só na hora em que nasceu.
  const url = isSafeExternalUrl(rawUrl) ? rawUrl : undefined;
  return {
    title: source.title,
    url,
    domain: url || (() => { try { return new URL(rawUrl).hostname.replace(/^www\./, ''); } catch { return 'fonte'; } })(),
    color: ['#000e54', '#0553af', '#7aa2e3', '#c7d8f5'][index % 4],
  };
}

const FILE_KINDS: Record<string, PendingAttachment['kind']> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  txt: 'text',
  md: 'text',
};

function fileKind(name: string): PendingAttachment['kind'] {
  return FILE_KINDS[name.split('.').pop()?.toLowerCase() || ''] || 'text';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Texto do documento entra no histórico junto da mensagem que o anexou. */
function historyEntry(message: { role: 'user' | 'assistant'; content: string; attachments?: MareMessageAttachment[] }) {
  const docs = (message.attachments || [])
    .map((doc) => `\n\n[Documento anexado: ${doc.name} (${doc.kind})]\n${doc.text}`)
    .join('');
  return { role: message.role, content: message.content + docs };
}

/** Slider de volume: uma linha, o valor em %, e nada mais. */
function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mare-ws-volume">
      <div className="mare-ws-volume-head">
        <span>{label}</span>
        <span className="mare-ws-volume-value">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label={`Volume de ${label.toLowerCase()}`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mare-ws-range"
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

export default function MareWorkspace() {
  const [state, setState] = useState<MarePersistedState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  /** Só grava depois que o GET remoto respondeu: senão um estado vazio apaga o salvo. */
  const [remoteReady, setRemoteReady] = useState(false);
  /** GET falhou: nunca sobrescreva o blob remoto com o que sobrou no navegador. */
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [clientId, setClientId] = useState('');
  const [input, setInput] = useState('');
  const [command, setCommand] = useState<SlashCommand | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('');
  const [celebrate, setCelebrate] = useState(0);
  const [sources, setSources] = useState<MareSource[]>([]);
  const [toolCalls, setToolCalls] = useState<MareToolCall[]>([]);
  /** Imagens geradas que já carregaram: até lá quem aparece é o cartão. */
  const [loadedImages, setLoadedImages] = useState<Record<string, true>>({});
  const [streamStartedAt, setStreamStartedAt] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Em telas estreitas a sidebar vira gaveta: sem isto ela fica inalcançável. */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [projects, setProjects] = useState<MareProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectNotes, setProjectNotes] = useState<MareNote[]>([]);
  const [view, setView] = useState<'chat' | 'board'>('chat');
  const [sessionUser, setSessionUser] = useState<MareSessionUser | null>(null);
  /** Vira true só depois de consultar a sessão: evita piscar "desabilitado". */
  const [sessionChecked, setSessionChecked] = useState(false);
  const filesRef = useRef(new Map<string, File>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  /** AbortController real do fetch em curso: parar de verdade corta o SSE. */
  const chatAbortRef = useRef<AbortController | null>(null);

  const settings = state.settings;
  const sounds = useMareSounds(settings);
  const activeConversation = useMemo(
    () => state.conversations.find((item) => item.id === state.activeId) || state.conversations[0] || null,
    [state.activeId, state.conversations]
  );
  const activeProject = useMemo(
    () => (activeProjectId ? projects.find((item) => item.id === activeProjectId) || null : null),
    [activeProjectId, projects]
  );
  const messages = activeConversation?.messages || [];
  const conversationProjectId = activeConversation?.projectId || null;

  // Sessão: o próprio usuário lê os dados só do token validado em getUser();
  // a tabela auth.users nunca é exposta para a API pública.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    const supabase = createClient();
    const toBadge = (user: any): MareSessionUser | null =>
      user
        ? {
            id: String(user.id),
            email: String(user.email || ''),
            name: String(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'conta'),
            avatar: typeof user.user_metadata?.picture === 'string' && isSafeExternalUrl(user.user_metadata.picture) ? user.user_metadata.picture : null,
          }
        : null;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (alive) {
          setSessionUser(toBadge(data?.user));
          setSessionChecked(true);
        }
      })
      .catch(() => {
        if (alive) setSessionChecked(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSessionUser(toBadge(session?.user || null));
    });
    return () => {
      alive = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Projetos do usuário (RLS decide o que volta; aqui entra só o que é seu).
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    listProjects()
      .then((rows) => {
        if (alive) setProjects(rows);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!activeProjectId || !isSupabaseConfigured()) {
      setProjectNotes([]);
      return;
    }
    let alive = true;
    listNotes(activeProjectId)
      .then((rows) => { if (alive) setProjectNotes(rows); })
      .catch(() => { if (alive) setProjectNotes([]); });
    return () => { alive = false; };
  }, [activeProjectId]);

  const handleCreateProject = useCallback(async (name: string): Promise<MareProject | string> => {
    try {
      const created = await createProject(name);
      setProjects((current) => [created, ...current]);
      return created;
    } catch (cause) {
      return cause instanceof Error ? cause.message : 'Não consegui criar o projeto.';
    }
  }, []);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((current) => current.filter((item) => item.id !== id));
    setActiveProjectId((current) => (current === id ? null : current));
    setView('chat');
  }, []);

  const handleSelectProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
    setView(id ? 'board' : 'chat');
  }, []);

  const handleCreateNote = useCallback(async (content: string) => {
    if (!activeProjectId) return;
    const created = await createNote(activeProjectId, content);
    setProjectNotes((current) => [created, ...current]);
    if (isSupabaseConfigured()) {
      // Indexação é melhor esforço: a nota continua valendo sem pgvector.
      void createClient().from('mare_vector_memory').insert({
        kind: 'note',
        ref_id: created.id,
        project_id: activeProjectId,
        content: created.content,
        embedding: pgVector(embed(created.content)),
      }).then(({ error }: { error: { message?: string } | null }) => {
        if (error) console.warn('mare:note-index', error.message);
      });
    }
  }, [activeProjectId]);

  const handleDeleteNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setProjectNotes((current) => current.filter((note) => note.id !== id));
    if (isSupabaseConfigured()) {
      void createClient().from('mare_vector_memory').delete().eq('ref_id', id);
    }
  }, []);

  useEffect(() => {
    let id = '';
    try {
      id = window.localStorage.getItem('agentmare-client-id') || '';
      if (!id) {
        id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : uid('client');
        window.localStorage.setItem('agentmare-client-id', id);
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(normalizeState(JSON.parse(raw)));
    } catch {
      // Sem localStorage a conversa segue apenas em memória.
    }
    setClientId(id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !clientId) return;
    let cancelled = false;
    fetch('/api/mare/state', {
      cache: 'no-store',
      headers: { 'X-Mare-Client-Id': clientId },
      signal: AbortSignal.timeout(8000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        if (payload?.state) {
          const remote = normalizeState(payload.state);
          // Compara contra o estado atual (não a closure do render): evita
          // descartar mensagem escrita enquanto o GET estava em voo.
          setState((current) => (current.updatedAt && current.updatedAt >= remote.updatedAt ? current : remote));
        }
        setRemoteReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteFailed(true);
        setRemoteReady(true);
      });
    return () => { cancelled = true; };
    // Só carrega uma vez por cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, clientId]);

  useEffect(() => {
    if (!hydrated || !remoteReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignora cota cheia.
    }
    if (!clientId || remoteFailed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/mare/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Mare-Client-Id': clientId },
        body: JSON.stringify({ state }),
      }).catch(() => undefined);
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, hydrated, remoteReady, remoteFailed, clientId]);

  const updateSettings = useCallback((patch: Partial<MareSettings>) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const threads = useMemo<Thread[]>(
    () => state.conversations.map((item) => ({ id: item.id, title: item.title, group: groupFor(item.updatedAt) })),
    [state.conversations]
  );

  const commands = useMemo<SlashCommand[]>(
    () => MARE_SKILLS.map((skill) => ({ id: skill.command, label: skill.label, hint: skill.hint, icon: iconFor(skill.icon, 15) })),
    []
  );

  const starters = useMemo<Starter[]>(
    () => MARE_STARTERS.map((starter) => ({
      id: starter.id,
      title: starter.title,
      detail: starter.detail,
      prompt: starter.prompt,
      visual: iconFor(starter.icon, 22),
    })),
    []
  );

  const toolToggles = useMemo<ToolToggle[]>(
    () => MARE_TOOLS.map((tool) => ({ id: tool.id, label: tool.label, hint: tool.hint, icon: iconFor(tool.icon, 15) })),
    []
  );

  const modelOptions = useMemo<ModelOption[]>(
    () => MARE_AI_MODELS.map((model) => ({ id: model.id, name: model.label, note: model.company })),
    []
  );

  const uploadAttachment = useCallback(async (file: File) => {
    const id = uid('file');
    filesRef.current.set(id, file);
    setAttachments((current) => [
      ...current,
      {
        id,
        name: file.name,
        kind: fileKind(file.name),
        size: formatBytes(file.size),
        bytes: file.size,
        progress: 0.2,
      },
    ]);

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/mare/attachments', { method: 'POST', body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Não consegui ler esse documento.');
      setAttachments((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, progress: 1, text: payload.text, truncated: Boolean(payload.truncated) }
            : item
        )
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não consegui ler esse documento.';
      setAttachments((current) =>
        current.map((item) => (item.id === id ? { ...item, progress: 1, error: message } : item))
      );
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    files.forEach((file) => void uploadAttachment(file));
  }, [uploadAttachment]);

  const handleRemoveAttachment = useCallback((id: string) => {
    filesRef.current.delete(id);
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleRetryAttachment = useCallback((id: string) => {
    const file = filesRef.current.get(id);
    if (!file) return;
    filesRef.current.delete(id);
    setAttachments((current) => current.filter((item) => item.id !== id));
    void uploadAttachment(file);
  }, [uploadAttachment]);

  const send = useCallback(async (
    rawText: string,
    skillId?: MareSkillId,
    projectId?: string | null,
    targetConversationId?: string
  ) => {
    const text = rawText.trim();
    if ((!text && !attachments.some((item) => item.text)) || isSending) return;
    if (attachments.some((item) => item.progress < 1 && !item.error)) {
      setError('Espera a leitura dos documentos terminar.');
      return;
    }

    const documents: MareMessageAttachment[] = attachments
      .filter((item) => item.progress >= 1 && item.text && !item.error)
      .map((item) => ({
        name: item.name,
        kind: item.kind,
        size: item.size,
        text: item.text as string,
        truncated: item.truncated,
      }));

    const content = text || documents.map((doc) => doc.name).join(', ');

    abortRef.current = false;
    chatAbortRef.current?.abort();
    chatAbortRef.current = new AbortController();
    setError('');
    setInput('');
    setCommand(null);
    setAttachments([]);
    filesRef.current.clear();
    setStreamText('');
    setThoughts([]);
    setSources([]);
    setToolCalls([]);
    setStreamStartedAt(Date.now());
    setIsSending(true);
    sounds.playEntrySound();

    const targetId = targetConversationId || state.activeId;
    const targetConversation = state.conversations.find((item) => item.id === targetId) || activeConversation;
    let conversationId = targetId;
    let conversationTitle = '';
    const userMessage: MareMessage = {
      id: uid('user'),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      skill: skillId,
      attachments: documents.length ? documents : undefined,
    };

    setState((current) => {
      const existing = current.conversations.find((item) => item.id === targetId);
      const nextMessages = [...(existing?.messages || []), userMessage];
      const nextConversation: MareConversation = existing
        ? { ...existing, messages: nextMessages, updatedAt: new Date().toISOString(), title: existing.messages.length ? existing.title : content.slice(0, 48) }
         : {
             id: targetId || newConversationId(),
             title: content.slice(0, 48),
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString(),
             messages: [userMessage],
             ...(projectId ? { projectId } : {}),
           };
      conversationId = nextConversation.id;
      conversationTitle = nextConversation.title;
      const conversations = existing
        ? current.conversations.map((item) => (item.id === existing.id ? nextConversation : item))
        : [...current.conversations, nextConversation];
      return { ...current, conversations, activeId: nextConversation.id, updatedAt: new Date().toISOString() };
    });

    const history = [
      ...(targetConversation?.messages || []).map(historyEntry),
      historyEntry({ role: 'user' as const, content, attachments: documents.length ? documents : undefined }),
    ];

    // Notas do projeto entram como contexto, não como mensagem visível.
    const chatProjectId = projectId && isMareUuid(projectId) ? projectId : undefined;
    let notes: string[] = [];
    if (chatProjectId) {
      const cached = chatProjectId === activeProjectId ? projectNotes : [];
      try {
        notes = (cached.length ? cached : await listNotes(chatProjectId)).map((note) => note.content);
      } catch {
        notes = [];
      }
    }

    try {
      await streamMareChat(
        {
          messages: history,
          skill: skillId,
          settings,
          model: settings.model,
          effort: settings.effort,
          source: 'mare-workspace',
          conversationId,
          projectId: chatProjectId,
          conversationTitle,
          notes,
        },
        {
          onStatus: (label) => {
            setStatusText(label);
          },
          onThought: (thought) => {
            setThoughts((current) => [...current.slice(-11), thought]);
          },
          onDelta: (chunk) => {
            if (!abortRef.current) {
              setStreamText((current) => current + chunk);
            }
          },
          onSources: (found) => {
            setSources(found);
          },
          onTool: (call) => {
            setToolCalls((current) => {
            const index = current.findIndex((item) => item.id === call.id);
            if (index < 0) return [...current, call];
              const next = current.slice();
              next[index] = call;
              return next;
            });
          },
          onError: (message) => {
            setError(message);
            sounds.playErrorSound();
          },
          onMessage: (message) => {
            if (abortRef.current) return;
            setState((current) => ({
              ...current,
              conversations: current.conversations.map((item) =>
                item.id === conversationId
                  ? { ...item, messages: [...item.messages, message], updatedAt: new Date().toISOString() }
                  : item
              ),
              activeId: conversationId,
              updatedAt: new Date().toISOString(),
            }));
            setCelebrate((current) => current + 1);
            if (isMareCompliment(text)) sounds.playComplimentSound();
            else sounds.playCompletionSound();
          },
          onDone: () => undefined,
        },
        { signal: chatAbortRef.current?.signal }
      );
    } catch (cause) {
      // Parada voluntária não é erro: silêncio na interface.
      if (abortRef.current || abortReason(cause)) {
        chatAbortRef.current = null;
      } else {
        const message = cause instanceof Error ? cause.message : 'Não consegui responder agora.';
        setError(message);
        sounds.playErrorSound();
        setState((current) => ({
          ...current,
          conversations: current.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  messages: [
                    ...item.messages,
                    { id: uid('error'), role: 'assistant' as const, content: `A Mare tropeçou: ${message}`, createdAt: new Date().toISOString() },
                  ],
                }
            : item
        ),
      }));
      }
    } finally {
      setIsSending(false);
      setStatusText('');
      setStreamStartedAt(null);
    }
  }, [activeConversation, activeProjectId, attachments, isSending, projectNotes, settings, sounds, state.activeId, state.conversations]);

  const handleSubmit = useCallback((value: string, picked: SlashCommand | null) => {
    const skill = picked
      ? MARE_SKILLS.find((item) => item.command === picked.id)?.id
      : undefined;
    send(value, skill, conversationProjectId);
  }, [conversationProjectId, send]);

  const handleStarter = useCallback((starter: Starter) => {
    // O atalho escolhe a skill: ela vira chip no compositor, nunca texto
    // "/pesquisar" dentro do campo (o chip já carrega nome e o botão de fechar).
    const picked = commands.find((item) => item.id === starter.id) ?? null;
    if (picked) {
      setCommand(picked);
      setInput('');
      return;
    }
    setCommand(null);
    setInput(starter.prompt);
  }, [commands]);

  const { startRunningSound, stopRunningSound } = sounds;

  // Cascos correndo na terra durante toda a geração, parando ao fim.
  useEffect(() => {
    if (isSending) startRunningSound();
    else stopRunningSound();
  }, [isSending, startRunningSound, stopRunningSound]);

  const handleNew = useCallback(() => {
    const conversation: MareConversation = {
      id: newConversationId(),
      title: 'Nova conversa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setState((current) => ({ ...current, conversations: [conversation, ...current.conversations], activeId: conversation.id, updatedAt: new Date().toISOString() }));
    setView('chat');
    setInput('');
    setCommand(null);
    setAttachments([]);
    filesRef.current.clear();
    setError('');
  }, []);

  /** Uma conversa por projeto: cards e notas não se misturam ao chat geral. */
  const openProjectConversation = useCallback((projectId: string, projectName: string) => {
    const existing = state.conversations.find((item) => item.projectId === projectId);
    if (existing) {
      setState((current) => ({ ...current, activeId: existing.id, updatedAt: new Date().toISOString() }));
      setView('chat');
      return existing.id;
    }
    const now = new Date().toISOString();
    const conversation: MareConversation = {
      id: newConversationId(),
      title: `Quadro · ${projectName}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      projectId,
    };
    setState((current) => ({
      ...current,
      conversations: [conversation, ...current.conversations],
      activeId: conversation.id,
      updatedAt: now,
    }));
    setView('chat');
    return conversation.id;
  }, [state.conversations]);

  /** Cards selecionados do kanban → a Mare desmonta a tarefa em passos. */
  const handleSendTaskToMare = useCallback(
    (tasks: MareTask[]) => {
      if (!tasks.length) return;
      const projectId = tasks[0].projectId;
      const projectName = activeProject?.name || 'projeto';
      const list = tasks
        .map((task) => `- ${task.title}${task.details ? ` — ${task.details}` : ''}`)
        .join('\n');
      const text = `Monte uma lista de passos para concluir ${tasks.length === 1 ? 'este card' : `estes ${tasks.length} cards`} do quadro "${projectName}":\n${list}`;
      const conversationId = openProjectConversation(projectId, projectName);
      void send(text, 'planejar', projectId, conversationId);
    },
    [activeProject, openProjectConversation, send]
  );

  const handleSelect = useCallback((id: string) => {
    setState((current) => ({ ...current, activeId: id }));
    setView('chat');
    setError('');
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Gaveta da sidebar: Escape fecha, como qualquer painel sobreposto.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);
  useEffect(() => {
    if (!signOutOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSignOutOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signOutOpen]);

  const handleSignOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      // Fecha a gravação pendente ANTES de derrubar a sessão: depois do
      // signOut o PUT chega sem token e o último estado fica só no navegador.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (hydrated && remoteReady && !remoteFailed && clientId) {
          await fetch('/api/mare/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Mare-Client-Id': clientId },
            body: JSON.stringify({ state }),
          }).catch(() => undefined);
        }
      }
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      try {
        // Privacidade em máquina compartilhada: o próximo login no mesmo
        // navegador não herda conversas nem anexos da conta anterior.
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('agentmare-client-id');
      } catch {
        // Sem localStorage, nada a limpar.
      }
      // Recarrega para o login: cookies limpos pelo signOut.
      window.location.assign('/login');
    }
  }, [clientId, hydrated, remoteReady, remoteFailed, state]);

  const handleRename = useCallback((id: string, title: string) => {
    setState((current) => ({ ...current, conversations: current.conversations.map((item) => item.id === id ? { ...item, title } : item) }));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setState((current) => {
      const conversations = current.conversations.filter((item) => item.id !== id);
      return { ...current, conversations, activeId: current.activeId === id ? conversations[0]?.id || '' : current.activeId };
    });
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    // Corta o SSE de verdade: o servidor derruba as chamadas aos provedores.
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsSending(false);
    setStatusText('');
  }, []);

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((item) =>
        item.id === current.activeId ? { ...item, messages: item.messages.filter((message) => message.role !== 'assistant' || message.id !== item.messages[item.messages.length - 1]?.id) } : item
      ),
    }));
    void send(lastUser.content, lastUser.skill);
  }, [messages, send]);

  const handleShare = useCallback(() => {
    const transcript = messages.map((message) => `${message.role === 'user' ? 'Você' : 'Mare'}: ${message.content}`).join('\n\n');
    void navigator.clipboard?.writeText(transcript).catch(() => undefined);
  }, [messages]);

  const contextTokens = useMemo(() => {
    const last = [...messages].reverse().find((message) => message.tokens)?.tokens;
    if (last) return last;
    if (!messages.length) return null;
    const chars = messages.reduce(
      (sum, message) =>
        sum + message.content.length + (message.attachments?.reduce((total, doc) => total + doc.text.length, 0) || 0),
      0
    );
    const total = Math.ceil(chars / 4);
    return { input: total, output: 0, total, estimated: true };
  }, [messages]);

  const imageCall = toolCalls.find((call) => call.name === 'generate_image');
  const imagePrompt = typeof imageCall?.input?.prompt === 'string' ? imageCall.input.prompt : '';

  const shownWords = streamText.trim() ? streamText.trim().split(/\s+/).length : 0;
  const seconds = streamStartedAt ? Math.max(1, Math.round((Date.now() - streamStartedAt) / 1000)) : undefined;

  if (!hydrated) {
    return (
      <main className="mare-ws-shell mare-ws-loading">
        <MareBackground />
        <div className="mare-ws-loader">
          <div className="mare-ws-loader-dither" aria-hidden="true">
            <DitherField
              pattern="waves"
              color={['#dce9ff', '#7fa8ea', '#0553af']}
              dotSize={2}
              intensity={0.5}
              speed={0.7}
              fps={24}
              interactive={false}
              className="h-full w-full"
            />
          </div>
          <AnimatedPetSprite
            sheet="chat"
            row={MARE_CHAT_ROWS.run.row}
            frames={MARE_CHAT_ROWS.run.frames}
            fps={MARE_CHAT_ROWS.run.fps}
            height={120}
            label="Mare correndo"
          />
          <p>Abrindo a porteira...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mare-ws-shell">
      <MareBackground />

      {sidebarOpen ? (
        <button
          type="button"
          className="mare-ws-scrim"
          aria-label="Fechar conversas e projetos"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        id="mare-ws-sidebar"
        className={`mare-ws-sidebar${sidebarOpen ? ' is-open' : ''}`}
        aria-label="Conversas, projetos e preferências"
      >
        <div className="mare-ws-brand">
          <button
            type="button"
            className="mare-ws-sidebar-close"
            onClick={closeSidebar}
            aria-label="Fechar conversas e projetos"
          >
            <Menu size={17} />
          </button>
          <MareAvatar size={42} />
          <div>
            <strong>Mare</strong>
          </div>
        </div>

        <div className="mare-ws-projects">
          <MareProjectsSection
            projects={projects}
            activeId={view === 'board' ? activeProjectId : null}
            disabled={!isSupabaseConfigured() || (sessionChecked && !sessionUser)}
            onCreate={(name) => {
              closeSidebar();
              return handleCreateProject(name);
            }}
            onSelect={(id) => {
              closeSidebar();
              handleSelectProject(id);
            }}
            onDelete={handleDeleteProject}
          />
        </div>

        <ThreadList
          threads={threads}
          activeId={state.activeId || null}
          onSelect={(id) => {
            closeSidebar();
            handleSelect(id);
          }}
          onNew={() => {
            closeSidebar();
            handleNew();
          }}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <MarePet
          active={isSending}
          celebrateKey={celebrate}
          paused={!settings.animations}
          onFeed={(kind) => (kind === 'eat' ? sounds.playEatSound() : sounds.playDrinkSound())}
          onRear={() => sounds.playCompletionSound()}
        />

        <div className="mare-ws-sidebar-foot">
          <button type="button" onClick={() => { closeSidebar(); setSettingsOpen((current) => !current); }} aria-expanded={settingsOpen}>
            <Settings2 size={15} /> Preferências
          </button>
          {sessionUser ? (
            <>
              <span className="mare-ws-account" title={`${sessionUser.name} · ${sessionUser.email}`}>
                {sessionUser.avatar ? <img src={sessionUser.avatar} alt="" /> : <User size={14} />}
                <span>{sessionUser.email || sessionUser.name}</span>
              </span>
              <button type="button" onClick={() => setSignOutOpen(true)} aria-label="Sair da conta" title="Sair">
                <LogOut size={15} />
              </button>
            </>
          ) : null}
          <Link href="/" title="Voltar à apresentação" aria-label="Voltar à apresentação">
            <Home size={15} />
          </Link>
        </div>
      </aside>

      <section className="mare-ws-main">
        <header className="mare-ws-header">
          <div className="mare-ws-header-id">
            <button
              type="button"
              className="mare-ws-menu"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-expanded={sidebarOpen}
              aria-controls="mare-ws-sidebar"
              aria-label="Abrir conversas e projetos"
            >
              <Menu size={17} />
            </button>
            <MareAvatar size={36} />
            <div>
              <h1>
                {view === 'board' && activeProject
                  ? `Quadro · ${activeProject.name}`
                  : activeConversation?.title || 'Nova conversa'}
              </h1>
            </div>
          </div>
          {activeProject ? (
            <div className="mare-ws-view-switch" role="tablist" aria-label="Conversa ou quadro do projeto">
              <button
                type="button"
                role="tab"
                aria-current={view === 'chat' ? 'true' : undefined}
                aria-selected={view === 'chat'}
                onClick={() => openProjectConversation(activeProject.id, activeProject.name)}
              >
                Conversa
              </button>
              <button
                type="button"
                role="tab"
                aria-current={view === 'board' ? 'true' : undefined}
                aria-selected={view === 'board'}
                onClick={() => setView('board')}
              >
                Quadro
              </button>
            </div>
          ) : null}
          {contextTokens ? (
            <span
              className="mare-ws-context"
              title={`Contexto da conversa: ${contextTokens.total.toLocaleString('pt-BR')} tokens${contextTokens.estimated ? ' (estimado)' : ''} · entrada ${contextTokens.input.toLocaleString('pt-BR')} + saída ${contextTokens.output.toLocaleString('pt-BR')}`}
            >
              <Binary size={13} strokeWidth={2} aria-hidden="true" />
              {contextTokens.estimated ? '≈ ' : ''}
              {new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(contextTokens.total)}
              <span className="mare-ws-context-label">tokens</span>
            </span>
          ) : null}
        </header>

        {view === 'board' && activeProject ? (
          <MareKanban
            project={activeProject}
            notes={projectNotes}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onSendToMare={handleSendTaskToMare}
          />
        ) : (
        <>
        <div className="mare-ws-thread">
          <div className="mare-ws-thread-main">
          {messages.length === 0 && !isSending ? (
            <div className="mare-ws-empty">
            <EmptyStateGreeting
              greeting="Bom dia. Vamos trabalhar?"
              place={`${MARE_SKILLS.length} skills, ${MARE_TOOLS.length} ferramentas, pronta para o dia a dia.`}
              lead="Escolha um ponto de partida ou diga o que precisa. A Mare junta as ferramentas certas e conduz o trabalho com maestria."
              starters={starters}
              onPick={handleStarter}
            />
            </div>
          ) : (
            <Conversation className="h-full" threshold={48}>
              <div className="mare-ws-messages">
                {messages.map((message, index) => {
                  const imageUrl = message.role === 'assistant' ? generatedImageUrl(message.content) : undefined;
                  const imageCallOfMessage = message.toolCalls?.find((call) => call.name === 'generate_image');
                  const imagePromptOfMessage =
                    typeof imageCallOfMessage?.input?.prompt === 'string' ? imageCallOfMessage.input.prompt : '';
                  const imageReady = Boolean(imageUrl && loadedImages[message.id]);
                  return (
                  <div className="mare-ws-message" key={message.id}>
                    <MessageBubble
                      role={message.role}
                      meta={new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      actions={
                        <MessageActions
                          text={message.content}
                          onRegenerate={
                            message.role === 'assistant' && index === messages.length - 1 && !isSending
                              ? handleRegenerate
                              : undefined
                          }
                          onShare={
                            message.role === 'assistant' && index === messages.length - 1 && !isSending
                              ? handleShare
                              : undefined
                          }
                        />
                      }
                    >
                      <div className="mare-ws-bubble-head">
                        {message.role === 'assistant' ? <MareAvatar size={20} /> : <User size={14} />}
                        <span>{message.role === 'assistant' ? (message.skill ? `skill: ${message.skill}` : 'Mare') : 'Você'}</span>
                      </div>
                      {message.attachments?.length ? (
                        <div className="mare-ws-sent-files">
                          {message.attachments.map((doc, docIndex) => (
                            <span key={`${doc.name}-${docIndex}`} title={`${doc.name} · ${doc.size}`}>
                              <FileText className="size-3" />
                              {doc.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {message.role === 'assistant' ? (
                        <CollapsibleText limit={640}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} components={markdownComponents}>
                            {imageUrl && !imageReady ? withoutGeneratedImage(message.content) : message.content}
                          </ReactMarkdown>
                        </CollapsibleText>
                      ) : (
                        <div className="mare-ws-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} components={markdownComponents}>{message.content}</ReactMarkdown>
                        </div>
                      )}
                      {imageUrl && !imageReady ? (
                        <MareImageGenerating
                          prompt={imagePromptOfMessage}
                          src={imageUrl}
                          onReady={() => setLoadedImages((previous) => ({ ...previous, [message.id]: true }))}
                        />
                      ) : null}
                      {imageUrl && imageReady ? <MareImageNote /> : null}
                      {message.toolCalls?.length ? (
                        <div className="mare-ws-tools">
                          {message.toolCalls.filter((call) => call.name !== 'generate_image').map((call) => (
                            <ToolCallCard
                              key={call.id}
                              name={call.name}
                              server={call.server}
                              summary={call.summary}
                              status={call.status}
                              input={call.input}
                              output={call.output}
                              duration={call.duration}
                              icon={call.name === 'web_search' ? Search : call.name === 'read_page' ? BookOpen : Sparkles}
                            />
                          ))}
                        </div>
                      ) : null}
                      {message.sources?.length ? (
                        <SourcesStack sources={message.sources.map(sourceToStackSource)} open={sourcesOpen} onOpenChange={setSourcesOpen} />
                      ) : null}
                    </MessageBubble>
                  </div>
                  );
                })}

                {isSending ? (
                  <div className="mare-ws-message">
                    <MessageBubble role="assistant">
                      {thoughts.length ? (
                        <Reasoning
                          text={thoughts.join('\n')}
                          streaming
                          seconds={seconds}
                          autoCollapse={false}
                        />
                      ) : (
                        <TextShimmer>{statusText || 'Marchando ao objetivo'}</TextShimmer>
                      )}
                      {imageCall && imageCall.status !== 'error' ? (
                        <MareImageGenerating prompt={imagePrompt} />
                      ) : null}
                      {streamText ? (
                        <div className="mare-ws-markdown">
                          <StreamingText text={streamText} shown={shownWords} done={false} />
                        </div>
                      ) : null}
                      {toolCalls.length ? (
                        <div className="mare-ws-tools">
                          {toolCalls.filter((call) => call.name !== 'generate_image').map((call) => (
                            <ToolCallCard
                              key={call.id}
                              name={call.name}
                              server={call.server}
                              summary={call.summary}
                              status={call.status}
                              input={call.input}
                              output={call.output}
                              icon={call.name === 'web_search' ? Search : BookOpen}
                            />
                          ))}
                        </div>
                      ) : null}
                    </MessageBubble>
                  </div>
                ) : null}
              </div>
            </Conversation>
          )}
          </div>
        </div>

        <div className="mare-ws-composer-wrap">
          {error ? <p className="mare-ws-error" role="alert">{error}</p> : null}
          <MareComposer
            commands={commands}
            value={input}
            onChange={setInput}
            command={command}
            onCommandChange={setCommand}
            onSubmit={handleSubmit}
            onStop={handleStop}
            streaming={isSending}
            model={
              <EffortPicker
                models={modelOptions}
                model={settings.model}
                onModelChange={(id) => updateSettings({ model: id })}
                effort={settings.effort as EffortLevel}
                onEffortChange={(effort) => updateSettings({ effort: effort as MareSettings['effort'] })}
                fast={settings.fast}
                onFastChange={(fast) => updateSettings({ fast })}
              />
            }
            placeholder="Peça algo, use / para skills ou anexe um documento"
            attachments={attachments}
            onFiles={handleFiles}
            onRemoveAttachment={handleRemoveAttachment}
            onRetryAttachment={handleRetryAttachment}
            actions={
              <ComposerToolsMenu
                tools={toolToggles}
                enabled={settings.enabledTools}
                onToggle={(id) => {
                  const tool = id as MareSettings['enabledTools'][number];
                  updateSettings({
                    enabledTools: settings.enabledTools.includes(tool)
                      ? settings.enabledTools.filter((item) => item !== tool)
                      : [...settings.enabledTools, tool],
                  });
                }}
                open={toolsOpen}
                onOpenChange={setToolsOpen}
              />
            }
          />
        </div>
        </>
        )}
      </section>

      {settingsOpen ? (
        <aside className="mare-ws-settings" aria-label="Preferências da Mare">
          <div className="mare-ws-settings-head">
            <h2>Preferências</h2>
            <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Fechar preferências">×</button>
          </div>

          <h3>Skills</h3>
          <ul className="mare-ws-chip-list">
            {MARE_SKILLS.map((skill) => (
              <li key={skill.id} title={skill.hint}>/{skill.command}</li>
            ))}
          </ul>

          <h3>Ferramentas</h3>
          <ul className="mare-ws-chip-list">
            {MARE_TOOLS.map((tool) => (
              <li key={tool.id} className={settings.enabledTools.includes(tool.id) ? 'is-on' : ''}>{tool.label}</li>
            ))}
          </ul>

          <h3>Modelo</h3>
          <p className="mare-ws-settings-note">
            {modelOptions.find((option) => option.id === settings.model)?.name || settings.model}
          </p>

          <h3>Volume</h3>
          <VolumeRow
            label="Ambiente"
            value={settings.ambientVolume}
            onChange={(ambientVolume) => updateSettings({ ambientVolume, ambient: ambientVolume > 0 })}
          />
          <VolumeRow
            label="Efeitos"
            value={settings.effectsVolume}
            onChange={(effectsVolume) => updateSettings({ effectsVolume, effects: effectsVolume > 0 })}
          />
          <VolumeRow
            label="Voz da Mare"
            value={settings.voiceVolume}
            onChange={(voiceVolume) => updateSettings({ voiceVolume, voice: voiceVolume > 0 })}
          />
          <button type="button" className="mare-ws-settings-test" onClick={() => sounds.playRandomSound()}>
            Testar som da Mare
          </button>

          <h3>Interface</h3>
          <label><input type="checkbox" checked={settings.animations} onChange={(event) => updateSettings({ animations: event.target.checked })} /> Animações</label>
          <label><input type="checkbox" checked={settings.webSearch} onChange={(event) => updateSettings({ webSearch: event.target.checked })} /> Pesquisa na web</label>

          <h3>Playground</h3>
          <button type="button" className="mare-ws-settings-playground" onClick={() => setPlaygroundOpen(true)}>
            Abrir playground
            <span>Monte com a Mare e saia pelo campo</span>
          </button>
        </aside>
      ) : null}

      {playgroundOpen ? <MarePlayground onClose={() => setPlaygroundOpen(false)} /> : null}

      {signOutOpen ? (
        <div className="mare-ws-modal-scrim" onClick={() => setSignOutOpen(false)}>
          <div
            className="mare-ws-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mare-signout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="mare-signout-title">Sair da conta?</h2>
            <p>Seu histórico fica salvo na conta e volta quando você entrar de novo.</p>
            <div className="mare-ws-modal-actions">
              <button type="button" autoFocus onClick={() => setSignOutOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  setSignOutOpen(false);
                  void handleSignOut();
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
