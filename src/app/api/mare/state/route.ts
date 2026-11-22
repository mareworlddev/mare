import { NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storageClient';
import { requireApiUser, type ApiGuard } from '@/lib/supabase/api';
import { hitMemLimit } from '@/lib/mare/memLimit';

export const dynamic = 'force-dynamic';

/** Sincronia de estado é batida, mas não é infinita: conta por usuário. */
const STATE_LIMIT = { max: 120, windowMs: 300_000 } as const;

/** Legado (dev sem Supabase): id do cliente no header — só local. */
function clientIdFromRequest(request: Request) {
  const raw = request.headers.get('x-mare-client-id') || 'anon';
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

/**
 * O caminho nunca sai do cliente: com sessão, é o user.id validado no
 * servidor, e a política do bucket (0003_storage.sql) só aceita o caminho
 * exato do próprio uid. Header inventado não lê nem sobrescreve o workspace
 * de outra pessoa — nem logado, nem no modo legado.
 */
function statePath(request: Request, guard: Exclude<ApiGuard, { mode: 'blocked' }>) {
  return guard.mode === 'authenticated'
    ? `state/${guard.user.id}.json`
    : `state/anon/${clientIdFromRequest(request)}.json`;
}

function jsonBlob(payload: unknown) {
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

/** O histórico vive no navegador; o storage apenas replica entre dispositivos. */
export async function GET(request: Request) {
  const guard = await requireApiUser();
  if (guard.mode === 'blocked') return guard.response;
  const path = statePath(request, guard);
  try {
    const storage = await getStorageClient();
    const { data, error } = await storage.download(path);
    if (error || !data) return NextResponse.json({ state: null });
    const parsed = JSON.parse(await data.text());
    return NextResponse.json({ state: parsed });
  } catch (error) {
    console.warn('mare:state-read-failed', error);
    return NextResponse.json({ state: null });
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiUser();
  if (guard.mode === 'blocked') return guard.response;

  if (guard.mode === 'authenticated' && hitMemLimit(guard.user.id, STATE_LIMIT)) {
    return NextResponse.json({ error: 'Muitas sincronizações seguidas. Respire um pouco e tente de novo.' }, { status: 429 });
  }

  const path = statePath(request, guard);
  try {
    const body = await request.json();
    const state = body?.state;
    if (!state || typeof state !== 'object') {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const serialized = JSON.stringify(state);
    if (serialized.length > 1_800_000) {
      return NextResponse.json({ error: 'Histórico muito grande.' }, { status: 413 });
    }

    const storage = await getStorageClient();
    const { error } = await storage.upload(path, jsonBlob(state), {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Sem storage configurado o app continua funcional no localStorage.
    console.warn('mare:state-write-skipped', error);
    return NextResponse.json({ ok: true, localOnly: true });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiUser();
  if (guard.mode === 'blocked') return guard.response;
  const path = statePath(request, guard);
  try {
    const storage = await getStorageClient();
    await storage.remove([path]);
  } catch (error) {
    console.warn('mare:state-delete-skipped', error);
  }
  return NextResponse.json({ ok: true });
}
