/** Formatos que a Mare consegue ler e mandar como contexto para o modelo. */
export type AttachmentKind = 'pdf' | 'doc' | 'sheet' | 'slides' | 'text';

export const ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md';

export const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
/** Quanto texto de um documento entra na conversa. */
const MAX_CHARS = 7000;

const EXTENSIONS: Record<string, AttachmentKind> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  txt: 'text',
  md: 'text',
};

export class AttachmentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AttachmentError';
  }
}

export function kindFor(name: string): AttachmentKind | null {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXTENSIONS[ext] || null;
}

function clean(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    // pdf-parse fecha cada página com "-- 1 of 3 --".
    .replace(/^-- \d+ of \d+ --$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readPdf(buffer: Buffer) {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { text: clean(result.text || ''), pages: result.pages?.length };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function readDocx(buffer: Buffer) {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ buffer });
  return { text: clean(result.value || '') };
}

async function readSheet(buffer: Buffer) {
  const XLSX = await import('xlsx');
  const book = XLSX.read(buffer, { type: 'buffer' });
  const parts = book.SheetNames.map((name) => {
    const sheet = book.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    return csv ? `Planilha "${name}":\n${csv}` : '';
  }).filter(Boolean);
  return { text: clean(parts.join('\n\n')) };
}

async function readSlides(buffer: Buffer) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1]) - Number(b.match(/(\d+)\.xml$/)?.[1]));
  const parts: string[] = [];
  for (const [index, path] of slides.entries()) {
    const xml = await zip.files[path].async('string');
    const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((match) => match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"))
      .join(' ')
      .trim();
    if (texts) parts.push(`Slide ${index + 1}: ${texts}`);
  }
  return { text: clean(parts.join('\n\n')) };
}

/** Extrai texto puro do arquivo anexado. Formatos legados são recusados com clareza. */
export async function extractAttachment(file: File) {
  const kind = kindFor(file.name);
  if (!kind) {
    throw new AttachmentError('Formato não suportado. Use PDF, DOCX, XLSX, CSV, PPTX ou texto.', 415);
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw new AttachmentError('Arquivo acima de 8 MB. Envie uma versão menor.', 413);
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'doc' || ext === 'ppt') {
    throw new AttachmentError(`O formato .${ext} é antigo demais para ler. Salve como .${ext}x e anexe de novo.`, 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';
  let pages: number | undefined;

  if (kind === 'pdf') {
    ({ text, pages } = await readPdf(buffer));
  } else if (ext === 'docx') {
    ({ text } = await readDocx(buffer));
  } else if (kind === 'sheet') {
    ({ text } = await readSheet(buffer));
  } else if (ext === 'pptx') {
    ({ text } = await readSlides(buffer));
  } else {
    text = clean(buffer.toString('utf8'));
  }

  if (!text) {
    throw new AttachmentError('Não achei texto nesse arquivo. Se for digitalizado, envie o PDF com texto selecionável.', 422);
  }

  const truncated = text.length > MAX_CHARS;
  return {
    kind,
    pages,
    chars: text.length,
    truncated,
    text: truncated
      ? `${text.slice(0, MAX_CHARS)}\n\n[documento truncado em ${MAX_CHARS} caracteres de ${text.length}]`
      : text,
  };
}
