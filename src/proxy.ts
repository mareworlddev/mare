import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next 16: o proxy substitui o middleware.ts. Renova a sessão do Supabase e
 * protege /mare. Rotas de API se protegem com getUser() por conta própria.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/mare/:path*', '/login/:path*'],
};
