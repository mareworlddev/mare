import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';

/**
 * Client para server components e route handlers: uma instância nova por
 * requisição (leva os cookies de quem chamou). No proxy use updateSession().
 */
export async function createClient() {
  const config = supabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll a partir de server component não pode gravar cookie; ignorado
          // porque o proxy centraliza o refresh da sessão em toda navegação.
        }
      },
    },
  });
}
