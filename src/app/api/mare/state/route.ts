import { NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storageClient';

export const dynamic = 'force-dynamic';

function clientIdFromRequest(request: Request) {
  const raw = request.headers.get('x-mare-client-id') || 'anon';
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function statePath(clientId: string) {
  return `agentmare/state/${clientId}.json`;
}

function jsonBlob(payload: unknown) {
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

/** O histórico vive no navegador; o storage apenas replica entre dispositivos. */
export async function GET(request: Request) {
  const path = statePath(clientIdFromRequest(request));
  try {
    const storage = getStorageClient();
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
  const path = statePath(clientIdFromRequest(request));
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

    const storage = getStorageClient();
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
  const path = statePath(clientIdFromRequest(request));
  try {
    const storage = getStorageClient();
    await storage.remove([path]);
  } catch (error) {
    console.warn('mare:state-delete-skipped', error);
  }
  return NextResponse.json({ ok: true });
}
