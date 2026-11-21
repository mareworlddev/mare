import { NextResponse } from 'next/server';
import { isMareAiModelId } from '@/constants/aiModels';
import { runMareAgent } from '@/lib/mare/agent';
import { mareLog, mareWarn } from '@/lib/mare/log';
import type { MareChatBody, MareEffort, MareSkillId, MareStreamEvent, MareToolId } from '@/lib/mare/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SKILLS: MareSkillId[] = ['conversar', 'pesquisar', 'resumir', 'planejar', 'escrever', 'revisar', 'traduzir', 'ideias', 'imagem', 'codigo'];
const TOOLS: MareToolId[] = ['web_search', 'read_page'];
const EFFORTS: MareEffort[] = ['Minimal', 'Low', 'Medium', 'High', 'Extra high', 'Ultra'];

function sse(event: MareStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function normalizeBody(value: any): MareChatBody {
  const messages = Array.isArray(value?.messages)
    ? value.messages
        .filter((message: any) => message && typeof message.content === 'string')
        .slice(-12)
        .map((message: any) => ({
          role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: String(message.content).slice(0, 24000),
        }))
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
  };
}

export async function POST(request: Request) {
  let body: MareChatBody;
  try {
    body = normalizeBody(await request.json());
  } catch {
    return NextResponse.json({ error: 'Não consegui ler a mensagem.' }, { status: 400 });
  }

  if (!body.messages.length) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  mareLog('rota', `POST · skill=${body.skill || 'auto'} · mensagens=${body.messages.length}`);

  if (body.stream === false) {
    try {
      const { message } = await runMareAgent(body, () => undefined);
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
          await runMareAgent(body, send);
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
