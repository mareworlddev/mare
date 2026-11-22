'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import scene from '@/lib/mare/playground-scene.json';

/** Folha da Mare montada: 16 colunas (4 direções × 4 quadros) por 3 linhas. */
const RIDER_SHEET = '/mare/opt/playground-rider.png';
/** Enfeites recortados no conteúdo. */
const PROPS = '/mare/opt/playground-props';

const FIELD_W = scene.field.w;
const FIELD_H = scene.field.h;
const STEP_X = scene.tile.w / 2;
const STEP_Y = scene.tile.h / 2;
const ANCHOR_X = scene.tile.anchorX;
const ANCHOR_Y = scene.tile.anchorY;
const CELL = 64; // quadro da folha, em pixels do campo
const WALK = 95; // pixels do campo por segundo
const GALLOP = 200;

type Pose = { block: number; flip: boolean };

/**
 * Pose conforme a direção do movimento na tela. A folha tem quatro poses:
 * frente-esquerda (0), costas-direita (1), perfil-esquerda (2) e
 * perfil-direita (3); o espelho cobre frente-direita e costas-esquerda.
 */
function pose(dx: number, dy: number): Pose {
  if (dy > 0) return dx > 0 ? { block: 0, flip: true } : { block: 0, flip: false }; // SE / SW
  if (dy < 0) return dx < 0 ? { block: 1, flip: true } : { block: 1, flip: false }; // NW / NE
  return dx > 0 ? { block: 3, flip: false } : { block: 2, flip: false }; // L / O
}

/**
 * Playground: a Mare montada passeia pelo campo com as setas ou WASD
 * (Shift galopa). Ela anda nos eixos do terreno isométrico, a água bloqueia o
 * passo e a profundidade decide quem passa na frente de quem. O desenho é
 * animado por rAF, fora do React.
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
    // A Mare parte na estrada de terra, no meio do campo.
    let x = ANCHOR_X + STEP_X * (5 - 8);
    let y = ANCHOR_Y + STEP_Y * (5 + 8);
    let current: Pose = { block: 3, flip: false };
    let row = 0;
    let frameTime = 0;
    let last = performance.now();
    let raf = 0;

    /**
     * Célula isométrica de um ponto do campo. A grade é uma treliça de
     * losangos: o par (u, v) = ((x - anchorX) / stepX, (y - anchorY) / stepY)
     * só assume valores de paridade igual nos centros, entao o ponto é
     * testado contra o losango mais próximo.
     */
    const cellAt = (px: number, py: number) => {
      const u = (px - ANCHOR_X) / STEP_X;
      const v = (py - ANCHOR_Y) / STEP_Y;
      let cu = Math.round(u);
      let cv = Math.round(v);
      if (((cu - cv) & 1) !== 0) {
        const near = [
          [cu + 1, cv],
          [cu - 1, cv],
          [cu, cv + 1],
          [cu, cv - 1],
        ];
        let best = near[0];
        let bestDistance = Infinity;
        for (const [a, b] of near) {
          const distance = Math.abs(u - a) + Math.abs(v - b);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = [a, b];
          }
        }
        cu = best[0];
        cv = best[1];
      }
      return {
        c: Math.round((cu + cv) / 2),
        r: Math.round((cv - cu) / 2),
        inside: Math.abs(u - cu) + Math.abs(v - cv) <= 1,
      };
    };

    /** Dá para pisar nesse ponto? fora do campo ou na água, não. */
    const walkable = (px: number, py: number) => {
      const { c, r, inside } = cellAt(px, py);
      if (!inside) return false;
      if (c < 0 || r < 0 || c >= scene.cols || r >= scene.rows) return false;
      return scene.terrain[r][c] !== 'w';
    };

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

      // A Mare anda nos eixos do terreno isometrico: as setas seguem o
      // tabuleiro (norte e sul viram as diagonais da tela).
      const east = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      const south = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
      const moving = east !== 0 || south !== 0;
      const galloping = moving && keys.has('shift');
      const nextRow = moving ? (galloping ? 2 : 1) : 0;

      // Coluna sobe para a direita, linha sobe para a esquerda.
      const vx = STEP_X * (east - south);
      const vy = STEP_Y * (east + south);
      if (moving) {
        const length = Math.hypot(vx, vy) || 1;
        const speed = galloping ? GALLOP : WALK;
        const nx = x + (vx / length) * speed * dt;
        const ny = y + (vy / length) * speed * dt;
        // A agua trava o passo; quando da, a Mare escorrega pelo eixo livre.
        if (walkable(nx, ny)) {
          x = nx;
          y = ny;
        } else if (walkable(nx, y)) {
          x = nx;
        } else if (walkable(x, ny)) {
          y = ny;
        }
        current = pose(vx, vy);
      }

      if (nextRow !== row) {
        row = nextRow;
        frameTime = 0;
      }
      frameTime += dt;
      const fps = row === 2 ? 12 : row === 1 ? 8 : 4;
      const frame = Math.floor(frameTime * fps) % 4;

      rider.style.left = `${((x - CELL / 2) / FIELD_W) * 100}%`;
      rider.style.top = `${((y - CELL) / FIELD_H) * 100}%`;
      rider.style.zIndex = String(Math.round((y - ANCHOR_Y) / 2));
      rider.style.backgroundPosition = `${((current.block * 4 + frame) / 15) * 100}% ${(row / 2) * 100}%`;
      rider.style.transform = current.flip ? 'scaleX(-1)' : '';

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
          <img className="mare-playground-ground" src="/mare/opt/playground-ground.png" alt="" aria-hidden="true" />

          {scene.props.map((prop) => (
            <img
              key={prop.file}
              className="mare-playground-prop"
              src={`${PROPS}/${prop.file}`}
              alt=""
              aria-hidden="true"
              style={{
                left: `${((prop.x - prop.w / 2) / FIELD_W) * 100}%`,
                top: `${((prop.y - prop.h) / FIELD_H) * 100}%`,
                width: `${(prop.w / FIELD_W) * 100}%`,
                zIndex: prop.z,
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
