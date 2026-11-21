"use client";

import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Loader2, Search } from "lucide-react";

export type ToolCallStatus = "pending" | "running" | "done" | "error";

type ToolCallCardProps = {
  name: string;
  /** Resumo curto e humano dos argumentos, ex.: um caminho ou busca. */
  summary: string;
  status: ToolCallStatus;
  input: Record<string, unknown>;
  output?: string;
  /** Segundos, mostrado quando a chamada termina. */
  duration?: number;
  /** Servidor ao qual a ferramenta pertence, ex.: "web". */
  server?: string;
  icon?: ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
};

function StatusText({ status, duration }: { status: ToolCallStatus; duration?: number }) {
  if (status === "running")
    return (
      <span className="flex items-center gap-1.5 text-mare-blue">
        <Loader2 className="size-3 motion-safe:animate-spin" />
        Executando
      </span>
    );
  if (status === "pending") return <span>Aguardando</span>;
  if (status === "error") return <span className="text-rose-700">Falhou</span>;
  return <span>{duration !== undefined ? duration.toFixed(1) + "s" : "Pronto"}</span>;
}

/**
 * Uma chamada de ferramenta com pedido e resposta. O cabeçalho lê como mais um
 * passo da resposta; abrir mostra exatamente o que foi enviado e o que voltou.
 */
export function ToolCallCard({
  name,
  summary,
  status,
  input,
  output,
  duration,
  server,
  icon: Icon = Search,
  defaultOpen = false,
}: ToolCallCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const finished = status === "done" || status === "error";

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-mare-line text-[13px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full min-w-0 items-center gap-2 px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mare-blue/40 hover:bg-mare-soft/60"
      >
        <Icon className="size-3.5 shrink-0 text-mare-blue" />
        <span className="shrink-0 font-medium text-mare-ink">
          {server && <span className="font-normal text-mare-muted">{server} · </span>}
          {name}
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-mare-muted">{summary}</code>
        <span className="shrink-0 pl-1 font-ui text-[12px] tabular-nums text-mare-muted">
          <StatusText status={status} duration={duration} />
        </span>
        <ChevronRight className={"size-3.5 shrink-0 text-mare-muted transition-transform duration-200 " + (open ? "rotate-90" : "")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 40 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-mare-line border-t border-mare-line bg-mare-soft/40 font-mono text-[12px] leading-[1.6]">
              <section className="px-3 py-2">
                <p className="mb-1 font-ui text-[12px] text-mare-muted">Pedido</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-mare-ink [--sb:rgba(0,14,84,0.18)] hover:[--sb:rgba(0,14,84,0.32)] [scrollbar-width:thin] [scrollbar-color:var(--sb)_transparent] supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] supports-[selector(::-webkit-scrollbar)]:[scrollbar-color:auto] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--sb)] [&::-webkit-scrollbar-thumb]:bg-clip-padding">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </section>
              <section className="px-3 py-2">
                <p className="mb-1 font-ui text-[12px] text-mare-muted">Resposta</p>
                {finished ? (
                  <pre
                    className={
                      "max-h-48 overflow-auto whitespace-pre-wrap break-words [--sb:rgba(0,14,84,0.18)] hover:[--sb:rgba(0,14,84,0.32)] [scrollbar-width:thin] [scrollbar-color:var(--sb)_transparent] supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] supports-[selector(::-webkit-scrollbar)]:[scrollbar-color:auto] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--sb)] [&::-webkit-scrollbar-thumb]:bg-clip-padding " +
                      (status === "error" ? "text-rose-700" : "text-mare-ink")
                    }
                  >
                    {output}
                  </pre>
                ) : (
                  <p className="font-ui text-[12.5px] text-mare-muted">{status === "running" ? "Aguardando a resposta…" : "Ainda não enviado"}</p>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
