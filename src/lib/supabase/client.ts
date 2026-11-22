import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';

/**
 * Client para componentes 'use client'. createBrowserClient já é singleton:
 * chamar várias vezes reusa a instância.
 */
export function createClient() {
  const config = supabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
  return createBrowserClient(config.url, config.key);
}
