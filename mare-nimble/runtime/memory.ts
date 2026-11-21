import type { MareChatMessage } from '../../src/lib/mare/api';
import type { NimbleEvidence } from './executor';

/** Histórico recente, já cortado, no formato que os provedores esperam. */
export function clipHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  max = 12
): MareChatMessage[] {
  return messages.slice(-max).map((message) => ({
    role: message.role,
    content: String(message.content).slice(0, 12000),
  }));
}

/** Anexa as evidências coletadas na última mensagem do usuário. */
export function attachEvidence(messages: MareChatMessage[], evidence: NimbleEvidence): MareChatMessage[] {
  const last = [...messages].reverse().find((message) => message.role === 'user');
  if (!last) return messages;

  const blocks = [
    evidence.sources.length
      ? `FONTES:\n${evidence.sources
          .map((source, index) => `${index + 1}. ${source.title} — ${source.url}\n${source.snippet || ''}`)
          .join('\n')}`
      : '',
    evidence.pages.length
      ? `TRECHOS:\n${evidence.pages.map((page) => `${page.url}\n${page.text.slice(0, 4000)}`).join('\n\n')}`
      : '',
  ].filter(Boolean);

  if (!blocks.length) return messages;

  return messages.map((message) =>
    message === last ? { ...message, content: `${message.content}\n\nMATERIAL COLETADO:\n${blocks.join('\n\n')}` } : message
  );
}
