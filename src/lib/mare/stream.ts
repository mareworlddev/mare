/** Utilitários de streaming SSE (OpenAI-compatible) usados pelos provedores de chat. */

export interface ParsedStreamDelta {
  content: string;
  reasoning: string;
  toolCalls: any[];
  finishReason: string;
  usage?: Record<string, unknown>;
}

/**
 * Lê um corpo SSE e entrega cada `data:` já convertido em objeto.
 * Ignora comentários/heartbeats e o marcador final `[DONE]`.
 */
export async function readSseData(
  response: Response,
  onData: (payload: any) => void
): Promise<void> {
  if (!response.body) throw new Error('O provedor abriu um stream vazio.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consume = (chunk: string) => {
    const data = chunk
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!data || data === '[DONE]') return;
    try {
      onData(JSON.parse(data));
    } catch {
      // Alguns provedores enviam linhas parciais; o buffer externo já resolve.
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      parts.forEach(consume);
    }
    if (buffer.trim()) consume(buffer);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Extrai o texto de raciocínio de um delta.
 * Provedores OpenAI-compatible variam entre `reasoning`, `reasoning_content`
 * e `reasoning_details`; a maioria usa `reasoning`.
 */
export function reasoningFromDelta(delta: any): string {
  if (!delta || typeof delta !== 'object') return '';

  const direct = delta.reasoning_content ?? delta.reasoning ?? delta.thinking;
  if (typeof direct === 'string' && direct) return direct;

  if (Array.isArray(delta.reasoning_details)) {
    return delta.reasoning_details
      .map((detail: any) => {
        if (!detail || typeof detail !== 'object') return '';
        return String(detail.text || detail.summary || detail.content || '');
      })
      .join('');
  }

  return '';
}

/** Normaliza o texto visível de um delta (alguns provedores mandam array). */
export function contentFromDelta(delta: any): string {
  if (!delta || typeof delta !== 'object') return '';
  const content = delta.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        return String(part?.text || part?.content || '');
      })
      .join('');
  }
  return '';
}

/** Acumula tool calls fragmentadas do stream no formato OpenAI. */
export function mergeToolCallDelta(accumulator: any[], deltaCalls: any[]) {
  for (const call of deltaCalls) {
    const index = Number.isInteger(call?.index) ? call.index : accumulator.length;
    const current =
      accumulator[index] ||
      (accumulator[index] = {
        id: '',
        type: 'function',
        function: { name: '', arguments: '' },
      });

    if (call?.id) current.id = String(call.id);
    if (call?.type) current.type = call.type;

    const name = call?.function?.name;
    if (typeof name === 'string' && name) {
      // Alguns provedores repetem o nome completo em cada chunk.
      if (!current.function.name) current.function.name = name;
      else if (current.function.name !== name && !current.function.name.endsWith(name)) {
        current.function.name += name;
      }
    }

    const args = call?.function?.arguments;
    if (typeof args === 'string' && args) current.function.arguments += args;
  }
}
