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

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
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
