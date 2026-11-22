const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const BLOCKED_PROTOCOL_PATTERN = /^(?:javascript|data|vbscript|file|blob):/i;

/**
 * Hosts internos/link-local/metadata nunca são externos de verdade: bloquear
 * aqui protege quem repassa a URL adiante (read_page -> FireCrawl, <a>/<img>
 * renderizados) de virar ponte para redes internas da plataforma de deploy.
 */
const PRIVATE_HOST_PATTERN =
  /^(?:localhost$|[^.]*\.localhost$|127\.\d+\.\d+\.\d+$|10\.\d+\.\d+\.\d+$|192\.168\.\d+\.\d+$|169\.254\.\d+\.\d+$|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$|0\.0\.0\.0$|::1$|fe[89ab][0-9a-f]{0,2}[:0-9a-f.]*$|f[cd][0-9a-f]{2}[:0-9a-f.]*$|metadata\.google\.internal$|metadata\.goog$|169\.254\.169\.254$)/i;
const PRIVATE_HOST_SUFFIX = /\.(?:internal|local|lan|home\.arpa)$/i;

function hostIsPrivate(value: string): boolean {
  const host = value.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
  if (!host || /^\d+$/.test(host)) return true; // sem ponto/não-IP: rejeita IP em decimal puro
  return PRIVATE_HOST_PATTERN.test(host) || PRIVATE_HOST_SUFFIX.test(host);
}

const isRelativeHref = (value: string) =>
  value.startsWith('/') ||
  value.startsWith('#') ||
  value.startsWith('?') ||
  value.startsWith('./') ||
  value.startsWith('../');

function sanitizeUrl(value?: string | null): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  // Recupera trechos colados acidentalmente como #https://... e preserva âncoras internas.
  const trimmed = value.trim().replace(/^#+\s*(?=https?:\/\/)/i, '');
  const protocolProbe = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (!trimmed || BLOCKED_PROTOCOL_PATTERN.test(protocolProbe)) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (isRelativeHref(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return undefined;
    if (url.protocol !== 'mailto:' && hostIsPrivate(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function isSafeExternalUrl(value?: string | null): boolean {
  const sanitized = sanitizeUrl(value);
  if (!sanitized || isRelativeHref(sanitized)) return false;
  try {
    const url = new URL(sanitized);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return false;
    if (url.protocol !== 'mailto:' && hostIsPrivate(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
