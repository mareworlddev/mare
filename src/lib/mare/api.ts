export type MareChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MareToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MareChatMessage {
  role: MareChatRole;
  content: string | null;
  tool_calls?: MareToolCall[];
  tool_call_id?: string;
  name?: string;
  /** Raciocínio retornado por modelos como o GPT-OSS (não é reenviado à API). */
  reasoning?: string;
}

export interface MareToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface MareCompletionResult {
  content: string;
  toolCalls: MareToolCall[];
  message: MareChatMessage;
  finishReason: string;
  usage?: Record<string, unknown>;
  model: string;
  reasoning?: string;
}

export function stringifyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro desconhecido';
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 120_000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
