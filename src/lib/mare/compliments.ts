/** Elogios dirigidos à Mare: texto sem acentos, caixa baixa. */
const COMPLIMENT_PATTERN =
  /\b(?:adorei|amei|excelente|sensacional|espetacular|fantastico|fantastica|maravilhoso|maravilhosa|perfeito|perfeita|parabens|arrasou|show|top|incrivel|otimo|otima|genia|inteligente|linda|fofa|muito bom|muito boa|mandou bem|mandou muito bem|boa mare|melhor agente|melhor assistente|melhor ia|voce e demais|voce e a melhor|voce e otima|voce e otimo|voce e incrivel|voce e maravilhosa|voce e perfeita|voce e genial|amei voce|amei a mare|obrigado|obrigada)\b/;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const isMareCompliment = (text?: string) =>
  Boolean(text && COMPLIMENT_PATTERN.test(normalize(text)));
