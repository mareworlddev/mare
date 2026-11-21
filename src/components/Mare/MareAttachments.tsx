'use client';

import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  FileCode2,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Presentation,
  RotateCw,
  X,
} from 'lucide-react';

export type AttachmentKind = 'pdf' | 'doc' | 'sheet' | 'slides' | 'text';

/** Arquivo escolhido no campo: sobe, é lido no servidor e vira contexto da mensagem. */
export type PendingAttachment = {
  id: string;
  name: string;
  kind: AttachmentKind;
  /** Tamanho já formatado, ex.: "1,4 MB". */
  size: string;
  bytes: number;
  /** 0 a 1; 1 quando o texto já está pronto. */
  progress: number;
  error?: string;
  text?: string;
  truncated?: boolean;
};

const ICONS = {
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  text: FileCode2,
} as const;

const spring = { type: 'spring', stiffness: 480, damping: 38 } as const;

/** Botão de clipe que abre o seletor de documentos. */
export function AttachButton({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) onFiles(files);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        aria-label="Anexar documento"
        title="Anexar PDF, Word, planilha ou slides"
        className="grid size-8 place-items-center rounded-lg text-mare-muted transition hover:bg-mare-soft hover:text-mare-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 disabled:opacity-40"
      >
        <Paperclip className="size-[17px]" strokeWidth={1.9} />
      </button>
    </>
  );
}

/** Bandeja acima do campo: cada documento com progresso, erro, repetir e remover. */
export function AttachmentsTray({
  items,
  onRemove,
  onRetry,
}: {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <ul className="mare-ws-attach" aria-label="Documentos anexados">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const Icon = ICONS[item.kind] || FileText;
          const ready = item.progress >= 1 && !item.error;
          return (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={spring}
              className={`mare-ws-attach-item mare-ws-attach-${item.kind}${item.error ? ' is-error' : ''}`}
            >
              <span className="mare-ws-attach-icon" aria-hidden="true">
                <Icon className="size-[15px]" strokeWidth={1.9} />
              </span>
              <span className="mare-ws-attach-body">
                <span className="mare-ws-attach-name" title={item.name}>{item.name}</span>
                <span className="mare-ws-attach-meta">
                  {item.error
                    ? item.error
                    : ready
                      ? `${item.size}${item.truncated ? ' · resumido' : ''}`
                      : 'Lendo documento…'}
                </span>
              </span>
              {item.error ? (
                <button
                  type="button"
                  aria-label={`Tentar de novo ${item.name}`}
                  title="Tentar de novo"
                  onClick={() => onRetry(item.id)}
                  className="mare-ws-attach-action"
                >
                  <RotateCw className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label={`Remover ${item.name}`}
                title="Remover"
                onClick={() => onRemove(item.id)}
                className="mare-ws-attach-action"
              >
                <X className="size-3.5" />
              </button>
              {!ready && !item.error ? (
                <span className="mare-ws-attach-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </span>
              ) : null}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
