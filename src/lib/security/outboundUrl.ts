import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Guarda de saída (SSRF) para rotas que buscam URLs fornecidas pelo cliente.
 *
 * Duas coisas precisam ser verdadeiras para um fetch do servidor ser seguro:
 * 1. o destino resolvido não pode estar na rede interna nem em endpoints de
 *    metadata de nuvem (169.254.169.254, etc.);
 * 2. cada redirecionamento também precisa passar pela mesma checagem — um
 *    302 de um host público para `http://169.254.169.254/` contorna a
 *    validação feita apenas na URL inicial.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

/** Faixas privadas, reservadas e de link-local em IPv4. */
const isPrivateIpv4 = (address: string) => {
  const [a, b] = address.split('.').map(Number);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return true;

  return (
    a === 0 || // "este host"
    a === 10 || // privada
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT (100.64.0.0/10)
    (a === 169 && b === 254) || // link-local / metadata de nuvem
    (a === 172 && b >= 16 && b <= 31) || // privada
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 192 && b === 168) || // privada
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast e reservado
  );
};

/** Faixas privadas, loopback, link-local e ULA em IPv6 (inclui IPv4 mapeado). */
const isPrivateIpv6 = (address: string) => {
  const value = address.toLowerCase().replace(/^\[|\]$/g, '');

  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe80')) return true; // link-local
  if (value.startsWith('fc') || value.startsWith('fd')) return true; // unique local
  if (value.startsWith('ff')) return true; // multicast

  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  return false;
};

export const isPrivateAddress = (address: string) => {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return false;
};

const normalizeHostname = (hostname: string) =>
  hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');

export class UnsafeOutboundUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeOutboundUrlError';
  }
}

/**
 * Valida que a URL é http(s) e que o destino não é interno.
 * Hosts com nome são resolvidos via DNS para checar o endereço real.
 */
export async function assertPublicHttpUrl(value: string | URL): Promise<URL> {
  let url: URL;
  try {
    url = value instanceof URL ? value : new URL(value);
  } catch {
    throw new UnsafeOutboundUrlError('URL inválida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeOutboundUrlError('Protocolo não permitido.');
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeOutboundUrlError('Origem não permitida.');
  }
  if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.home.arpa')) {
    throw new UnsafeOutboundUrlError('Origem não permitida.');
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new UnsafeOutboundUrlError('Endereço privado não permitido.');
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeOutboundUrlError('Não foi possível resolver o host.');
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UnsafeOutboundUrlError('Origem não permitida.');
  }

  return url;
}

/**
 * `fetch` que valida cada redirecionamento antes de segui-lo (máx. 3 saltos).
 * Diferente de `redirect: 'follow'`, um 302 para a rede interna é recusado.
 */
export async function fetchWithSafeRedirects(
  value: string | URL,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<{ response: Response; finalUrl: URL }> {
  let target = await assertPublicHttpUrl(value);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetch(target, { ...init, redirect: 'manual' });
    const location = response.headers.get('location');

    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, finalUrl: target };
    }

    response.body?.cancel().catch(() => {});
    target = await assertPublicHttpUrl(new URL(location, target));
  }

  throw new UnsafeOutboundUrlError('Redirecionamentos em excesso.');
}
