"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onStop?: () => void;
  streaming?: boolean;
  placeholder?: string;
  /** Slot do modelo à direita da barra, ex.: o seletor de modelo/esforço. */
  model?: ReactNode;
  maxRows?: number;
  /** Chip na frente do texto, ex.: a skill escolhida. */
  leading?: ReactNode;
  /** Botões à esquerda da barra, ex.: menu de ferramentas. */
  actions?: ReactNode;
  /** Linha sob o campo. */
  hint?: ReactNode;
  /** Permite enviar sem texto, quando há documentos prontos. */
  extraCanSend?: boolean;
};

/** Campo de mensagem da Mare: um cartão branco que cresce com o texto. */
export function PromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming = false,
  placeholder = "Peça algo à Mare",
  model,
  maxRows = 8,
  leading,
  actions,
  hint,
  extraCanSend = false,
}: PromptInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = (value.trim().length > 0 || extraCanSend) && !streaming;

  // Cresce junto com o texto, até maxRows.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = Math.min(el.scrollHeight, line * maxRows) + "px";
  }, [value, maxRows]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSubmit(value);
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) onSubmit(value);
        }}
        onClick={() => ref.current?.focus()}
        className="group w-full cursor-text rounded-[22px] border border-mare-line bg-white p-2 shadow-[0_8px_30px_-14px_rgba(0,14,84,0.35)] transition-colors focus-within:border-mare-blue/50"
      >
        <div className="flex flex-wrap items-start gap-x-1.5 px-1.5 pt-1.5">
          {leading}
          <textarea
            ref={ref}
            rows={1}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Mensagem"
            className="block min-w-[140px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1 font-ui text-[15px] leading-6 text-mare-ink outline-none placeholder:text-mare-muted/80 focus:ring-0 [--sb:rgba(0,14,84,0.18)] hover:[--sb:rgba(0,14,84,0.32)] [scrollbar-width:thin] [scrollbar-color:var(--sb)_transparent] supports-[selector(::-webkit-scrollbar)]:[scrollbar-width:auto] supports-[selector(::-webkit-scrollbar)]:[scrollbar-color:auto] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--sb)] [&::-webkit-scrollbar-thumb]:bg-clip-padding"
          />
        </div>
        <div className="mt-1 flex items-center gap-1">
          {actions}
          <div className="ml-auto flex items-center gap-1.5">
            {model}
            <AnimatePresence mode="popLayout" initial={false}>
              {streaming ? (
                <motion.button
                  key="stop"
                  type="button"
                  onClick={onStop}
                  aria-label="Parar resposta"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 32 }}
                  className="grid size-9 place-items-center rounded-xl bg-mare-ink text-white active:scale-95"
                >
                  <Square className="size-3.5 fill-current" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="submit"
                  disabled={!canSend}
                  aria-label="Enviar mensagem"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 32 }}
                  className="grid size-9 place-items-center rounded-xl bg-mare-navy text-white transition-[filter,opacity,transform] hover:bg-mare-blue active:scale-95 disabled:opacity-40"
                >
                  <ArrowUp className="size-[18px]" strokeWidth={2.4} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>
      {hint}
    </div>
  );
}
