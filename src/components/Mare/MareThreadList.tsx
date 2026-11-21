"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Search, SquarePen, Trash2, X } from "lucide-react";

export type ThreadGroup = "today" | "yesterday" | "week";

export type Thread = { id: string; title: string; group: ThreadGroup };

type ThreadListProps = {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export const threadGroupName: Record<ThreadGroup, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Últimos 7 dias",
};

const groups: ThreadGroup[] = ["today", "yesterday", "week"];

const iconButton =
  "grid size-6 place-items-center rounded-md text-mare-muted outline-none transition hover:bg-mare-soft hover:text-mare-navy focus-visible:ring-2 focus-visible:ring-mare-blue/40";

function RenameField({ initial, onDone }: { initial: string; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      value={value}
      aria-label="Título da conversa"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onDone(value.trim() || null);
        if (event.key === "Escape") onDone(null);
      }}
      className="h-8 w-full rounded-lg border border-mare-blue/40 bg-white px-2.5 font-ui text-[13.5px] text-mare-ink outline-none focus:border-mare-blue"
    />
  );
}

export function ThreadList({ threads, activeId, onSelect, onNew, onRename, onDelete }: ThreadListProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = q ? threads.filter((t) => t.title.toLowerCase().includes(q)) : threads;

  return (
    <nav aria-label="Conversas" className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <span className="font-ui text-[13px] font-semibold text-mare-navy">Conversas</span>
        <button type="button" onClick={onNew} aria-label="Nova conversa" className={iconButton + " size-8 rounded-lg"}>
          <SquarePen className="size-4" />
        </button>
      </div>

      <label className="relative mx-1 mb-3 block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mare-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar conversas"
          aria-label="Buscar conversas"
          className="h-8 w-full rounded-lg border border-mare-line bg-white pl-8 pr-8 font-ui text-[13px] text-mare-ink outline-none placeholder:text-mare-muted/70 focus:border-mare-blue/50"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery("")}
            className={iconButton + " absolute right-1 top-1/2 -translate-y-1/2"}
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1 [scrollbar-width:none]">
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-center font-ui text-[13px] text-mare-muted">Nenhuma conversa ainda. Comece uma nova.</p>
        ) : (
          visible.length === 0 && (
            <p className="px-2 py-6 text-center font-ui text-[13px] text-mare-muted">Nada encontrado para “{query}”</p>
          )
        )}
        {groups.map((group) => {
          const items = visible.filter((t) => t.group === group);
          if (!items.length) return null;
          return (
            <section key={group} className="mb-3">
              <h3 className="px-2 pb-1 font-ui text-[11.5px] font-medium text-mare-muted">{threadGroupName[group]}</h3>
              <ul>
                <AnimatePresence initial={false}>
                  {items.map((thread) => {
                    const active = thread.id === activeId;
                    return (
                      <motion.li
                        key={thread.id}
                        layout="position"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 480, damping: 38 }}
                        className="group relative"
                      >
                        {active && (
                          <motion.span
                            layoutId="mare-thread-active"
                            className="absolute inset-0 rounded-lg bg-mare-soft shadow-[inset_0_0_0_1px_rgba(5,83,175,0.25)]"
                            transition={{ type: "spring", stiffness: 480, damping: 38 }}
                          />
                        )}
                        {editing === thread.id ? (
                          <div className="relative p-0.5">
                            <RenameField
                              initial={thread.title}
                              onDone={(title) => {
                                if (title) onRename(thread.id, title);
                                setEditing(null);
                              }}
                            />
                          </div>
                        ) : confirming === thread.id ? (
                          <div
                            role="group"
                            aria-label={`Excluir ${thread.title}?`}
                            className="relative flex h-8 items-center gap-1 rounded-lg bg-rose-50 pl-2.5 pr-1 font-ui text-[13px] shadow-[inset_0_0_0_1px_rgba(190,18,60,0.25)]"
                            onKeyDown={(event) => event.key === "Escape" && setConfirming(null)}
                          >
                            <span className="min-w-0 flex-1 truncate text-rose-800">Excluir esta conversa?</span>
                            <button
                              type="button"
                              autoFocus
                              onClick={() => setConfirming(null)}
                              className="h-6 rounded-md px-2 font-ui text-[12px] text-mare-muted outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-navy/[0.06] hover:text-mare-navy"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirming(null);
                                onDelete(thread.id);
                              }}
                              className="h-6 rounded-md bg-rose-700 px-2 font-ui text-[12px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-rose-300 hover:bg-rose-800"
                            >
                              Excluir
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-current={active ? "page" : undefined}
                              onClick={() => onSelect(thread.id)}
                              onDoubleClick={() => setEditing(thread.id)}
                              className={
                                "relative block h-8 w-full truncate rounded-lg pl-2.5 text-left font-ui text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-mare-blue/40 group-focus-within:pr-16 group-hover:pr-16 " +
                                (active ? "pr-16 text-mare-navy" : "pr-2.5 text-mare-ink/80 hover:bg-mare-soft hover:text-mare-navy")
                              }
                            >
                              {thread.title}
                            </button>
                            <span
                              className={
                                "absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 " +
                                (active ? "opacity-100" : "opacity-0")
                              }
                            >
                              <button type="button" aria-label={`Renomear ${thread.title}`} onClick={() => setEditing(thread.id)} className={iconButton}>
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Excluir ${thread.title}`}
                                onClick={() => setConfirming(thread.id)}
                                className={iconButton + " hover:!text-rose-700"}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </span>
                          </>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
