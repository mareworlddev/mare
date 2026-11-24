import {
  MARE_DOCUMENT_GUIDE,
  MARE_NIMBLE_MODEL,
  MARE_NIMBLE_WRITER,
  MARE_PERSONALITY,
  MARE_RISK_CLOSING,
  MARE_STATUS,
} from './constants';
import type { MareChatMessage, MareToolDefinition } from './api';
import { firecrawlScrape, firecrawlSearch } from './firecrawl';
import { providerChat, providerChatStream, providerForModel } from './llm';
import { mareLog, mareTimer, mareWarn, previewText } from './log';
import { buildConversationMessages, buildDirectSystemPrompt, inferSkill } from './prompts';
import type {
  MareChatBody,
  MareEffort,
  MareMessage,
  MareSkillId,
  MareSource,
  MareToolCall,
  MareStreamEvent,
} from './types';
import {
  buildNimbleSystemPrompt,
  collectEvidence,
  generateSkillImage,
  planWithOrchestrator,
  type NimbleEvidence,
} from '../../../mare-nimble/runtime/executor';
import { attachEvidence, clipHistory } from '../../../mare-nimble/runtime/memory';
import { routeSkills } from '../../../mare-nimble/runtime/skill-router';
import { validateAnswer } from '../../../mare-nimble/runtime/validator';

type Emit = (event: MareStreamEvent) => void;

type AgentResult = { message: MareMessage };

type Collector = {
  sources: MareSource[];
  toolCalls: MareToolCall[];
  emit: Emit;
  trackTool: (call: MareToolCall) => void;
  trackSources: (sources: MareSource[]) => void;
};

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const IMAGE_NOUN = /\b(imagem|foto|arte|ilustra\w*|desenho|capa|banner|avatar|logo)\b/i;
/** Pedido sobre imagem existente: gerar seria errado. */
const IMAGE_ANALYSIS = /\b(analis\w*|descrev\w*|resum\w*|explic\w*|o que (é|tem|aparece|está|são))\b/i;

function imageIntent(text: string, skill?: MareSkillId) {
  if (skill === 'imagem') return true;
  return IMAGE_NOUN.test(text) && !IMAGE_ANALYSIS.test(text);
}

/** Uso real de tokens; algumas rotas não devolvem `usage`. */
function tokenUsage(usage?: Record<string, unknown>) {
  if (!usage) return undefined;
  const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
  const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
  const total = Number(usage.total_tokens ?? input + output);
  if (!input && !output && !total) return undefined;
  return { input, output, total };
}

/** Estimativa para quando a API não informa o consumo (≈ 4 caracteres por token). */
function estimateTokens(messages: Array<{ content: string }>, content: string) {
  const input = Math.ceil(messages.reduce((sum, message) => sum + message.content.length, 0) / 4);
  const output = Math.ceil(content.length / 4);
  return { input, output, total: input + output, estimated: true };
}

function cleanedUserText(body: MareChatBody) {
  const last = [...body.messages].reverse().find((message) => message.role === 'user');
  return String(last?.content || '')
    .replace(/^\s*\/([\w-]+)\s*/, '')
    .trim();
}

function statusForSkill(skill: MareSkillId) {
  if (skill === 'pesquisar') return pick(MARE_STATUS.search);
  if (skill === 'conversar') return pick(MARE_STATUS.boot);
  return pick(MARE_STATUS.work);
}

function effortProfile(effort?: MareEffort) {
  const deep = effort === 'High' || effort === 'Extra high' || effort === 'Ultra';
  return {
    temperature: effort === 'Minimal' ? 0.35 : 0.62,
    maxTokens: deep ? 3600 : 2400,
  };
}

function collector(emit: Emit): Collector {
  const sources: MareSource[] = [];
  const toolCalls: MareToolCall[] = [];
  return {
    sources,
    toolCalls,
    emit,
    trackTool(call) {
      const index = toolCalls.findIndex((item) => item.id === call.id);
      if (index >= 0) toolCalls[index] = call;
      else toolCalls.push(call);
      emit({ type: 'tool', call });
    },
    trackSources(list) {
      sources.length = 0;
      sources.push(...list);
      emit({ type: 'sources', sources });
    },
  };
}

/** Modelo escolhido direto na interface: uma chamada, com pesquisa quando faz sentido. */
async function runDirect(
  body: MareChatBody,
  keep: Collector,
  skill: MareSkillId,
  text: string,
  signal?: AbortSignal
): Promise<{ content: string; reasoning: string; skills: string[]; usage?: Record<string, unknown> }> {
  const enabled = body.settings?.enabledTools || [];
  const wantsWeb = body.settings?.webSearch !== false;
  const research =
    wantsWeb &&
    enabled.includes('web_search') &&
    (skill === 'pesquisar' || /\b(sobre|como|por que|porque|quando|onde|recente|atual)\b/i.test(text));

  if (research) {
    const startedAt = Date.now();
    const call: MareToolCall = {
      id: `tool-${startedAt}`,
      name: 'web_search',
      server: 'nimble',
      summary: previewText(text, 80),
      input: { query: text.slice(0, 300), limit: 6 },
      status: 'running',
    };
    keep.trackTool(call);
    const found = await firecrawlSearch(text, 6, signal);
    keep.trackTool({
      ...call,
      status: found.length ? 'done' : 'error',
      output: found.length ? `${found.length} fonte(s)` : 'Nenhuma fonte encontrada',
      duration: (Date.now() - startedAt) / 1000,
    });
    if (found.length) keep.trackSources(found);
  }

  const url = wantsWeb ? text.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[),.;]+$/, '') : undefined;
  if (url && enabled.includes('read_page')) {
    const page = await firecrawlScrape(url, signal);
    if (page) {
      keep.trackSources([
        { title: page.title, url, snippet: previewText(page.text, 220), domain: new URL(url).hostname.replace(/^www\./, '') },
        ...keep.sources,
      ]);
    }
  }

  // Pedido de imagem no caminho direto é tool calling de verdade: o modelo anuncia
  // a ferramenta, o agente executa e o resultado volta como mensagem `tool`.
  const wantsImage = imageIntent(text, skill);
  const system =
    buildDirectSystemPrompt({
      skill,
      sources: keep.sources,
      webSearch: wantsWeb,
      hasDocuments: /\[Documento anexado:/i.test(text),
      projectNotes: body.notes,
      question: text,
    }) + (wantsImage ? IMAGE_TOOL_HINT : '');
  const messages: MareChatMessage[] = buildConversationMessages(
    body.messages.map((message) => ({ ...message, content: message.content.replace(/^\s*\/([\w-]+)\s*/, '').trim() })),
    system
  );
  const model = body.model || 'openai/gpt-oss-20b';
  const chatOptions = {
    provider: providerForModel(model),
    model,
    ...effortProfile(body.effort),
    reasoningEffort: (/gpt-oss/i.test(model) ? 'low' : undefined) as 'low' | undefined,
    timeoutMs: 120_000,
    signal,
  };

  // Primeira rodada em silêncio: tool_call não é resposta, nada de streamar aqui.
  const result = await providerChatStream({
    ...chatOptions,
    messages,
    tools: wantsImage ? [IMAGE_TOOL] : undefined,
  });

  let content = result.content.trim();
  let imageUrl: string | null = null;
  let reasoning = result.reasoning || '';
  let usage = result.usage;

  const imageCall = result.toolCalls.find((call) => call.function?.name === 'generate_image');
  if (imageCall) {
    let prompt = text;
    try {
      const parsed = JSON.parse(imageCall.function.arguments || '{}') as { prompt?: unknown };
      if (typeof parsed?.prompt === 'string' && parsed.prompt.trim()) prompt = parsed.prompt.trim().slice(0, 400);
    } catch {
      // Argumentos invalidos: gera com o pedido original do usuario.
    }

    imageUrl = await generateSkillImage(prompt, { onTool: keep.trackTool });
    const final = await providerChatStream(
      {
        ...chatOptions,
        messages: [
          ...messages,
          { role: 'assistant', content: content || null, tool_calls: [imageCall] },
          {
            role: 'tool',
            tool_call_id: imageCall.id,
            name: 'generate_image',
            content: imageUrl
              ? `IMAGEM GERADA: ${imageUrl}. Apresente-a com ![descrição curta](${imageUrl}) e comente em uma frase.`
              : 'A geração de imagem falhou. Diga que não conseguiu gerar agora e ofereça uma alternativa em texto.',
          },
        ],
      },
      { onDelta: (chunk) => body.stream !== false && keep.emit({ type: 'delta', text: chunk }) }
    );

    content = final.content.trim();
    reasoning = final.reasoning || reasoning;
    usage = final.usage || usage;

    // A imagem gerada não pode sumir se o escritor renunciar de novo.
    if (imageUrl && !content.includes(imageUrl)) {
      content = `${stripImageRefusal(content) || 'Aqui está a imagem que você pediu.'}\n\n![imagem](${imageUrl})`;
    }
  } else if (wantsImage) {
    // O modelo ignorou a ferramenta: executamos por conta própria, como antes.
    imageUrl = await generateSkillImage(text, { onTool: keep.trackTool });
    if (imageUrl && !content.includes(imageUrl)) {
      content = `${stripImageRefusal(content) || 'Aqui está a imagem que você pediu.'}\n\n![imagem](${imageUrl})`;
    }
  }

  return { content, reasoning, skills: [], usage };
}

/** Ferramenta de imagem exposta ao modelo no caminho direto. */
const IMAGE_TOOL: MareToolDefinition = {
  type: 'function',
  function: {
    name: 'generate_image',
    description:
      'Gera uma imagem a partir de uma descrição em texto. Use para qualquer pedido de desenho, foto, arte, capa, banner, avatar ou ilustração.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descrição detalhada da imagem a gerar.' },
      },
      required: ['prompt'],
    },
  },
};

/** Prompt da ferramenta, quando o pedido é de imagem. */
const IMAGE_TOOL_HINT = `

FERRAMENTA DISPONÍVEL: generate_image(prompt) — gera uma imagem e devolve a URL.
O pedido é de imagem: chame generate_image ANTES de escrever qualquer texto.
Depois do resultado da ferramenta, apresente a imagem pronta com o markdown indicado e um comentário curto.`;

/** Linhas em que a Mare diz que não gera imagens — a imagem já foi gerada, então saem. */
function stripImageRefusal(content: string) {
  return content
    .replace(/[^\n]*(não (consigo|posso|é possível)[^\n]*imagem[^\n]*)/gi, '')
    .trim();
}

/** `mare-nimble`: roteia skills, coleta evidência, orquestra, escreve e valida. */
async function runNimble(
  body: MareChatBody,
  keep: Collector,
  text: string,
  signal?: AbortSignal
): Promise<{ content: string; reasoning: string; skills: string[]; usage?: Record<string, unknown> }> {
  const { emit } = keep;
  const enabled = body.settings?.enabledTools || [];
  const skills = routeSkills(text, body.skill, body.skillHints);
  if (!skills.length) throw new Error('Skills do mare-nimble indisponíveis.');

  const ids = skills.map((skill) => skill.id);
  emit({ type: 'status', text: pick(MARE_STATUS.think), state: 'walk' });
  emit({ type: 'thought', text: `Skills: ${ids.join(', ')}.` });

  const needsResearch = ids.some((id) => id === 'deep-research' || id === 'fact-checker');
  const tools = Array.from(new Set(skills.flatMap((skill) => skill.tools))).filter(
    (tool) => tool === 'web_search' || tool === 'read_page'
  );

  const evidence: NimbleEvidence = needsResearch
    ? await collectEvidence({
        text,
        tools,
        enabledTools: enabled,
        events: { onTool: keep.trackTool, onSources: keep.trackSources },
        signal,
      })
    : { sources: [], pages: [], toolCalls: [] };

  emit({
    type: 'status',
    text: evidence.sources.length ? `${evidence.sources.length} fontes no campo` : 'Planejando a resposta',
    state: 'walk',
  });

  const plan = await planWithOrchestrator({ text, skills, evidence, signal });
  if (plan) emit({ type: 'thought', text: previewText(plan, 180) });

  const imageUrl =
    ids.includes('image-prompt-engineer') && imageIntent(text, body.skill)
      ? await generateSkillImage(text, { onTool: keep.trackTool })
      : null;

  const messages = [
    {
      role: 'system' as const,
      content: buildNimbleSystemPrompt({
        skills,
        plan,
        evidence,
        imageUrl,
        hasDocuments: /\[Documento anexado:/i.test(text),
        projectNotes: body.notes,
        question: text,
      }),
    },
    ...attachEvidence(clipHistory(body.messages), evidence),
  ];
  const profile = effortProfile(body.effort);

  emit({ type: 'status', text: pick(MARE_STATUS.work), state: 'walk' });
  const result = await providerChatStream(
    {
      provider: MARE_NIMBLE_WRITER.provider,
      model: MARE_NIMBLE_WRITER.model,
      messages,
      ...profile,
      reasoningEffort: 'low',
      timeoutMs: 120_000,
      signal,
    },
    { onDelta: (chunk) => body.stream !== false && emit({ type: 'delta', text: chunk }) }
  );

  let content = result.content.trim();
  if (!content) {
    // O escritor às vezes devolve só tool_call. Segunda passada, sem instruções de ferramenta.
    keep.emit({ type: 'thought', text: 'Reescrevendo sem chamadas de ferramenta.' });
    const fallback = await providerChat({
      provider: MARE_NIMBLE_WRITER.provider,
      model: MARE_NIMBLE_WRITER.model,
      messages: [
        {
          role: 'system',
          content: [
            MARE_PERSONALITY,
            'Escreva a resposta final em português brasileiro usando apenas o material fornecido. Não chame ferramentas.',
            /\[Documento anexado:/i.test(text) ? MARE_DOCUMENT_GUIDE : '',
            MARE_RISK_CLOSING,
          ].filter(Boolean).join('\n\n'),
        },
        ...attachEvidence(clipHistory(body.messages), evidence),
      ],
      temperature: 0.4,
      maxTokens: profile.maxTokens,
      reasoningEffort: 'low',
      timeoutMs: 120_000,
      signal,
    });
    content = fallback.content.trim();
  }

  // A imagem já existe: se o escritor esqueceu, entra de qualquer forma.
  if (imageUrl && !content.includes(imageUrl)) {
    content = `${stripImageRefusal(content) || 'Aqui está a imagem que você pediu.'}\n\n![imagem](${imageUrl})`;
  }

  const check = validateAnswer({
    answer: content,
    requiresSources: needsResearch,
    sourceCount: keep.sources.length,
    codeExpected: ids.includes('coding-engineer'),
  });

  if (!check.ok) {
    emit({ type: 'thought', text: `Corrigindo: ${check.issues.join('; ')}.` });
    try {
      const fixed = await providerChat({
        provider: MARE_NIMBLE_WRITER.provider,
        model: MARE_NIMBLE_WRITER.model,
        messages: [
          ...messages,
          { role: 'assistant', content },
          {
            role: 'user',
            content: `Ajuste a resposta anterior resolvendo: ${check.issues.join('; ')}. Entregue a versão final completa.`,
          },
        ],
        temperature: 0.3,
        maxTokens: profile.maxTokens,
        timeoutMs: 120_000,
        signal,
      });
      if (fixed.content.trim()) content = fixed.content.trim();
    } catch (error) {
      mareWarn('nimble', 'autocorreção falhou', error instanceof Error ? error.message : error);
    }
  }

  return { content, reasoning: result.reasoning || '', skills: ids, usage: result.usage };
}

export async function runMareAgent(body: MareChatBody, emit: Emit, signal?: AbortSignal): Promise<AgentResult> {
  const startedAt = Date.now();
  const timer = mareTimer('agente', 'rodada');
  const text = cleanedUserText(body);
  const skill = body.skill || inferSkill(text);
  const model = body.model || MARE_NIMBLE_MODEL;
  const keep = collector(emit);

  // Cliente já se foi: nem começa (cada etapa abaixo também observa o sinal).
  if (signal?.aborted) throw new Error('Requisição cancelada pelo cliente.');

  emit({ type: 'status', text: statusForSkill(skill), state: 'walk' });
  emit({ type: 'thought', text: `Skill ${skill}: ${statusForSkill(skill).toLowerCase()}.` });

  const answer =
    model === MARE_NIMBLE_MODEL
      ? await runNimble(body, keep, text, signal)
      : await runDirect(body, keep, skill, text, signal);

  if (!answer.content.trim()) throw new Error('A Mare não conseguiu formular uma resposta.');

  // Uso real quando o provedor informa; senão, estimativa de 4 caracteres por token.
  const tokens = tokenUsage(answer.usage) || estimateTokens(body.messages, answer.content);

  const message: MareMessage = {
    id: `mare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content: answer.content,
    createdAt: new Date().toISOString(),
    tokens,
    skill,
    reasoning: answer.reasoning || undefined,
    sources: keep.sources,
    toolCalls: keep.toolCalls,
  };

  emit({ type: 'status', text: pick(MARE_STATUS.done), state: 'idle' });
  emit({ type: 'message', message });
  timer.done(
    `${model} · ${answer.content.length} caracteres · ${keep.sources.length} fonte(s) · ${Date.now() - startedAt}ms`,
    { toolCalls: keep.toolCalls.map((call) => call.name) }
  );
  mareLog(
    'agente',
    `rodada concluída · modelo=${model} · skills=${answer.skills.join(',') || '-'} · fontes=${keep.sources.length}`
  );
  return { message };
}
