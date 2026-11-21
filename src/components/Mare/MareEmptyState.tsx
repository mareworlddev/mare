"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export type Starter = {
  id: string;
  title: string;
  /** Uma linha de contexto que torna o ponto de partida pessoal. */
  detail: string;
  /** O prompt colocado no compositor ao escolher. */
  prompt: string;
  visual: ReactNode;
};

export type EmptyStateGreetingProps = {
  greeting: string;
  place: string;
  lead: string;
  starters: Starter[];
  onPick: (starter: Starter) => void;
};

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

export function EmptyStateGreeting({ greeting, place, lead, starters, onPick }: EmptyStateGreetingProps) {
  const reduce = useReducedMotion();
  const item = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring, delay: reduce ? 0 : 0.06 * i },
  });
  return (
    <div className="w-full">
      <div className="flex items-end gap-6">
        <div className="min-w-0 flex-1">
          <motion.p {...item(0)} className="font-ui text-[12.5px] text-mare-muted">
            {place}
          </motion.p>
          <motion.h2 {...item(1)} className="mt-1.5 font-display text-[24px] leading-tight text-mare-navy sm:text-[30px]">
            {greeting}
          </motion.h2>
          <motion.p {...item(2)} className="mt-2 max-w-[440px] font-ui text-[13.5px] leading-relaxed text-mare-muted sm:text-[14.5px]">
            {lead}
          </motion.p>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-2.5">
        {starters.map((s, i) => (
          <motion.li key={s.id} {...item(3 + i)} className="min-w-0">
            <button
              type="button"
              onClick={() => onPick(s)}
              className="group flex w-full items-center gap-3 rounded-xl border border-mare-line bg-white p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:border-mare-blue/40 hover:bg-mare-soft/60 sm:p-3"
            >
              <span className="grid h-11 w-[52px] shrink-0 place-items-center rounded-lg bg-mare-soft p-1 text-mare-blue transition group-hover:bg-white">
                {s.visual}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-ui text-[13.5px] font-medium text-mare-navy">{s.title}</span>
                <span className="mt-0.5 block truncate font-ui text-[12.5px] text-mare-muted">{s.detail}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
