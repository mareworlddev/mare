'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MARE_CHAT_ROWS, MARE_OUTROS_ROWS, type MareSpriteRow } from '@/lib/mare/constants';
import { AnimatedPetSprite, PetSprite, watchColumn } from './MareSprite';

/** Mare que olha para o mouse de quem lê a página — o mesmo quadro do chat. */
export function WatchMare({ height = 150 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [column, setColumn] = useState(1);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const next = watchColumn(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
      if (next >= 0) setColumn((current) => (current === next ? current : next));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div ref={ref} className="landing-mare-stage">
      <PetSprite sheet="watch" column={column} height={height} label="Mare olhando para o mouse" />
    </div>
  );
}

/** Ciclo de linhas de uma folha, trocando a cada poucos segundos. */
export function CycleMare({
  rows,
  height = 120,
  intervalMs = 3400,
}: {
  rows: MareSpriteRow[];
  height?: number;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % rows.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [rows.length, intervalMs]);
  const row = rows[index] || rows[0];
  return (
    <div className="landing-mare-stage">
      <AnimatedPetSprite
        key={`${row.row}-${index}`}
        sheet={rows === MARE_OUTROS_ROWS ? 'outros' : 'chat'}
        row={row.row}
        frames={row.frames}
        fps={row.fps}
        loop={row.loop}
        height={height}
        label={row.label}
      />
    </div>
  );
}

export function ChatCycleMare({ height = 120 }: { height?: number }) {
  const rows = [MARE_CHAT_ROWS.look, MARE_CHAT_ROWS.walk, MARE_CHAT_ROWS.graze, MARE_CHAT_ROWS.run, MARE_CHAT_ROWS.lie];
  return <CycleMare rows={rows} height={height} />;
}

export function OutrosCycleMare({ height = 120 }: { height?: number }) {
  return <CycleMare rows={MARE_OUTROS_ROWS} height={height} />;
}
