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
const GUSTS = [0, 1, 2, 3];
const RAYS = [0, 1, 2];

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
        ? GUSTS.map((index) => (
            <span key={index} className="mare-weather-gust" style={{ '--i': index } as CSSProperties} />
          ))
        : null}
      {kind === 'sun' ? (
        <>
          <span className="mare-weather-glow" />
          {RAYS.map((index) => (
            <span key={index} className="mare-weather-ray" style={{ '--i': index } as CSSProperties} />
          ))}
        </>
      ) : null}
    </div>
  );
}

export default MareWeather;
