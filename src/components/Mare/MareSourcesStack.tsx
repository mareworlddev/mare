"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

export type Source = {
  title: string;
  domain: string;
  /** Cor do favicon de letra. */
  color: string;
  url?: string;
};

type SourcesStackProps = {
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quantos favicons mostrar no botão fechado. */
  preview?: number;
};

function Favicon({ source, ring = false }: { source: Source; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "grid size-5 shrink-0 place-items-center rounded-full text-[9.5px] font-bold uppercase text-white " +
        (ring ? "ring-2 ring-white" : "")
      }
      style={{ background: `linear-gradient(140deg, ${source.color}, color-mix(in oklab, ${source.color} 55%, #000))` }}
    >
      {source.domain[0]}
    </span>
  );
}

const row =
  "flex items-center gap-3 rounded-xl px-2.5 py-2 font-ui outline-none transition-colors hover:bg-mare-soft focus-visible:ring-2 focus-visible:ring-mare-blue/40";

export function SourcesStack({ sources, open, onOpenChange, preview = 4 }: SourcesStackProps) {
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="group inline-flex h-9 items-center gap-2.5 rounded-full border border-mare-line bg-white pl-1.5 pr-3 font-ui text-[13px] font-medium text-mare-ink shadow-[0_4px_16px_-10px_rgba(0,14,84,0.35)] outline-none transition focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:border-mare-blue/40 hover:text-mare-navy"
      >
        <span className="flex">
          {sources.slice(0, preview).map((source, i) => (
            <motion.span
              key={source.domain + i}
              className={i ? "-ml-1" : ""}
              style={{ zIndex: preview - i }}
              animate={{ scale: open ? 0.92 : 1 }}
              transition={{ type: "spring", stiffness: 480, damping: 38, delay: i * 0.02 }}
            >
              <Favicon source={source} ring />
            </motion.span>
          ))}
        </span>
        {sources.length} {sources.length === 1 ? "fonte" : "fontes"}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="grid place-items-center text-mare-muted group-hover:text-mare-navy"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            className="overflow-hidden"
          >
            <ol className="mt-2.5 max-h-[232px] overflow-y-auto rounded-2xl border border-mare-line bg-white p-1.5 shadow-[0_8px_30px_-14px_rgba(0,14,84,0.35)] [--sb:rgba(0,14,84,0.18)] hover:[--sb:rgba(0,14,84,0.32)] [scrollbar-width:thin] [scrollbar-color:var(--sb)_transparent] supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] supports-[selector(::-webkit-scrollbar)]:[scrollbar-color:auto] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--sb)] [&::-webkit-scrollbar-thumb]:bg-clip-padding">
              {sources.map((source, i) => {
                const content = (
                  <>
                    <span className="w-4 shrink-0 text-right text-[11.5px] tabular-nums text-mare-muted">{i + 1}</span>
                    <Favicon source={source} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-mare-ink">{source.title}</span>
                    <span className="hidden shrink-0 text-[12px] text-mare-muted sm:inline">{source.domain}</span>
                  </>
                );
                return (
                  <motion.li
                    key={source.domain + i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.025, duration: 0.2 }}
                  >
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer" className={row}>
                        {content}
                      </a>
                    ) : (
                      <div className={row}>{content}</div>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
