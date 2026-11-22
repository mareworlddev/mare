import { NextResponse } from 'next/server';
import { isMareAiModelId } from '@/constants/aiModels';
import { guardAiRoute, jsonError } from '@/lib/supabase/api';
import { isMareUuid, mirrorConversation, type MirrorMessage } from '@/lib/mare/mirror';
import { runMareAgent } from '@/lib/mare/agent';
import { mareLog, mareWarn } from '@/lib/mare/log';
import type { MareChatBody, MareChatHistoryInput, MareEffort, MareSkillId, MareStreamEvent, MareToolId } from '@/lib/mare/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SKILLS: MareSkillId[] = ['conversar', 'pesquisar', 'resumir', 'planejar', 'escrever', 'revisar', 'traduzir', 'ideias', 'imagem', 'codigo'];
const TOOLS: MareToolId[] = ['web_search', 'read_page'];
const EFFORTS: MareEffort[] = ['Minimal', 'Low', 'Medium', 'High', 'Extra high', 'Ultra'];

/** Teto total do histórico enviado ao modelo, em caracteres (custo controlado). */
const MAX_TOTAL_CHARS = 500_000;
/** Teto do corpo HTTP bruto (o JSON pode embutir documentos anexados). */
const MAX_BODY_BYTES = 2_000_000;

function sse(event: MareStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function validMirrorId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(value) ? value : undefined;
}

function normalizeBody(value: any): MareChatBody {
  const messages: MareChatHistoryInput[] = Array.isArray(value?.messages)
    ? value.messages
        .filter((message: any) => message && typeof message.content === 'string' && (message.role === 'user' || message.role === 'assistant'))
        .slice(-12)
        .map((message: any) => {
          const id = validMirrorId(message.id);
          return {
            ...(id ? { id } : {}),
            role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: String(message.content).slice(0, 24_000),
          };
        })
    : [];

  const settings = value?.settings && typeof value.settings === 'object' ? value.settings : {};
  const enabledTools = Array.isArray(settings.enabledTools)
    ? settings.enabledTools.filter((tool: unknown): tool is MareToolId => TOOLS.includes(tool as MareToolId))
    : TOOLS;

  return {
    messages,
    skill: SKILLS.includes(value?.skill) ? value.skill : undefined,
    tool: TOOLS.includes(value?.tool) ? value.tool : undefined,
    settings: {
      webSearch: settings.webSearch !== false,
      enabledTools,
      ...(typeof settings.voice === 'boolean' ? { voice: settings.voice } : {}),
      ...(typeof settings.effects === 'boolean' ? { effects: settings.effects } : {}),
    },
    model: typeof value?.model === 'string' && isMareAiModelId(value.model) ? value.model : undefined,
    effort: EFFORTS.includes(value?.effort) ? value.effort : undefined,
    source: typeof value?.source === 'string' ? value.source.slice(0, 40) : undefined,
    stream: value?.stream !== false,
    conversationId: isMareUuid(value?.conversationId) ? value.conversationId : undefined,
    projectId: isMareUuid(value?.projectId) ? value.projectId : undefined,
    conversationTitle:
      typeof value?.conversationTitle === 'string' && value.conversationTitle.trim()
        ? value.conversationTitle.trim().slice(0, 200)
        : undefined,
  };
}

export async function POST(request: Request) {
  // Sessão validada no servidor (getUser) + rate limit por user.id antes de
  // falar com qualquer provedor. Nunca confie só no cookie do navegador.
  const guard = await guardAiRoute();
  if (guard.mode === 'blocked') return guard.response;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, 'Histórico grande demais para enviar de uma vez.');
  }

  let body: MareChatBody;
  try {
    body = normalizeBody(await request.json());
  } catch {
    return NextResponse.json({ error: 'Não consegui ler a mensagem.' }, { status: 400 });
  }

  if (!body.messages.length) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  const totalChars = body.messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return jsonError(413, 'A conversa passou do teto de contexto. Comece uma nova conversa.');
  }

  mareLog('rota', `POST · skill=${body.skill || 'auto'} · mensagens=${body.messages.length}`);

  /**
   * Espelho durável da rodada em chats/messages, com o client autenticado
   * (RLS decide). Best-effort — conversa continua funcionando sem Supabase.
   */
  const mirrorContext =
    guard.mode === 'authenticated' && body.conversationId
      ? {
          supabase: guard.supabase,
          conversationId: body.conversationId,
          projectId: body.projectId || null,
          title: body.conversationTitle || body.messages[0]?.content || 'Nova conversa',
          history: body.messages as MirrorMessage[],
        }
      : null;

  const mirrorRound = (assistant: MirrorMessage | null) => {
    if (!mirrorContext) return;
    const ids = new Set(mirrorContext.history.map((message) => message.id));
    const assistantRow =
      assistant && !ids.has(assistant.id)
        ? [assistant]
        : [];
    void mirrorConversation(mirrorContext.supabase, {
      conversationId: mirrorContext.conversationId,
      projectId: mirrorContext.projectId,
      title: mirrorContext.title,
      messages: [...mirrorContext.history, ...assistantRow],
    });
  };

  if (body.stream === false) {
    try {
      const { message } = await runMareAgent(body, () => undefined);
      mirrorRound({ id: message.id, role: 'assistant', content: message.content });
      return NextResponse.json({ message, text: message.content, sources: message.sources });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Falha ao consultar a Mare.' },
        { status: 500 }
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: MareStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse(event)));
        } catch {
          closed = true;
        }
      };
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': mare\n\n'));
        } catch {
          closed = true;
        }
      }, 15_000);

      (async () => {
        try {
          const { message } = await runMareAgent(body, send);
          mirrorRound({ id: message.id, role: 'assistant', content: message.content });
        } catch (error) {
          mareWarn('rota', 'SSE falhou', error instanceof Error ? error.message : error);
          send({ type: 'error', error: error instanceof Error ? error.message : 'A Mare tropeçou no caminho. Tente novamente.' });
        } finally {
          send({ type: 'done' });
          closed = true;
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // Stream já foi fechado pelo cliente.
          }
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
