const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const BLOCKED_PROTOCOL_PATTERN = /^(?:javascript|data|vbscript|file|blob):/i;

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
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function isSafeExternalUrl(value?: string | null): boolean {
  const sanitized = sanitizeUrl(value);
  if (!sanitized || isRelativeHref(sanitized)) return false;
  try {
    return SAFE_PROTOCOLS.has(new URL(sanitized).protocol);
  } catch {
    return false;
  }
}

