"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

import { PromptInput } from "./MarePromptInput";
import { AttachButton, AttachmentsTray, type PendingAttachment } from "./MareAttachments";

export type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
};

interface MareComposerProps {
  commands: SlashCommand[];
  value: string;
  onChange: (value: string) => void;
  command: SlashCommand | null;
  onCommandChange: (command: SlashCommand | null) => void;
  onSubmit: (value: string, command: SlashCommand | null) => void;
  onStop?: () => void;
  streaming?: boolean;
  placeholder?: string;
  model?: React.ReactNode;
  actions?: React.ReactNode;
  hint?: React.ReactNode;
  attachments?: PendingAttachment[];
  onFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onRetryAttachment?: (id: string) => void;
}

/** Encontra um "/query" no início do texto ou depois de um espaço. */
function slashQuery(text: string) {
  const match = /(^|\s)\/([\w-]*)$/.exec(text);
  return match ? { query: match[2], start: match.index + match[1].length } : null;
}

/**
 * Compositor da Mare: campo de mensagem com o menu de skills em "/"
 * e o comando escolhido virando chip na frente da mensagem.
 */
export function MareComposer({
  commands,
  value,
  onChange,
  command,
  onCommandChange,
  onSubmit,
  onStop,
  streaming = false,
  placeholder,
  model,
  actions,
  hint,
  attachments = [],
  onFiles,
  onRemoveAttachment,
  onRetryAttachment,
}: MareComposerProps) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const slash = slashQuery(value);
  const results = useMemo(
    () =>
      slash
        ? commands.filter((item) => (item.id + " " + item.label).toLowerCase().includes(slash.query.toLowerCase()))
        : [],
    [commands, slash?.query]
  );
  const open = slash !== null && dismissed !== value;

  function pick(next: SlashCommand) {
    if (!slash) return;
    onCommandChange(next);
    onChange(value.slice(0, slash.start).trimEnd());
    setActive(0);
  }

  function handleChange(next: string) {
    setDismissed(null);
    onChange(next);
  }

  function handleSubmit(text: string) {
    if (open && results.length) {
      pick(results[Math.min(active, results.length - 1)]);
      return;
    }
    onSubmit(text, command);
  }

  // Setas e Esc enquanto o menu está aberto; o Enter fica com o campo.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + results.length) % results.length);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissed(value);
    }
  }

  const leading = (
    <AnimatePresence initial={false}>
      {command && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
          className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-mare-soft pl-2 pr-1 text-[13px] font-medium text-mare-navy shadow-[inset_0_0_0_1px_rgba(0,14,84,0.16)]"
        >
          <span className="[&>svg]:size-3.5">{command.icon}</span>
          {command.label}
          <button
            type="button"
            aria-label={"Remover " + command.label}
            onClick={(event) => {
              event.stopPropagation();
              onCommandChange(null);
            }}
            className="grid size-5 place-items-center rounded-md text-mare-navy/60 transition hover:bg-mare-navy/10 hover:text-mare-navy"
          >
            <X className="size-3" />
          </button>
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative w-full" onKeyDown={handleKeyDown}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 38 }}
            className="absolute inset-x-2 bottom-full z-10 mb-2 origin-bottom overflow-hidden rounded-2xl border border-mare-line bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(0,14,84,0.4)]"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-mare-blue">
              Skills
            </p>
            {results.length === 0 ? (
              <p className="px-2.5 py-3 text-[13px] text-mare-muted">Nenhuma skill para “/{slash?.query}”</p>
            ) : (
              <ul role="listbox" aria-label="Skills" className="max-h-[220px] overflow-y-auto">
                {results.map((item, index) => (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(item);
                    }}
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 " +
                      (index === active ? "bg-mare-soft" : "")
                    }
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-mare-line bg-white text-mare-blue">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-mare-ink">
                        <span className="text-mare-muted">/</span>
                        {item.id}
                      </span>
                      <span className="block truncate text-[12.5px] text-mare-muted">{item.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {onRemoveAttachment && onRetryAttachment ? (
        <AttachmentsTray
          items={attachments}
          onRemove={onRemoveAttachment}
          onRetry={onRetryAttachment}
        />
      ) : null}

      <PromptInput
        value={value}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onStop={onStop}
        streaming={streaming}
        placeholder={command ? "Acrescente os detalhes…" : placeholder}
        model={model}
        leading={leading}
        actions={
          onFiles ? (
            <>
              <AttachButton onFiles={onFiles} disabled={streaming} />
              {actions}
            </>
          ) : (
            actions
          )
        }
        hint={hint}
        extraCanSend={attachments.some((item) => item.progress >= 1 && !item.error)}
      />
    </div>
  );
}

export default MareComposer;
