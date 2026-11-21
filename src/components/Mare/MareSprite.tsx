'use client';

import { useEffect, useRef, useState } from 'react';
import { MARE_PET_SHEETS, MARE_SPRITES, type MarePetSheet } from '@/lib/mare/constants';
import type { MareSpriteState } from '@/lib/mare/types';

interface MareSpriteProps {
  sheet: MarePetSheet;
  /** Linha da folha quando a grade tem várias linhas (0 = primeira). */
  row?: number;
  /** Coluna do quadro (0 = primeira). Um quadro só quando a linha é parada. */
  column?: number;
  /** Altura do render em px; a largura segue a proporção do quadro. */
  height?: number;
  label?: string;
  className?: string;
}

/** Posição percentual do quadro (coluna, linha) dentro da folha. */
function framePosition(cfg: (typeof MARE_PET_SHEETS)[MarePetSheet], column: number, row: number) {
  const x = cfg.cols > 1 ? (column * 100) / (cfg.cols - 1) : 0;
  const y = cfg.rows > 1 ? (row * 100) / (cfg.rows - 1) : 0;
  return `${x}% ${y}%`;
}

/** Um quadro parado de uma folha de sprites, recortado por background-position. */
export function PetSprite({ sheet, row = 0, column = 0, height = 96, label, className = '' }: MareSpriteProps) {
  const cfg = MARE_PET_SHEETS[sheet];
  return (
    <span
      role="img"
      aria-label={label || 'Mare'}
      className={`mare-sprite inline-block shrink-0 select-none ${className}`}
      style={{
        height,
        width: Math.round(height * cfg.frameRatio),
        backgroundImage: `url('${cfg.src}')`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${cfg.cols * 100}% ${cfg.rows * 100}%`,
        backgroundPosition: framePosition(cfg, column, row),
      }}
    />
  );
}

/** Uma animação infinita (true), única (false) ou com N voltas completas. */
export type PetAnimationLoop = boolean | number;

export interface AnimatedPetSpriteProps extends MareSpriteProps {
  /** Quantos quadros a linha tem. */
  frames: number;
  fps?: number;
  loop?: PetAnimationLoop;
  paused?: boolean;
  onFinish?: () => void;
}

/**
 * Uma linha inteira de uma folha, animada quadro a quadro.
 * Reinicia sempre que a folha/linha muda (use `key` no pai para forçar).
 */
export function AnimatedPetSprite({
  sheet,
  row = 0,
  frames,
  fps = 6,
  loop = true,
  paused = false,
  onFinish,
  height = 96,
  label,
  className = '',
}: AnimatedPetSpriteProps) {
  const cfg = MARE_PET_SHEETS[sheet];
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const loopCountRef = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    frameRef.current = 0;
    loopCountRef.current = 0;
    setFrame(0);
  }, [sheet, row, frames]);

  useEffect(() => {
    if (paused || frames < 2) return;
    const interval = window.setInterval(() => {
      const next = frameRef.current + 1;
      if (next >= frames) {
        loopCountRef.current += 1;
        if (loop === true || (typeof loop === 'number' && loopCountRef.current < loop)) {
          frameRef.current = 0;
          setFrame(0);
          return;
        }
        window.clearInterval(interval);
        frameRef.current = frames - 1;
        setFrame(frames - 1);
        finishRef.current?.();
        return;
      }
      frameRef.current = next;
      setFrame(next);
    }, 1000 / fps);
    return () => window.clearInterval(interval);
  }, [frames, fps, loop, paused, sheet, row]);

  return (
    <span
      role="img"
      aria-label={label || 'Mare'}
      className={`mare-sprite inline-block shrink-0 select-none ${className}`}
      style={{
        height,
        width: Math.round(height * cfg.frameRatio),
        backgroundImage: `url('${cfg.src}')`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${cfg.cols * 100}% ${cfg.rows * 100}%`,
        backgroundPosition: framePosition(cfg, frame, row),
      }}
    />
  );
}

/**
 * Coluna da folha 1×8 "olhando o mouse" a partir do vetor Mare → mouse.
 * 0 esquerda · 1 cima · 2 direita · 3 baixo · 4 esquerda+cima ·
 * 5 direita+cima · 6 esquerda+baixo · 7 direita+baixo.
 */
export function watchColumn(dx: number, dy: number): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  // Zona morta em volta da Mare: mantém a última direção em vez de piscar.
  if (Math.hypot(dx, dy) < 24) return -1;
  const horizontal = dx < 0 ? 'left' : 'right';
  const vertical = dy < 0 ? 'up' : 'down';
  if (ax > ay * 2) return dx < 0 ? 0 : 2;
  if (ay > ax * 2) return dy < 0 ? 1 : 3;
  if (horizontal === 'left') return vertical === 'up' ? 4 : 6;
  return vertical === 'up' ? 5 : 7;
}

export default PetSprite;

/** Um estado da Mare sobre a folha de ações do chat, animado. */
export function MareSprite({
  state,
  size = 96,
  paused = false,
  onFinish,
  label,
}: {
  state: MareSpriteState;
  size?: number;
  paused?: boolean;
  onFinish?: () => void;
  label?: string;
}) {
  const frame = MARE_SPRITES[state];
  return (
    <AnimatedPetSprite
      key={`${state}-${paused ? 'paused' : 'on'}`}
      sheet="chat"
      row={frame.row}
      frames={frame.frames}
      fps={frame.fps}
      loop={frame.loop}
      paused={paused}
      onFinish={onFinish}
      height={size}
      label={label || frame.label}
    />
  );
}
