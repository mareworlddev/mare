import { mareLog, mareWarn } from './log';
import type { MareChatBody, MareSource, MareSpriteState, MareStreamEvent } from './types';

export interface StreamHandlers {
  onStatus?: (text: string, state?: MareSpriteState) => void;
  onThought?: (text: string) => void;
  onDelta?: (text: string) => void;
  onSources?: (sources: MareSource[]) => void;
  onTool?: (call: Extract<MareStreamEvent, { type: 'tool' }>['call']) => void;
  onMessage?: (message: Extract<MareStreamEvent, { type: 'message' }>['message']) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

/** Envia a mensagem e consome o stream SSE da Mare. */
export async function streamMareChat(body: MareChatBody, handlers: StreamHandlers = {}) {
  mareLog('cliente', `enviando · skill=${body.skill || 'auto'} · mensagens=${body.messages.length}`);

  const response = await fetch('/api/mare/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Falha ao conversar com a Mare (${response.status}).`);
  }
  if (!response.body) throw new Error('O navegador não suportou o stream da Mare.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const line = block.split('\n').find((entry) => entry.startsWith('data: '));
      if (!line) continue;
      let event: MareStreamEvent;
      try {
        event = JSON.parse(line.slice(6)) as MareStreamEvent;
      } catch (error) {
        mareWarn('cliente', 'evento inválido', String(error));
        continue;
      }

      switch (event.type) {
        case 'status':
          handlers.onStatus?.(event.text, event.state);
          break;
        case 'thought':
          handlers.onThought?.(event.text);
          break;
        case 'delta':
          handlers.onDelta?.(event.text);
          break;
        case 'sources':
          handlers.onSources?.(event.sources);
          break;
        case 'tool':
          handlers.onTool?.(event.call);
          break;
        case 'message':
          handlers.onMessage?.(event.message);
          break;
        case 'error':
          handlers.onError?.(event.error);
          break;
        case 'done':
          handlers.onDone?.();
          break;
      }
    }
  }
}
