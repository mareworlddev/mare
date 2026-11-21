import { DEFAULT_MARE_AI_MODEL, isMareAiModelId, type MareAiModelId } from '@/constants/aiModels';

export type TextChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const MARE_IMAGE_MODEL = 'microsoft/mai-image-2.7-flash';

export function getPollinationsKey() {
  return process.env.POLLI_KEY || '';
}

export function normalizeMareAiModel(value: unknown): MareAiModelId {
  const model = String(value || '');
  return isMareAiModelId(model) ? model : DEFAULT_MARE_AI_MODEL;
}

/** URL pública de uma imagem gerada pelo modelo de imagem da Pollinations. */
export function pollinationsImageUrl(prompt: string, options: { width?: number; height?: number } = {}) {
  const key = getPollinationsKey();
  if (!key) throw new Error('Configuração ausente: POLLI_KEY.');
  const width = options.width ?? 1024;
  const height = options.height ?? 1024;
  const query = new URLSearchParams({
    model: MARE_IMAGE_MODEL,
    width: String(width),
    height: String(height),
    key,
    nologo: 'true',
  });
  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 400))}?${query}`;
}
