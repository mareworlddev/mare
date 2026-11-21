import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from '@aws-sdk/client-s3';

type StorageError = Error & {
  code?: string;
  statusCode?: number;
};

type StorageListItem = {
  key: string;
  name: string;
  lastModified?: string;
  size?: number;
};

export interface StorageClient {
  download(path: string): Promise<{ data: Blob | null; error: StorageError | null }>;
  upload(
    path: string,
    body: Blob | Buffer | string,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<{ error: StorageError | null }>;
  remove(paths: string[]): Promise<{ error: StorageError | null }>;
  list(
    folder: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<{ data: StorageListItem[] | null; error: StorageError | null }>;
  getPublicUrl(path: string): string;
}

let s3Client: S3Client | null = null;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizeObjectPath = (value: string) => trimSlashes(value.trim());

const withTrailingSlash = (value: string) => {
  const normalized = trimSlashes(value);
  return normalized ? `${normalized}/` : '';
};

const toStorageError = (error: unknown): StorageError => {
  if (error instanceof Error) {
    return error as StorageError;
  }

  return Object.assign(new Error('Erro desconhecido no storage'), {
    code: 'UnknownStorageError',
  });
};

const isNotFoundError = (error: unknown) => {
  if (error instanceof NoSuchKey) return true;

  const storageError = error as S3ServiceException & {
    Code?: string;
    code?: string;
    statusCode?: number;
  };

  return (
    storageError?.name === 'NoSuchKey' ||
    storageError?.Code === 'NoSuchKey' ||
    storageError?.code === 'NoSuchKey' ||
    storageError?.$metadata?.httpStatusCode === 404 ||
    storageError?.statusCode === 404
  );
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
};

// R2_ENDPOINT is the account S3 endpoint. Older deployments included /<bucket>
// in this value, which made the SDK address the bucket twice.
const getR2Endpoint = () => {
  const url = new URL(getRequiredEnv('R2_ENDPOINT'));
  if (url.protocol !== 'https:') throw new Error('R2_ENDPOINT deve usar HTTPS');
  return url.origin;
};

const getS3Client = () => {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  return s3Client;
};

const resolvePublicBaseUrl = () => {
  const value = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL deve ser um domínio público HTTPS do bucket.');
  }
  return value;
};

export const getStorageClient = (bucketName?: string): StorageClient => {
  const client = getS3Client();
  const bucket = bucketName || getRequiredEnv('R2_BUCKET_NAME');
  const publicBaseUrl = resolvePublicBaseUrl();

  return {
    async download(path: string) {
      const key = normalizeObjectPath(path);

      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        const data = await response.Body?.transformToByteArray();
        return { data: data ? new Blob([Buffer.from(data)]) : null, error: null };
      } catch (error) {
        if (isNotFoundError(error)) {
          const notFoundError = Object.assign(new Error(`Objeto nao encontrado: ${key}`), {
            code: 'NoSuchKey',
            statusCode: 404,
          });

          return { data: null, error: notFoundError };
        }

        return { data: null, error: toStorageError(error) };
      }
    },

    async upload(path: string, body: Blob | Buffer | string, options) {
      const key = normalizeObjectPath(path);

      try {
        const payload = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : body;

        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: payload,
            ContentType: options?.contentType,
          })
        );

        return { error: null };
      } catch (error) {
        return { error: toStorageError(error) };
      }
    },

    async remove(paths: string[]) {
      try {
        const normalizedPaths = paths
          .map((path) => normalizeObjectPath(path))
          .filter(Boolean);

        if (normalizedPaths.length === 0) {
          return { error: null };
        }

        await Promise.all(
          normalizedPaths.map((key) =>
            client.send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
              })
            )
          )
        );

        return { error: null };
      } catch (error) {
        return { error: toStorageError(error) };
      }
    },

    async list(folder: string, options) {
      const limit = options?.limit ?? 1000;
      const offset = options?.offset ?? 0;
      const search = options?.search?.trim().toLowerCase() || '';
      const prefix = withTrailingSlash(folder);

      try {
        let continuationToken: string | undefined;
        let skipped = 0;
        const items: StorageListItem[] = [];

        do {
          const response = await client.send(
            new ListObjectsV2Command({
              Bucket: bucket,
              Prefix: prefix,
              ContinuationToken: continuationToken,
              MaxKeys: Math.max(limit + offset, 1000),
            })
          );

          const contents = response.Contents ?? [];

          for (const object of contents) {
            const key = object.Key ? normalizeObjectPath(object.Key) : '';
            if (!key || key === trimSlashes(folder)) continue;

            const relativeName = prefix ? key.slice(prefix.length) : key;
            if (!relativeName) continue;
            if (search && !relativeName.toLowerCase().includes(search)) continue;

            if (skipped < offset) {
              skipped += 1;
              continue;
            }

            items.push({
              key,
              name: relativeName,
              lastModified: object.LastModified?.toISOString(),
              size: object.Size,
            });

            if (items.length >= limit) {
              return { data: items, error: null };
            }
          }

          continuationToken = response.IsTruncated
            ? response.NextContinuationToken
            : undefined;
        } while (continuationToken);

        return { data: items, error: null };
      } catch (error) {
        return { data: null, error: toStorageError(error) };
      }
    },

    getPublicUrl(path: string) {
      const key = normalizeObjectPath(path);
      if (publicBaseUrl) return `${publicBaseUrl}/${key}`;
      if (key.startsWith('public/images/')) {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
        return `${siteUrl}/media/${key.slice('public/'.length)}`;
      }
      throw new Error('Configure R2_PUBLIC_BASE_URL para gerar uma URL pública deste objeto.');
    },
  };
};
