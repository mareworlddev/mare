export const MARE_IMAGE_MODEL = 'microsoft/mai-image-2.7-flash';

export function getPollinationsKey() {
  return process.env.POLLI_KEY || '';
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
