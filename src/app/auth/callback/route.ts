import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Base dos redirects: a URL configurada da aplicação quando existir (na Vercel
 * o Host é fixo, mas atrás de proxy mal configurado um Host forjado na
 * request enganaria `request.url`).
 */
function baseOrigin(fallback: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return url.origin;
      }
    } catch {
      // URL torta no .env: cai no origin da própria request.
    }
  }
  return fallback;
}

/**
 * Retorno do OAuth do Google (fluxo PKCE): troca o código pela sessão e deixa
 * os cookies HttpOnly atualizados via adapter do @supabase/ssr. Erros do
 * provedor/cancelamentos voltam para /login com o motivo na URL.
 */
export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = baseOrigin(requestOrigin);

  const errorName = searchParams.get('error');
  if (errorName) {
    // 'access_denied' = usuário cancelou na janela do Google.
    const reason = errorName === 'access_denied' ? 'oauth_canceled' : 'oauth_failed';
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Destino interno: só os dois caminhos válidos, nunca uma URL externa (anti open-redirect).
  const next = searchParams.get('next') === '/' ? '/' : '/mare';

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(`${origin}${next}`);
  } catch {
    // Código já usado, PKCE divergente, provedor fora do ar...
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
