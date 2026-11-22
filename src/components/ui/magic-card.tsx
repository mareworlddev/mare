'use client';

/**
 * MagicCard (magicui) adaptado à identidade Mare: borda que segue o cursor
 * com gradiente navy→azul + holofote suave. Mantido fiel ao comportamento
 * original do registry. Usa o pacote `motion` já presente no projeto.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'motion/react';

import { cn } from '@/lib/utils';

interface MagicCardBaseProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

interface MagicCardGradientProps extends MagicCardBaseProps {
  mode?: 'gradient';
  gradientColor?: string;
  gradientOpacity?: number;
}

type MagicCardProps = MagicCardGradientProps;
type ResetReason = 'enter' | 'leave' | 'global' | 'init';

export function MagicCard(props: MagicCardProps) {
  const {
    children,
    className,
    gradientSize = 200,
    gradientColor = '#e9e9e9',
    gradientOpacity = 0.8,
    gradientFrom = '#0553af',
    gradientTo = '#000e54',
    mode = 'gradient',
  } = props;

  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 });

  const modeRef = useRef(mode);
  const gradientSizeRef = useRef(gradientSize);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    gradientSizeRef.current = gradientSize;
  }, [gradientSize]);

  const reset = useCallback(
    (reason: ResetReason = 'leave') => {
      if (reason === 'enter') orbVisible.set(0.6);
      else orbVisible.set(0);
      const off = -gradientSizeRef.current;
      mouseX.set(off);
      mouseY.set(off);
    },
    [mouseX, mouseY, orbVisible]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  useEffect(() => {
    reset('init');
  }, [reset]);

  const background = useMotionTemplate`
    linear-gradient(var(--background) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      var(--border) 100%
    ) border-box
  `;

  return (
    <motion.div
      className={cn(
        'group relative isolate overflow-hidden rounded-[inherit] border border-transparent',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => reset('leave')}
      onPointerEnter={() => reset('enter')}
      style={{ background }}
    >
      <div aria-hidden="true" className="absolute inset-px z-20 rounded-[inherit] bg-white" />

      {mode === 'gradient' ? (
        <motion.div
          suppressHydrationWarning
          className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
                ${gradientColor},
                transparent 100%
              )
            `,
            opacity: gradientOpacity,
          }}
        />
      ) : null}

      <div className="relative z-40">{children}</div>
    </motion.div>
  );
}
