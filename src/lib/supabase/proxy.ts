import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDeployed, supabaseConfig } from './config';

/**
 * Sessão no Next 16 (arquivo proxy.ts): renova o token a cada navegação,
 * grava os cookies no request (server components leem a sessão fresca) e no
 * response (o navegador acompanha), e protege /mare exigindo login.
 *
 * getClaims() verifica a assinatura do JWT — cookie forjado não passa como
 * sessão. Nunca use getSession() para autorizar no servidor.
 *
 * Desdobramento: rodando na máquina do desenvolvedor (fora da Vercel), o
 * login é opcional — a Mare funciona no modo legado sem Sessão.
 */
export async function updateSession(request: NextRequest) {
  const config = supabaseConfig();
  const { pathname } = request.nextUrl;
  const local = !isDeployed();

  if (!config) {
    // Na Vercel sem Supabase configurado, /mare vai para o login (fail-closed).
    if (!local && pathname.startsWith('/mare')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=not_configured';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims(): o refresh pode
  // ser perdido e o usuário desloga sem motivo aparente.
  let claims: Record<string, unknown> | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = (data?.claims as Record<string, unknown> | null) ?? null;
  } catch {
    claims = null; // sem rede/Supabase fora do ar: segue como visitante
  }

  if (claims && (pathname === '/login' || pathname.startsWith('/login/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/mare';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!claims && pathname.startsWith('/mare') && !local) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/mare' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
