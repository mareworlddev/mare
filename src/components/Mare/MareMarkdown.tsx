'use client';

import {
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import type { Pluggable } from 'unified';
import rehypeHighlight from 'rehype-highlight';

/**
 * Tabela de Markdown dentro de um contêiner que rola sozinho na horizontal.
 * Sem isso o navegador precisa espremer as colunas para caber na bolha.
 */
export function MarkdownTable({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<'table'> & { node?: unknown }) {
  return (
    <div className="mare-ws-table-wrap">
      <table {...props} />
    </div>
  );
}

const LANGUAGE_NAMES: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  rb: 'Ruby',
  sh: 'Shell',
  bash: 'Bash',
  zsh: 'Shell',
  json: 'JSON',
  jsonc: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  sql: 'SQL',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  c: 'C',
  h: 'C',
  cpp: 'C++',
  cs: 'C#',
  php: 'PHP',
  swift: 'Swift',
  yml: 'YAML',
  yaml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
};

/** Nome legível da linguagem, lido da classe que o highlight.js coloca no `<code>`. */
function languageOf(children: ReactNode) {
  const child = Array.isArray(children) ? children[0] : children;
  const className =
    isValidElement<{ className?: string }>(child) ? child.props.className || '' : '';
  const match = /language-([\w+#.-]+)/.exec(className);
  const id = match?.[1]?.toLowerCase();
  if (!id) return 'Código';
  return LANGUAGE_NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Bloco que passa de `limit` pixels nasce recolhido, com um botão para abrir.
 * Mede o conteúdo (e não o contêiner), então continua certo quando a resposta
 * chega pronta depois do streaming.
 */
export function CollapsibleText({
  children,
  limit,
  more = 'Ler tudo',
  less = 'Recolher',
  className = 'mare-ws-markdown',
  variant,
  head,
}: {
  children: ReactNode;
  limit: number;
  more?: string;
  less?: string;
  className?: string;
  variant?: 'code';
  /** Barra fixa no topo do bloco; quando existe, o botão mora nela. */
  head?: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    // Quem já tem um bloco recolhível dentro (código) não ganha um segundo botão.
    const check = () => setTall(el.scrollHeight > limit + 40 && !el.querySelector('.mare-ws-collapse'));
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [limit]);

  const toggle = tall ? (
    <button
      type="button"
      className="mare-ws-collapse-toggle"
      aria-expanded={open}
      aria-label={open ? less : more}
      onClick={() => setOpen((current) => !current)}
    >
      <ChevronDown className="size-3.5" aria-hidden="true" />
      {open ? less : more}
    </button>
  ) : null;

  return (
    <div
      className={
        'mare-ws-collapse' +
        (variant ? ` mare-ws-collapse-${variant}` : '') +
        (open ? ' is-open' : '')
      }
      style={{ '--collapse-limit': `${limit}px` } as CSSProperties}
    >
      {head !== undefined ? (
        <div className="mare-ws-collapse-head">
          <span className="mare-ws-collapse-label">{head}</span>
          {toggle}
        </div>
      ) : null}
      <div ref={body} className={['mare-ws-collapse-body', className].filter(Boolean).join(' ')}>
        {children}
      </div>
      {head === undefined ? toggle : null}
    </div>
  );
}

/** Bloco de código: barra com a linguagem e o botão recolher/expandir. */
export function MarkdownPre({
  node: _node,
  children,
  ...props
}: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
  return (
    <CollapsibleText
      limit={340}
      more="Expandir"
      less="Recolher"
      className=""
      variant="code"
      head={languageOf(children)}
    >
      <pre {...props}>{children}</pre>
    </CollapsibleText>
  );
}

export const markdownComponents = { table: MarkdownTable, pre: MarkdownPre };

/** Cores dos blocos de código: classes `hljs` estilizadas em globals.css. */
export const markdownRehypePlugins: Pluggable[] = [
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
];
