import { mareWarn } from '@/lib/mare/log';
import { pollinationsImageUrl } from '@/lib/pollinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Busca a imagem na Pollinations com a chave do servidor e devolve só os bytes.
 * A URL pública da conversa fica sem `POLLI_KEY`, o que ela nunca deve expor.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompt = (url.searchParams.get('p') || '').slice(0, 400).trim();
  if (!prompt) {
    return new Response('Prompt ausente.', { status: 400 });
  }

  const width = Number(url.searchParams.get('w')) || 1024;
  const height = Number(url.searchParams.get('h')) || 1024;

  try {
    const upstream = await fetch(pollinationsImageUrl(prompt, { width, height }), { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Pollinations respondeu ${upstream.status}`);
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    mareWarn('imagem', 'falha ao gerar imagem', error instanceof Error ? error.message : error);
    return new Response('Não consegui gerar a imagem agora.', { status: 502 });
  }
}
