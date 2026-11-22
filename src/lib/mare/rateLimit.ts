import type { SupabaseClient } from '@supabase/supabase-js';

/** Teto de chamadas de IA por usuário — documento do lado TS; a fonte da
 * verdade é a RPC (0002_security.sql), que não aceita parâmetros: ninguém
 * infla o próprio limite chamando direto. Mensagem e Retry-After usam estes
 * valores para ficar coerente com o banco. */
export const AI_RATE_LIMIT = { max: 30, windowSeconds: 300 } as const;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: 'limited'; retryAfterSeconds: number }
  | { ok: false; reason: 'enforcer-missing' };

/**
 * Rate limit por usuário via RPC no Supabase (check_rate_limit): contador
 * monotônico guardado no banco — serverless sem estado, limite por user.id e
 * não por IP. O RPC é security definer, com EXECUTE only para authenticated e
 * limites fixos dentro da própria função; auth.uid() prende a linha — um
 * cliente que chamar direto só mexe no contador de si mesmo.
 */
export async function enforceAiRateLimit(supabase: SupabaseClient): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('check_rate_limit');
  if (error) {
    // PGRST42883/PGRST202 (função ausente/assinatura velha): 0002 pendente.
    return { ok: false, reason: 'enforcer-missing' };
  }
  if (data === false) {
    return { ok: false, reason: 'limited', retryAfterSeconds: AI_RATE_LIMIT.windowSeconds };
  }
  return { ok: true };
}
