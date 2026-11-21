"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";

type ReasoningProps = {
  /** O texto de raciocínio até agora. Cresce durante o streaming. */
  text: string;
  streaming: boolean;
  /** Quanto tempo o modelo pensou, mostrado ao terminar. */
  seconds?: number;
  /** Fecha o painel X ms depois do fim. false mantém aberto. */
  autoCollapse?: number | false;
};

function Shimmer({ children }: { children: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-block bg-[linear-gradient(90deg,var(--base)_0%,var(--base)_40%,var(--shine)_50%,var(--base)_60%,var(--base)_100%)] bg-[length:250%_100%] bg-clip-text font-ui text-transparent [--base:#66718e] [--shine:#000e54]"
      initial={{ backgroundPosition: "100% 0" }}
      animate={reduce ? undefined : { backgroundPosition: "0% 0" }}
      transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}

export function Reasoning({ text, streaming, seconds, autoCollapse = 800 }: ReasoningProps) {
  const [open, setOpen] = useState(streaming);
  const body = useRef<HTMLDivElement>(null);
  const wasStreaming = useRef(streaming);

  // Abre enquanto pensa, dobra logo depois que termina.
  useEffect(() => {
    if (streaming && !wasStreaming.current) setOpen(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!streaming && wasStreaming.current && autoCollapse !== false) {
      timer = setTimeout(() => setOpen(false), autoCollapse);
    }
    wasStreaming.current = streaming;
    return () => clearTimeout(timer);
  }, [streaming, autoCollapse]);

  // Mantém a linha mais nova visível enquanto chega.
  useEffect(() => {
    if (streaming && body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [text, streaming]);

  const label = streaming ? "Pensando…" : seconds ? `Pensou por ${seconds}s` : "Pensou um instante";

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group -mx-1.5 flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-ui text-[13.5px] font-medium text-mare-blue outline-none transition-colors hover:text-mare-navy focus-visible:ring-2 focus-visible:ring-mare-blue/40"
      >
        {streaming ? <Shimmer>Pensando…</Shimmer> : <span>{label}</span>}
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="grid place-items-center"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            className="overflow-hidden"
          >
            <div
              ref={body}
              className="mt-2 max-h-[176px] overflow-y-auto border-l border-mare-line pl-4 font-ui text-[13px] leading-[1.7] text-mare-muted [scrollbar-width:none]"
            >
              <p className="whitespace-pre-wrap">{text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
