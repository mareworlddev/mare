import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fontsource/cal-sans';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/special-elite';
import '@fontsource/quantico/400.css';
import '@fontsource/quantico/700.css';
import '../styles/mare.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Agente Mare — ferramentas e skills para o dia a dia',
    template: '%s | Agente Mare',
  },
  description:
    'A Mare reúne ferramentas e skills para pesquisar, planejar, escrever, revisar e organizar o trabalho com maestria.',
  keywords: ['agente', 'IA', 'ferramentas', 'skills', 'Mare'],
  authors: [{ name: 'Agente Mare' }],
  creator: 'Agente Mare',
  publisher: 'Agente Mare',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Agente Mare',
    title: 'Agente Mare — ferramentas e skills para o dia a dia',
    description: 'Pesquisa, planeja, escreve e revisa com ferramentas transparentes.',
    images: [{ url: '/logos/mare.svg', width: 512, height: 512, alt: 'Agente Mare' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agente Mare',
    description: 'Pesquisa, planeja, escreve e revisa com ferramentas transparentes.',
    images: ['/logos/mare.svg'],
  },
  applicationName: 'Agente Mare',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logos/mare.svg', type: 'image/svg+xml' }],
    shortcut: '/logos/mare.svg',
    apple: '/logos/mare.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Agente Mare',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000e54' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className="min-h-screen transition-colors duration-200"
        style={{ fontFamily: "'Plus Jakarta Sans Variable', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
