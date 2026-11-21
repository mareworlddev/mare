'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl, Howler } from 'howler';
import type { MareSettings } from '@/lib/mare/types';
import { playVoiceClip } from '@/lib/sound/voiceClips';

/**
 * Sons da Mare. Todos os efeitos vêm de `public/mare/mare-sounds/` e passam
 * por um único volume base (`EFFECT_VOLUME`), sempre multiplicado pelo
 * `effectsVolume` das preferências — nenhum efeito passa disso, para a
 * Mare nunca ficar alta demais.
 */
const AMBIENT_TRACKS = [
  '/mare/mare-sounds/ambiente/atmo-nature-forest-quiet-01.wav',
  '/mare/mare-sounds/ambiente/atmo-nature-forest-wind-light-birds-01.wav',
  '/mare/mare-sounds/ambiente/atmo-nature-park-bird-variety-01.wav',
  '/mare/mare-sounds/ambiente/atmo-nature-waterlogged-river-01.wav',
] as const;

/** Sorteados fora de qualquer momento específico: entrada, ferramenta, espera. */
const RANDOM_SRCS = [
  '/mare/mare-sounds/mare-aleatorio-01.wav',
  '/mare/mare-sounds/mare-aleatorio-02.wav',
  '/mare/mare-sounds/mare-bufando-01.wav',
  '/mare/mare-sounds/mare-bufando-02.wav',
] as const;

/** Resposta concluída (e a Mare empinando): o empinar do próprio acervo. */
const COMPLETION_SRC = '/mare/mare-sounds/mare-empinando.wav';
/** Erro de geração ou de ferramenta. */
const ERROR_SRC = '/mare/mare-sounds/mare-erro.wav';
/** Laço durante a geração: cascos correndo na terra. */
const RUNNING_SRC = '/mare/mare-sounds/mare-correndo-terra.wav';
/** Comer a maçã. */
const EAT_SRC = '/mare/mare-sounds/mare-comendo-maca-01.wav';
/** Beber a água. */
const DRINK_SRC = '/mare/mare-sounds/mare-bebendo-agua.mp3';

/** Volume máximo de qualquer efeito, antes do `effectsVolume` do usuário. */
const EFFECT_VOLUME = 0.42;

/**
 * Os arquivos originais têm picos em 1.0 mas RMS entre 0.32 e 0.46.
 * Cada ganho abaixo leva o efeito ao mesmo nível percebido.
 */
const GAIN = {
  random: 0.94,
  error: 1.3,
  running: 1,
  eat: 1.03,
  drink: 1,
  completion: 0.95,
} as const;
/** Ambiente fica bem abaixo disso: é clima, não protagonista. */
const AMBIENT_GAIN = 0.32;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

function resumeAudioContext() {
  try {
    const ctx = (Howler as any).ctx;
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void ctx.resume();
    }
  } catch {
    // Navegadores sem Web Audio seguem o caminho HTML5 do howler.
  }
}

/**
 * Um único Howl por arquivo, criado sob demanda. Substitui o `use-sound`, que
 * só entrega a instância no evento `load` e, com `preload: false`, nunca o
 * disparava — era por isso que nenhum efeito tocava.
 */
const cache = new Map<string, Howl>();

function soundFor(src: string, loop = false) {
  let sound = cache.get(src);
  if (!sound) {
    // Criado só no primeiro uso: carregar aqui já é lazy. html5 evita
    // decodificar o laço de 13 s inteiro na memória.
    sound = new Howl({ src: [src], preload: true, loop, volume: 0, html5: loop });
    cache.set(src, sound);
  }
  return sound;
}

function playFile(src: string, volume: number, loop = false) {
  try {
    const sound = soundFor(src, loop);
    sound.volume(clamp(volume));
    if (loop) {
      if (!sound.playing()) sound.play();
    } else {
      sound.stop();
      sound.play();
    }
  } catch {
    // Áudio nunca deve derrubar a conversa.
  }
}

export function useMareSounds(settings: MareSettings) {
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientStartedRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [audioReady, setAudioReady] = useState(false);
  const readyRef = useRef(false);


  const startAmbient = useCallback(() => {
    ambientStartedRef.current = true;
    const audio = ambientRef.current;
    if (!audio || !settingsRef.current.ambient) return;
    audio.volume = clamp(settingsRef.current.ambientVolume) * AMBIENT_GAIN;
    if (audio.paused) {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => undefined);
    }
  }, []);

  const stopAmbient = useCallback(() => {
    ambientStartedRef.current = false;
    ambientRef.current?.pause();
  }, []);

  // O contexto de audio do navegador só pode iniciar depois de um gesto do
  // usuario. Por isso liberamos os sons no primeiro clique/tecla da pagina.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      resumeAudioContext();
      if (readyRef.current) return;
      readyRef.current = true;
      setAudioReady(true);
      window.setTimeout(() => startAmbient(), 120);
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchend', 'keydown', 'click'];
    events.forEach((event) => window.addEventListener(event, unlock, { passive: true }));

    const activation = (navigator as any).userActivation;
    if (activation?.hasBeenActive) unlock();

    return () => {
      events.forEach((event) => window.removeEventListener(event, unlock));
    };
  }, [startAmbient]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Trilha de fundo sorteada a cada montagem do agente.
    const audio = new Audio(pick(AMBIENT_TRACKS));
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;
    ambientRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      ambientRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = ambientRef.current;
    if (!audio) return;
    audio.volume = settings.ambient ? clamp(settings.ambientVolume) * AMBIENT_GAIN : 0;
    if (!settings.ambient) {
      audio.pause();
      ambientStartedRef.current = false;
      return;
    }
    if (readyRef.current && audio.paused) {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => undefined);
    }
  }, [settings.ambient, settings.ambientVolume]);

  /** Volume padronizado de todos os efeitos: nunca mais que o teto daqui. */
  const effectVolume = useCallback(
    (gain = 1) => clamp(clamp(settingsRef.current.effectsVolume) * EFFECT_VOLUME * gain),
    []
  );

  const playCompletionSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(COMPLETION_SRC, effectVolume(GAIN.completion));
  }, [effectVolume]);

  const playRandomSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(pick(RANDOM_SRCS), effectVolume(GAIN.random));
  }, [effectVolume]);

  const playErrorSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(ERROR_SRC, effectVolume(GAIN.error));
  }, [effectVolume]);

  const playEatSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(EAT_SRC, effectVolume(GAIN.eat));
  }, [effectVolume]);

  const playDrinkSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(DRINK_SRC, effectVolume(GAIN.drink));
  }, [effectVolume]);

  const startRunningSound = useCallback(() => {
    if (!settingsRef.current.effects || !readyRef.current) return;
    resumeAudioContext();
    playFile(RUNNING_SRC, effectVolume(GAIN.running), true);
  }, [effectVolume]);

  const stopRunningSound = useCallback(() => {
    try {
      cache.get(RUNNING_SRC)?.stop();
    } catch {
      // ignora
    }
  }, []);

  // Para o laço de cascos em caso de troca de preferência no meio da geração.
  useEffect(() => {
    if (!settings.effects) stopRunningSound();
  }, [settings.effects, stopRunningSound]);

  // Sons aleatórios bem espaçados (2,5 a 5 min), como a Mare respirando no canto.
  useEffect(() => {
    if (!audioReady || !settings.effects) return;
    let alive = true;
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          if (!alive) return;
          const running = cache.get(RUNNING_SRC)?.playing() ?? false;
          if (!document.hidden && !running) playRandomSound();
          schedule();
        },
        150000 + Math.random() * 150000
      );
    };
    schedule();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [audioReady, playRandomSound, settings.effects]);

  const playIntro = useCallback(
    (variant: 'intro' | 'arrival' = 'intro') => {
      if (!settings.voice || !readyRef.current) return;
      // A voz tem o próprio volume; os efeitos não interferem nela.
      const base = variant === 'arrival' ? 0.7 : 0.8;
      playVoiceClip(variant === 'arrival' ? 'mareArrives' : 'mareIntro', clamp(settingsRef.current.voiceVolume) * base);
    },
    [settings.voice]
  );

  const enableAudio = useCallback(() => {
    resumeAudioContext();
    readyRef.current = true;
    setAudioReady(true);
    startAmbient();
  }, [startAmbient]);

  useEffect(
    () => () => {
      cache.forEach((sound) => {
        try {
          sound.stop();
          sound.unload();
        } catch {
          // ignora
        }
      });
      cache.clear();
    },
    []
  );

  return {
    audioReady,
    enableAudio,
    startAmbient,
    stopAmbient,
    playCompletionSound,
    /** Elogio usa o mesmo empinar de conclusão, no volume padrão. */
    playComplimentSound: playCompletionSound,
    /** Mantido para compatibilidade: envio usa um som aleatório. */
    playEntrySound: playRandomSound,
    /** Mantido para compatibilidade: chamada de ferramenta usa som aleatório. */
    playToolSound: playRandomSound,
    playRandomSound,
    playErrorSound,
    playEatSound,
    playDrinkSound,
    startRunningSound,
    stopRunningSound,
    playIntro,
  };
}
