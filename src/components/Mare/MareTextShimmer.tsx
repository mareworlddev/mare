"use client";

import { motion, useReducedMotion } from "motion/react";

type TextShimmerProps = {
  children: string;
  /** Segundos para uma passagem da luz. */
  duration?: number;
  className?: string;
};

export function TextShimmer({ children, duration = 1.8, className = "" }: TextShimmerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      className={
        "inline-block bg-[length:250%_100%] bg-clip-text font-ui text-transparent " +
        "[--base:#66718e] [--shine:#000e54] " +
        "bg-[linear-gradient(90deg,var(--base)_0%,var(--base)_40%,var(--shine)_50%,var(--base)_60%,var(--base)_100%)] " +
        className
      }
      initial={{ backgroundPosition: "100% 0" }}
      animate={reduce ? undefined : { backgroundPosition: "0% 0" }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}
