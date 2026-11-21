import { isSafeExternalUrl } from '@/lib/security/url';
import { mareLog, mareWarn, previewText } from './log';
import type { MareSource } from './types';

const BASE = 'https://api.firecrawl.dev/v2';

function key() {
  return process.env.FIRE_CRAWLER_API_KEY || '';
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function firecrawl(path: string, body: Record<string, unknown>) {
  if (!key()) throw new Error('Configuração ausente: FIRE_CRAWLER_API_KEY.');
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(`FireCrawl ${response.status}: ${previewText(data?.error || '', 200)}`);
  }
  return data;
}

/** Busca real na web. Devolve lista vazia quando o FireCrawl falha. */
export async function firecrawlSearch(query: string, limit = 6): Promise<MareSource[]> {
  const normalized = cleanText(query).slice(0, 300);
  if (!normalized) return [];

  mareLog('pesquisa', `FireCrawl search · "${previewText(normalized, 70)}" · limite ${limit}`);
  try {
    const data = await firecrawl('/search', { query: normalized, limit });
    const results: MareSource[] = (data?.data?.web || data?.data || [])
      .map((item: any) => {
        const url = String(item?.url || '');
        if (!url || !isSafeExternalUrl(url)) return null;
        return {
          title: cleanText(item?.title) || domainOf(url),
          url,
          snippet: cleanText(item?.description || item?.markdown || item?.snippet),
          domain: domainOf(url),
        };
      })
      .filter(Boolean)
      .slice(0, limit);
    mareLog('pesquisa', `FireCrawl retornou ${results.length} resultado(s)`);
    return results;
  } catch (error) {
    mareWarn('pesquisa', 'busca indisponível', error instanceof Error ? error.message : error);
    return [];
  }
}

/** Texto principal de uma URL pública. `null` quando a leitura falha. */
export async function firecrawlScrape(url: string): Promise<{ title: string; text: string } | null> {
  if (!isSafeExternalUrl(url)) return null;
  try {
    const data = await firecrawl('/scrape', { url, formats: ['markdown'], onlyMainContent: true });
    const text = cleanText(data?.data?.markdown).slice(0, 12_000);
    if (!text) return null;
    return { title: cleanText(data?.data?.metadata?.title) || domainOf(url), text };
  } catch (error) {
    mareWarn('pesquisa', 'leitura de página falhou', error instanceof Error ? error.message : error);
    return null;
  }
}
