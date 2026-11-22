import type { NextConfig } from 'next';

/**
 * CSP fechada: fontes e estilos são self-hosted (@fontsource), imagens vêm de
 * hosts https conhecidos, o navegador só fala com a própria origem e com o
 * projeto Supabase. O dev recebe 'unsafe-eval'/'ws:' para o HMR do Next.
 */
const isDev = process.env.NODE_ENV === 'development';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co${isDev ? ' ws:' : ''}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lobehub/icons'],
  // Extratores de documento rodam no Node, fora do bundle (pdfjs precisa do worker).
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'mammoth', 'xlsx', 'jszip'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compress: true,
  poweredByHeader: false,
  // As skills são lidas do disco em tempo de execução.
  outputFileTracingIncludes: { '/api/mare/chat': ['./mare-nimble/**/*'] },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'https', hostname: 'gen.pollinations.ai' },
      { protocol: 'https', hostname: '**.pollinations.ai' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '**.placehold.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
