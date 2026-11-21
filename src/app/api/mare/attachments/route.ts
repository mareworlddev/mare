import { NextResponse } from 'next/server';
import { AttachmentError, extractAttachment } from '@/lib/mare/extract';
import { mareLog, mareWarn } from '@/lib/mare/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Recebe um documento, extrai o texto e devolve pronto para entrar na conversa. */
export async function POST(request: Request) {
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
