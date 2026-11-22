import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/supabase/api';
import { AttachmentError, extractAttachment } from '@/lib/mare/extract';
import { hitMemLimit } from '@/lib/mare/memLimit';
import {mareLog, mareWarn } from '@/lib/mare/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Teto antes de bufferizar o corpo — o extra fica no extractor (8 MB). */
const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;

const ATTACH_LIMIT = { max: 60, windowMs: 300_000 } as const;

/** Recebe um documento, extrai o texto e devolve pronto para entrar na conversa. */
export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (guard.mode === 'blocked') return guard.response;

  // Chunked sem Content-Length não entra: exigimos o tamanho declarado ANTES
  // de bufferizar qualquer byte, e conferimos de novo no File recebido.
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (!contentLength) {
    return NextResponse.json({ error: 'Envie o arquivo com tamanho declarado.' }, { status: 411 });
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Arquivo acima do teto de 8 MB.' }, { status: 413 });
  }

  if (guard.mode === 'authenticated' && hitMemLimit(guard.user.id, ATTACH_LIMIT)) {
    return NextResponse.json({ error: 'Muitos documentos de uma vez. Respire um pouco e tente de novo.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Não consegui receber o arquivo.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Arquivo acima do teto de 8 MB.' }, { status: 413 });
  }

  try {
    const extracted = await extractAttachment(file);
    mareLog('anexo', `${file.name} · ${extracted.kind} · ${extracted.chars} caracteres`);
    return NextResponse.json({
      name: file.name,
      size: file.size,
      kind: extracted.kind,
      pages: extracted.pages,
      chars: extracted.chars,
      truncated: extracted.truncated,
      text: extracted.text,
    });
  } catch (error) {
    if (error instanceof AttachmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    mareWarn('anexo', 'falha ao ler arquivo', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Não consegui ler esse documento.' }, { status: 500 });
  }
}
