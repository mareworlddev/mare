import type { NextConfig } from 'next';

const getHostname = (value?: string) => {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
};

const r2PublicHostname =
  getHostname(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) ||
  getHostname(process.env.R2_PUBLIC_BASE_URL);

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
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      ...(r2PublicHostname
        ? [{ protocol: 'https' as const, hostname: r2PublicHostname }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
