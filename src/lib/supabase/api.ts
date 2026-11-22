import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isDeployed, isSupabaseConfigured } from './config';
import { createClient } from './server';
import { enforceAiRateLimit } from '@/lib/mare/rateLimit';

export type ApiGuard =
  | { mode: 'authenticated'; user: User; supabase: SupabaseClient }
  /** Sem Supabase em dev local: comporta como antes, nada de segredo exposto. */
  | { mode: 'dev' }
  | { mode: 'blocked'; response: NextResponse };

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * Porta de autenticação rotas de estado e leitura:
 * - valida a sessão no servidor com getUser() (verifica a assinatura no
 *   servidor do Supabase — getSession() leria o cookie sem revalidar);
 * - sem sessão válida: em produção bloqueia (fail-closed); na máquina do
 *   desenvolvedor o login é opcional e o modo legado segue valendo.
 */
export async function requireApiUser(): Promise<ApiGuard> {
  if (!isSupabaseConfigured()) {
    if (isDeployed()) {
      console.warn('mare:api Supabase ausente — cadastre NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel.');
      return {
        mode: 'blocked',
        response: jsonError(503, 'Serviço temporariamente indisponível. Tente novamente em instantes.'),
      };
    }
    return { mode: 'dev' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      if (isDeployed()) {
        return { mode: 'blocked', response: jsonError(401, 'Entre na sua conta para usar a Mare.') };
      }
      return { mode: 'dev' }; // desenvolvimento local: sem login, sem barreira
    }
    return { mode: 'authenticated', user: data.user, supabase };
  } catch {
    return { mode: 'blocked', response: jsonError(503, 'Não consegui validar a sessão agora.') };
  }
}

/**
 * Porta dos caminhos que geram custo de IA (chat e imagem): a sessão acima +
 * rate limit por user.id no banco. O telefone muda de IP; o user.id não.
 */
export async function guardAiRoute(): Promise<ApiGuard> {
  const guard = await requireApiUser();
  if (guard.mode !== 'authenticated') return guard;

  const limit = await enforceAiRateLimit(guard.supabase);
  if (limit.ok) return guard;

  if (limit.reason === 'limited') {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      mode: 'blocked',
      response: NextResponse.json(
        { error: `Muitas chamadas seguidas. Espera ${minutes} minuto(s) e tenta de novo.` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      ),
    };
  }

  // RPC ausente = migração 0002 pendente.
  if (isDeployed()) {
    console.warn('mare:rate-limit RPC ausente — rode supabase/migrations/0002_security.sql no Supabase.');
    return {
      mode: 'blocked',
      response: jsonError(503, 'Serviço temporariamente indisponível. Tente novamente em instantes.'),
    };
  }
  console.warn('mare:rate-limit RPC ausente — rode supabase/migrations/0002_security.sql (dev segue sem limite persistente).');
  return guard;
}
