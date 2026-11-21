"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "lucide-react";

export type ToolToggle = { id: string; label: string; icon: ReactNode; hint?: string };

export type ComposerToolsMenuProps = {
  tools: ToolToggle[];
  /** Ids das ferramentas ligadas. */
  enabled: string[];
  onToggle: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40";
const item =
  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left font-ui text-[13px] text-mare-ink outline-none transition-colors hover:bg-mare-soft focus-visible:bg-mare-soft";

/** Menu de ferramentas do compositor: abre do botão +, cada item liga ou desliga. */
export function ComposerToolsMenu({ tools, enabled, onToggle, open, onOpenChange }: ComposerToolsMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusOnOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !menu.current?.contains(event.target as Node)) onOpenChange(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  // Leva o foco ao menu quando abre pelo botão.
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    const id = window.requestAnimationFrame(() => {
      menu.current?.querySelector<HTMLElement>("[data-item]")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("[data-item]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const move = (i: number) => items[(i + items.length) % items.length]?.focus();
    focusOnOpen.current = true;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(at + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(at < 0 ? items.length - 1 : at - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        onOpenChange(false);
        trigger.current?.focus();
        break;
      case "Tab":
        onOpenChange(false);
        break;
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label="Ferramentas"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          focusOnOpen.current = true;
          onOpenChange(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            focusOnOpen.current = true;
            onOpenChange(true);
          }
        }}
        className={
          "grid size-8 place-items-center rounded-full border transition " +
          ring +
          " " +
          (open
            ? "border-mare-navy/30 bg-mare-soft text-mare-navy"
            : "border-mare-line text-mare-muted hover:bg-mare-soft hover:text-mare-navy")
        }
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={spring} className="grid place-items-center">
          <Plus className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menu}
            key="menu"
            role="menu"
            aria-label="Ferramentas"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ layout: spring, default: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } }}
            className="absolute bottom-full left-0 z-20 mb-2 w-[min(264px,calc(100vw-48px))] origin-bottom-left overflow-hidden rounded-xl border border-mare-line bg-white p-1 shadow-[0_16px_40px_-16px_rgba(0,14,84,0.45)]"
          >
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-mare-blue">Ferramentas</p>
            {tools.map((t) => {
              const on = enabled.includes(t.id);
              return (
                <button key={t.id} type="button" data-item role="menuitemcheckbox" aria-checked={on} tabIndex={-1} onClick={() => onToggle(t.id)} className={item}>
                  <span className="grid size-4 shrink-0 place-items-center text-mare-blue">{t.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  {on && <Check className="size-3.5 shrink-0 text-mare-blue" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
