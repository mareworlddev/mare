/**
 * Contador em memória por instância (serverless): pega o abuso óbvio de um
 * único usuário contra uma instância quente. O teto persistente e à prova de
 * cold start fica no banco (check_rate_limit); este aqui é a segunda camada.
 */
const buckets = new Map<string, number[]>();

export interface MemLimitOptions {
  max: number;
  windowMs: number;
}

export function hitMemLimit(key: string, options: MemLimitOptions): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((at) => now - at < options.windowMs);
  hits.push(now);
  buckets.set(key, hits);
  // Não deixa o mapa crescer para sempre com chaves de uma janela antiga.
  if (buckets.size > 5_000) {
    for (const [existing, times] of buckets) {
      if (!times.some((at) => now - at < options.windowMs)) buckets.delete(existing);
    }
  }
  return hits.length > options.max;
}
