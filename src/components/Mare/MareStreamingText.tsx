"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, useReducedMotion } from "motion/react";
import { markdownComponents, markdownRehypePlugins } from "./MareMarkdown";

type StreamingTextProps = {
  text: string;
  /** Quantas palavras estão visíveis até agora. */
  shown: number;
  done: boolean;
};

/** A resposta parcial usa o mesmo Markdown da resposta pronta, sem relayout ao concluir. */
export function StreamingText({ text, shown, done }: StreamingTextProps) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/);
  let seen = 0;
  const visible: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (/^\s+$/.test(words[i])) {
      if (seen < shown) visible.push(words[i]);
      continue;
    }
    if (seen >= shown) break;
    visible.push(words[i]);
    seen++;
  }

  return (
    <div className="font-ui text-[14px] leading-[24px] text-mare-ink" aria-busy={!done}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} components={markdownComponents}>{visible.join('')}</ReactMarkdown>
      {!done && (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block h-[16px] w-[7px] translate-y-[3px] rounded-[2px] bg-mare-blue"
          animate={reduce ? undefined : { opacity: [1, 1, 0.2, 0.2] }}
          transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.55, 1] }}
        />
      )}
    </div>
  );
}
