"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
  /** Mostrado na linha sob a bolha, ex.: o horário. */
  meta?: string;
  /** Ações da mensagem (copiar, regenerar), na mesma linha do horário. */
  actions?: ReactNode;
};

/** Bolha de mensagem: você à direita em navy, a Mare à esquerda em cartão branco. */
export function MessageBubble({ role, children, meta, actions }: MessageBubbleProps) {
  const reduce = useReducedMotion();
  const user = role === "user";
  return (
    <motion.div
      initial={reduce ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 480, damping: 38 }}
      className={
        "flex gap-2.5 " +
        (user ? "mare-bubble-user justify-end" : "mare-bubble-assistant justify-start")
      }
    >
      <div className={"flex max-w-[82%] flex-col " + (user ? "items-end" : "items-start")}>
        <div
          className={
            "px-4 py-3 font-ui text-[14px] leading-[23px] " +
            (user
              ? "rounded-[20px] rounded-br-md bg-mare-navy text-white shadow-[0_10px_24px_-14px_rgba(0,14,84,0.9)]"
              : "rounded-[20px] rounded-tl-md border border-mare-line bg-white text-mare-ink shadow-[0_4px_14px_-10px_rgba(0,14,84,0.35)]")
          }
        >
          {children}
        </div>
        {meta || actions ? (
          <div className="mt-1 flex items-center gap-1.5 px-1.5">
            {meta ? <span className="text-[11px] text-mare-muted">{meta}</span> : null}
            {actions}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
