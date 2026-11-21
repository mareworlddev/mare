"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown } from "lucide-react";

type ConversationProps = {
  children: ReactNode;
  /** Altura da área de rolagem. */
  className?: string;
  /** Distância do rodapé, em px, que ainda conta como "no fim". */
  threshold?: number;
};

/** Área de conversa: acompanha o rodapé enquanto ele cresce, com atalho de volta ao fim. */
export function Conversation({ children, className = "h-[360px]", threshold = 32 }: ConversationProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  // Sempre que o conteúdo cresce, segue para baixo se estávamos no fim.
  useLayoutEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const follow = () => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  function handleScroll() {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    stick.current = near;
    setAtBottom(near);
  }

  function scrollToLatest() {
    const el = scroller.current;
    if (!el) return;
    stick.current = true;
    setAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className={"relative " + className}>
      <div
        ref={scroller}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        tabIndex={0}
        className="h-full overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 [--sb:rgba(0,14,84,0.18)] hover:[--sb:rgba(0,14,84,0.32)] [scrollbar-width:thin] [scrollbar-color:var(--sb)_transparent] supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] supports-[selector(::-webkit-scrollbar)]:[scrollbar-color:auto] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--sb)] [&::-webkit-scrollbar-thumb]:bg-clip-padding"
      >
        <div ref={content}>{children}</div>
      </div>
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            type="button"
            onClick={scrollToLatest}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 480, damping: 38 }}
            className="absolute bottom-3 left-1/2 flex h-8 items-center gap-1.5 rounded-full border border-mare-line bg-white/90 pl-2.5 pr-3 text-[12.5px] font-medium text-mare-ink shadow-[0_8px_24px_-10px_rgba(0,14,84,0.35)] outline-none backdrop-blur-md hover:bg-mare-soft hover:text-mare-navy focus-visible:ring-2 focus-visible:ring-mare-blue/40"
            style={{ x: "-50%" }}
          >
            <ArrowDown className="size-3.5" />
            Recentes
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
