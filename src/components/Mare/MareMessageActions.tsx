"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, RefreshCw, Share } from "lucide-react";

type MessageActionsProps = {
  text: string;
  onRegenerate?: () => void;
  onShare?: () => void;
  regenerating?: boolean;
  /** Mantém a barra visível em vez de só em hover/foco. */
  persistent?: boolean;
};

function ActionButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={
        "grid size-8 place-items-center rounded-lg transition hover:bg-mare-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 active:scale-90 " +
        (pressed ? "text-mare-navy" : "text-mare-muted hover:text-mare-navy")
      }
    >
      {children}
    </button>
  );
}

export function MessageActions({ text, onRegenerate, onShare, regenerating = false, persistent = false }: MessageActionsProps) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  return (
    <div
      className={
        "relative flex items-center gap-0.5 transition-opacity duration-150 " +
        (persistent ? "" : "opacity-70 focus-within:opacity-100 group-hover:opacity-100")
      }
    >
      <ActionButton
        label={copied ? "Copiado" : "Copiar"}
        onClick={() => {
          navigator.clipboard?.writeText(text).catch(() => {});
          setCopied(true);
          later(() => setCopied(false), 1600);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "y" : "n"}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 38 }}
          >
            {copied ? <Check className="size-4 text-mare-blue" strokeWidth={2.4} /> : <Copy className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </ActionButton>
      {onRegenerate ? (
      <ActionButton label="Regenerar" onClick={() => onRegenerate()}>
        <motion.span
          animate={regenerating && !reduce ? { rotate: 360 } : { rotate: 0 }}
          transition={regenerating && !reduce ? { duration: 0.9, ease: "linear", repeat: Infinity } : { duration: 0 }}
          className="grid"
        >
          <RefreshCw className="size-4" />
        </motion.span>
      </ActionButton>
      ) : null}
      {onShare ? (
      <ActionButton
        label={shared ? "Transcrição copiada" : "Compartilhar"}
        onClick={() => {
          onShare();
          setShared(true);
          later(() => setShared(false), 1600);
        }}
      >
        <Share className="size-4" />
      </ActionButton>
      ) : null}

      <span aria-live="polite" className="ml-1.5 text-[12px] text-mare-muted">
        <AnimatePresence mode="popLayout" initial={false}>
          {(copied || shared) && (
            <motion.span key={copied ? "c" : "s"} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {copied ? "Copiado" : "Transcrição copiada"}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  );
}
