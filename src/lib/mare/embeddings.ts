/**
 * Embedding determinístico e local: hashing de unigramas e bigramas com sinal.
 * Sem chave de API nem dependência nova. Não entende paráfrases — o limiar
 * alto do cache (0.95) existe justamente para só aceitar perguntas quase iguais.
 */
const DIM = 256;

function tokens(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]{2,}/g) || [];
}

function hash(value: string) {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function embed(text: string): number[] {
  const vector = new Array<number>(DIM).fill(0);
  const words = tokens(text);
  const features = [...words];
  for (let index = 0; index < words.length - 1; index += 1) {
    features.push(`${words[index]}_${words[index + 1]}`);
  }
  for (const feature of features) {
    const value = hash(feature);
    vector[value % DIM] += (value >>> 16) & 1 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => value / norm);
}

/** Formato que o pgvector aceita na chamada RPC. */
export function pgVector(values: number[]) {
  return `[${values.map((value) => value.toFixed(6)).join(',')}]`;
}
