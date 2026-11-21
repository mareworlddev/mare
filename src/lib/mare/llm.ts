import {
  fetchWithTimeout,
  sleep,
  stringifyError,
  type MareChatMessage,
  type MareCompletionResult,
  type MareToolCall,
  type MareToolDefinition,
} from './api';
import { mareLog, mareTimer, mareWarn, previewText } from './log';
import { contentFromDelta, mergeToolCallDelta, readSseData, reasoningFromDelta } from './stream';

/** Provedores de chat compatíveis com a API OpenAI. */
export type MareProviderId = 'pollinations' | 'cerebras';

export interface MareChatOptions {
  provider: MareProviderId;
  model: string;
  messages: MareChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Modelos de raciocínio gastam o teto de tokens pensando se o esforço for alto. */
  reasoningEffort?: 'low' | 'medium' | 'high';
  tools?: MareToolDefinition[];
  toolChoice?: 'auto' | 'none';
}

export interface MareChatHandlers {
  onDelta?: (chunk: string, full: string) => void;
  onReasoning?: (chunk: string, full: string) => void;
}

type ProviderConfig = {
  label: string;
  missing: string;
  key: () => string;
  url: () => string;
};

const PROVIDERS: Record<MareProviderId, ProviderConfig> = {
  pollinations: {
    label: 'Pollinations',
    missing: 'POLLI_KEY',
    key: () => process.env.POLLI_KEY || '',
    url: () => `https://gen.pollinations.ai/v1/chat/completions?key=${encodeURIComponent(PROVIDERS.pollinations.key())}`,
  },
  cerebras: {
    label: 'Cerebras',
    missing: 'CEREBRAS_API_KEY',
    key: () => process.env.CEREBRAS_API_KEY || '',
    url: () => 'https://api.cerebras.ai/v1/chat/completions',
  },
};

/** Modelo escolhido na interface -> provedor. `mare-nimble` é resolvido no agente. */
export const MARE_MODEL_ROUTES: Record<string, MareProviderId> = {
  'openai/gpt-5-nano': 'pollinations',
  'openai/gpt-oss-20b': 'pollinations',
};

export function providerForModel(model: string): MareProviderId {
  return MARE_MODEL_ROUTES[model] || 'pollinations';
}

function endpoint(provider: MareProviderId) {
  const config = PROVIDERS[provider];
  if (!config.key()) throw new Error(`Configuração ausente: ${config.missing}.`);
  return { config, url: config.url() };
}

function buildBody(options: MareChatOptions, stream: boolean) {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxTokens ?? 1600,
  };
  if (stream) body.stream = true;
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;
  // Sem ferramentas definidas, a Pollinations ainda injeta as dela e o modelo
  // devolve tool_calls em vez de texto. Explicitamente vazio desliga isso.
  body.tools = options.tools?.length ? options.tools : [];
  body.tool_choice = options.tools?.length ? options.toolChoice || 'auto' : 'none';
  return body;
}

async function request(options: MareChatOptions, stream: boolean) {
  const { config, url } = endpoint(options.provider);
  const body = buildBody(options, stream);
  const timer = mareTimer('provedor', `${options.provider} ${options.model}${stream ? ' stream' : ''}`);
  mareLog('provedor', `${config.label} · ${options.model} · mensagens=${options.messages.length}`);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.key()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        options.timeoutMs ?? 150_000
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`${config.label} ${response.status}: ${text.slice(0, 300) || 'falha na requisição'}`);
        mareWarn('provedor', `${config.label} HTTP ${response.status} · tentativa ${attempt + 1}`, previewText(text, 220));
        if ((response.status === 429 || response.status >= 500) && attempt === 0) {
          await sleep(1100);
          continue;
        }
        throw lastError;
      }

      timer.mark(`${config.label} respondeu`);
      return { response, timer, config, model: options.model };
    } catch (error) {
      lastError = error;
      if (attempt === 0 && /fetch|aborted|network|ECONN|ETIMEDOUT/i.test(stringifyError(error))) {
        await sleep(900);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(stringifyError(lastError));
}

function parseMessage(raw: any): MareChatMessage {
  return {
    role: 'assistant',
    content: typeof raw?.content === 'string' ? raw.content : '',
    tool_calls: Array.isArray(raw?.tool_calls) ? (raw.tool_calls as MareToolCall[]) : undefined,
    reasoning: typeof raw?.reasoning === 'string' ? raw.reasoning : undefined,
  };
}

export async function providerChat(options: MareChatOptions): Promise<MareCompletionResult> {
  const { response, timer, model } = await request(options, false);
  const data = await response.json();
  const choice = data?.choices?.[0];
  const message = parseMessage(choice?.message);
  const result: MareCompletionResult = {
    content: message.content || '',
    toolCalls: message.tool_calls || [],
    message,
    finishReason: String(choice?.finish_reason || 'stop'),
    usage: data?.usage,
    model,
    reasoning: message.reasoning,
  };
  timer.done(`ok · finish=${result.finishReason} · ${result.content.length} caracteres`, {
    toolCalls: result.toolCalls.map((call) => call.function?.name).filter(Boolean),
  });
  return result;
}

export async function providerChatStream(
  options: MareChatOptions,
  handlers: MareChatHandlers = {}
): Promise<MareCompletionResult> {
  const { response, timer, config, model } = await request(options, true);

  let content = '';
  let reasoning = '';
  let finishReason = 'stop';
  let usage: Record<string, unknown> | undefined;
  const toolCalls: any[] = [];
  let chunks = 0;

  await readSseData(response, (payload) => {
    const choice = payload?.choices?.[0];
    const delta = choice?.delta || {};
    chunks += 1;

    const reasoningChunk = reasoningFromDelta(delta);
    if (reasoningChunk) {
      reasoning += reasoningChunk;
      handlers.onReasoning?.(reasoningChunk, reasoning);
    }

    const contentChunk = contentFromDelta(delta);
    if (contentChunk) {
      content += contentChunk;
      handlers.onDelta?.(contentChunk, content);
    }

    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length) {
      mergeToolCallDelta(toolCalls, delta.tool_calls);
    }

    if (choice?.finish_reason) finishReason = String(choice.finish_reason);
    if (payload?.usage && typeof payload.usage === 'object') usage = payload.usage as Record<string, unknown>;
  });

  timer.done(
    `stream concluído · ${chunks} chunks · ${content.length} caracteres · raciocínio ${reasoning.length}`,
    { provider: config.label, finish: finishReason, toolCalls: toolCalls.map((call: any) => call?.function?.name).filter(Boolean) }
  );

  return {
    content,
    toolCalls: toolCalls as MareToolCall[],
    message: {
      role: 'assistant',
      content,
      tool_calls: toolCalls.length ? (toolCalls as MareToolCall[]) : undefined,
      reasoning: reasoning || undefined,
    },
    finishReason,
    usage,
    model,
    reasoning: reasoning || undefined,
  };
}
