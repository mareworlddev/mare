import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Arquivo estático (tem extensão): public/mare/** compartilha o prefixo da
 * página protegida /mare, então sem esta guarda o redirect de login engoliria
 * sprites, sons e o playground (307 para /login em vez do PNG).
 */
const STATIC_FILE = /\.[a-z0-9]+$/i;

/**
 * Next 16: o proxy substitui o middleware.ts. Renova a sessão do Supabase e
 * protege /mare. Rotas de API se protegem com getUser() por conta própria.
 */
export async function proxy(request: NextRequest) {
  if (STATIC_FILE.test(request.nextUrl.pathname)) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ['/mare/:path*', '/login/:path*'],
};
