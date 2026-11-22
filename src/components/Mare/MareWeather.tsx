'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export type MareWeatherKind = 'wind' | 'rain' | 'sun';

const KINDS: MareWeatherKind[] = ['wind', 'rain', 'sun'];

/** Sorteado uma vez por visita e só no cliente, para não brigar com a hidratação. */
let picked: MareWeatherKind | null = null;
function pickWeather(): MareWeatherKind {
  if (!picked) picked = KINDS[Math.floor(Math.random() * KINDS.length)];
  return picked;
}

const DROPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Feixes de luz entrando da esquerda, inclinados para baixo/direita. */
const RAYS = [
  { top: 4, rot: 30, w: 26, h: 185, dur: 5.6, delay: -0.8 },
  { top: 30, rot: 34, w: 18, h: 155, dur: 6.4, delay: -2.6 },
  { top: 52, rot: 31, w: 22, h: 170, dur: 5.9, delay: -4.1 },
];

/** Rajadas curvas: cada linha tem desenho, espessura e ritmo próprios. */
const GUSTS = [
  { d: 'M2 22 C 24 12, 44 8, 60 14 C 70 18, 78 13, 74 6', top: 18, width: 88, dur: 3.2, sw: 2.6 },
  { d: 'M2 15 C 22 7, 52 21, 86 11', top: 44, width: 70, dur: 3.8, sw: 1.5 },
  { d: 'M4 18 C 18 8, 32 24, 48 16 C 60 10, 74 17, 88 10', top: 66, width: 80, dur: 3.5, sw: 2.1 },
  { d: 'M8 12 C 22 6, 34 16, 46 12 C 56 9, 62 16, 54 19 C 49 21, 47 15, 53 13', top: 30, width: 56, dur: 4.2, sw: 2.9 },
];

/**
 * Clima da cena ao redor da Mare na sidebar: vento, chuva ou sol, escolhido
 * uma vez por visita. Tudo em CSS, atrás/além dos cliques e pausável junto
 * com as animações.
 */
export function MareWeather({ paused = false }: { paused?: boolean }) {
  const [kind, setKind] = useState<MareWeatherKind | null>(null);

  useEffect(() => setKind(pickWeather()), []);

  if (!kind) return null;

  return (
    <div className={`mare-weather is-${kind}${paused ? ' is-paused' : ''}`} aria-hidden="true">
      {kind === 'rain'
        ? DROPS.map((index) => (
            <span key={index} className="mare-weather-drop" style={{ '--i': index } as CSSProperties} />
          ))
        : null}
      {kind === 'wind'
        ? GUSTS.map((gust, index) => (
            <svg
              key={index}
              className="mare-weather-gust"
              viewBox="0 0 90 30"
              style={{ '--i': index, '--top': `${gust.top}px`, '--w': `${gust.width}px`, '--dur': `${gust.dur}s`, '--sw': gust.sw } as CSSProperties}
            >
              <path d={gust.d} pathLength={1} />
            </svg>
          ))
        : null}
      {kind === 'sun' ? (
        <>
          <span className="mare-weather-glow" />
          {RAYS.map((ray) => (
            <span
              key={ray.top}
              className="mare-weather-ray"
              style={
                {
                  '--top': `${ray.top}px`,
                  '--rot': `${ray.rot}deg`,
                  '--w': `${ray.w}px`,
                  '--h': `${ray.h}px`,
                  '--dur': `${ray.dur}s`,
                  '--delay': `${ray.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

export default MareWeather;
