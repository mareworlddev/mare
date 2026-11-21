'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Folha da montaria: 32 colunas (8 direções × 4 quadros) por 3 linhas. */
const RIDER_SHEET = '/mare/opt/playground-mare.png';
/** Tileset do campo: 8 colunas por 6 linhas, cada célula com fundo transparente. */
const TILE_SHEET = '/mare/ambiente-playgorund.png';

const TILE_COLS = 8;
const TILE_ROWS = 6;
const FIELD_COLS = 14;
const FIELD_ROWS = 10;

/**
 * Chão em blocos pequenos: campo de grama com pedras, terra e cascalho
 * espalhados, e o riacho correndo nas duas últimas colunas.
 */
function buildGround() {
  const tiles: number[] = [];
  for (let row = 0; row < FIELD_ROWS; row += 1) {
    const water = row === 0 ? 8 : row === FIELD_ROWS - 1 ? 15 : 10;
    for (let col = 0; col < FIELD_COLS; col += 1) {
      if (col >= FIELD_COLS - 2) {
        tiles.push(water);
        continue;
      }
      const sprinkle = (row * 5 + col * 3) % 17;
      tiles.push(sprinkle === 0 ? 5 : sprinkle === 2 ? 4 : sprinkle === 7 ? 6 : 0);
    }
  }
  return tiles;
}

const GROUND = buildGround();

/** Enfeites por cima do chão, em % do campo. */
const PROPS = [
  { tile: 32, x: 4, y: 6, size: 11 },
  { tile: 33, x: 58, y: 3, size: 10 },
  { tile: 26, x: 26, y: 76, size: 7 },
  { tile: 19, x: 42, y: 63, size: 8 },
  { tile: 40, x: 2, y: 80, size: 9 },
  { tile: 36, x: 66, y: 82, size: 7 },
  { tile: 47, x: 74, y: 30, size: 8 },
];

/** Bloco de 4 colunas de cada direção, na ordem da folha. */
function directionBlock(dx: number, dy: number): number | null {
  if (!dx && !dy) return null;
  if (!dx) return dy > 0 ? 0 : 1;
  if (!dy) return dx < 0 ? 2 : 3;
  if (dx > 0) return dy < 0 ? 4 : 5;
  return dy < 0 ? 6 : 7;
}

function tilePosition(index: number) {
  const col = index % TILE_COLS;
  const row = Math.floor(index / TILE_COLS);
  return `${(col / (TILE_COLS - 1)) * 100}% ${(row / (TILE_ROWS - 1)) * 100}%`;
}

/**
 * Playground: a Mare montada passeia pelo campo com as setas ou WASD
 * (Shift galopa). Quadro escolhido por direção × estado, animado por rAF.
 */
export function MarePlayground({ onClose }: { onClose: () => void }) {
  const riderRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // O foco sai do campo de mensagem: as setas e o WASD são do jogo.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  useEffect(() => {
    const rider = riderRef.current;
    if (!rider) return;

    const keys = new Set<string>();
    let x = 46;
    let y = 58;
    let block = 0;
    let row = 0;
    let frameTime = 0;
    let last = performance.now();
    let raf = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      const key = event.key.toLowerCase();
      if (key.startsWith('arrow') || key === ' ') event.preventDefault();
      keys.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let dx = 0;
      let dy = 0;
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup') || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) dy += 1;

      const moving = dx !== 0 || dy !== 0;
      const galloping = moving && keys.has('shift');
      const nextRow = moving ? (galloping ? 2 : 1) : 0;

      if (moving) {
        const length = Math.hypot(dx, dy);
        const speed = galloping ? 34 : 15; // % do campo por segundo
        x = Math.min(94, Math.max(6, x + (dx / length) * speed * dt));
        y = Math.min(90, Math.max(14, y + (dy / length) * speed * dt));
        block = directionBlock(dx, dy) ?? block;
      }

      if (nextRow !== row) {
        row = nextRow;
        frameTime = 0;
      }
      frameTime += dt;
      const fps = row === 2 ? 12 : row === 1 ? 8 : 4;
      const frame = Math.floor(frameTime * fps) % 4;

      rider.style.left = `${x}%`;
      rider.style.top = `${y}%`;
      rider.style.backgroundPosition = `${((block * 4 + frame) / 31) * 100}% ${(row / 2) * 100}%`;

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div className="mare-playground" role="presentation" onClick={onClose}>
      <div
        className="mare-playground-card"
        role="dialog"
        aria-modal="true"
        aria-label="Playground da Mare"
        tabIndex={-1}
        ref={cardRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mare-playground-head">
          <div>
            <h2>Playground</h2>
            <p>Setas ou WASD para andar · Shift para galopar</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar playground">
            <X size={16} />
          </button>
        </div>

        <div className="mare-playground-field">
          {GROUND.map((tile, index) => (
            <span
              key={`ground-${index}`}
              className="mare-playground-tile"
              style={{
                left: `${(index % FIELD_COLS) * (100 / FIELD_COLS)}%`,
                top: `${Math.floor(index / FIELD_COLS) * (100 / FIELD_ROWS)}%`,
                width: `calc(${100 / FIELD_COLS}% + 1px)`,
                height: `calc(${100 / FIELD_ROWS}% + 1px)`,
                backgroundImage: `url('${TILE_SHEET}')`,
                backgroundPosition: tilePosition(tile),
              }}
            />
          ))}

          {PROPS.map((prop, index) => (
            <span
              key={`prop-${index}`}
              className="mare-playground-prop"
              style={{
                left: `${prop.x}%`,
                top: `${prop.y}%`,
                width: `${prop.size}%`,
                backgroundImage: `url('${TILE_SHEET}')`,
                backgroundPosition: tilePosition(prop.tile),
              }}
            />
          ))}

          <span
            ref={riderRef}
            className="mare-playground-rider"
            style={{ backgroundImage: `url('${RIDER_SHEET}')`, backgroundPosition: '0% 0%' }}
          />
        </div>
      </div>
    </div>
  );
}

export default MarePlayground;
