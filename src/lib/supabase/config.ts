/**
 * Única fonte da configuração do Supabase.
 *
 * A chave pública (publishable key) pode ir ao navegador: ela é inofensiva por
 * design — quem autoriza de verdade é a RLS no banco, avaliada com o token do
 * usuário autenticado. Nenhuma chave privilegiada (service/secret) é usada.
 */

export interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * Leitura estática, obrigatória para o cliente: o Next só injeta uma variável
 * `NEXT_PUBLIC_*` no bundle quando ela aparece escrita por extenso
 * (`process.env.NEXT_PUBLIC_X`). Um acesso dinâmico (`process.env[nome]`) vira
 * `{}` no navegador — o Supabase "sumia" no browser mesmo com as chaves certas.
 */
const ENV = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

function readEnv(...names: Array<keyof typeof ENV>): string {
  for (const name of names) {
    const value = ENV[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!/^https:\/\/.+/.test(url) || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Origem canônica do site (NEXT_PUBLIC_SITE_URL), sem barra final. Vazio quando
 * não configurada.
 */
export function canonicalOrigin(): string {
  const value = readEnv('NEXT_PUBLIC_SITE_URL');
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.origin;
    }
  } catch {
    // URL torta no env: trata como ausente.
  }
  return '';
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/**
 * Para onde o Google devolve o código do OAuth. Fora da máquina local usamos a
 * origem canônica, nunca o host que está na barra de endereço: sem isso, quem
 * entra por uma URL de deploy (mare-…-…vercel.app) fica logado naquele host em
 * vez do domínio do site.
 */
export function authCallbackUrl(currentOrigin: string): string {
  let isLocal = false;
  try {
    isLocal = LOCAL_HOST.test(new URL(currentOrigin).hostname);
  } catch {
    isLocal = true; // origem estranha: não redireciona para fora
  }
  const base = isLocal ? currentOrigin : canonicalOrigin() || currentOrigin;
  return `${base.replace(/\/$/, '')}/auth/callback`;
}

/**
 * Rodando na Vercel (produção ou preview). Sem Supabase configurado nesses
 * ambientes, as rotas de IA e de estado caem em modo fail-closed: é melhor
 * devolver 503 do que abrir um proxy de IA sem sessão.
 */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Ambiente servido ao público (Vercel OU qualquer build de produção
 * self-hosted). É frontier deles que o login é obrigatório e as rotas
 * falham fechado; só o desenvolvimento na máquina local dispensa login.
 */
export function isDeployed(): boolean {
  return isVercel() || process.env.NODE_ENV === 'production';
}
