import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Storage do histórico sincronizado — inteiro no Supabase, sem serviço
 * externo. O client carrega o token do usuário (cookies): quem autoriza é a
 * política do bucket em supabase/migrations/0003_storage.sql, que só aceita o
 * caminho `state/<auth.uid()>.json`. Um usuário nunca lê nem escreve o
 * estado de outro — nem chamando a API direto.
 */

type StorageError = Error & {
  code?: string;
  statusCode?: number;
};

export interface StorageClient {
  download(path: string): Promise<{ data: Blob | null; error: StorageError | null }>;
  upload(
    path: string,
    body: Blob | Buffer | string,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<{ error: StorageError | null }>;
  remove(paths: string[]): Promise<{ error: StorageError | null }>;
}

/** Bucket privado criado pela migração 0003. */
export const MARE_STATE_BUCKET = 'mare-state';

const normalizeObjectPath = (value: string) => value.trim().replace(/^\/+|\/+$/g, '');

const toStorageError = (error: unknown): StorageError => {
  if (error instanceof Error) return error as StorageError;
  return Object.assign(new Error('Erro desconhecido no storage'), {
    code: 'UnknownStorageError',
  });
};

export async function getStorageClient(
  supabase?: SupabaseClient,
  bucketName: string = MARE_STATE_BUCKET
): Promise<StorageClient> {
  const client = supabase ?? (await createClient());
  const bucket = client.storage.from(bucketName);

  return {
    async download(path: string) {
      try {
        const { data, error } = await bucket.download(normalizeObjectPath(path));
        if (error) return { data: null, error: toStorageError(error) };
        return { data, error: null };
      } catch (error) {
        return { data: null, error: toStorageError(error) };
      }
    },

    async upload(path: string, body: Blob | Buffer | string, options) {
      try {
        const { error } = await bucket.upload(normalizeObjectPath(path), body, {
          ...(options?.contentType ? { contentType: options.contentType } : {}),
          ...(options?.upsert ? { upsert: options.upsert } : {}),
        });
        return { error: error ? toStorageError(error) : null };
      } catch (error) {
        return { error: toStorageError(error) };
      }
    },

    async remove(paths: string[]) {
      try {
        const normalized = paths.map((path) => normalizeObjectPath(path)).filter(Boolean);
        if (!normalized.length) return { error: null };
        const { error } = await bucket.remove(normalized);
        return { error: error ? toStorageError(error) : null };
      } catch (error) {
        return { error: toStorageError(error) };
      }
    },
  };
}
