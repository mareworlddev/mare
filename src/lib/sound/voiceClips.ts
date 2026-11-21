'use client';

/** Falas gravadas da Mare usadas na chegada e na apresentação. */
export const voiceClips = {
  /** A Mare chega na conversa. */
  mareArrives: '/sounds/a-mare-chegou.mp3',
  /** Apresentação da Mare. */
  mareIntro: '/sounds/ola-eu-sou-a-mare.mp3',
} as const;

export type VoiceClipName = keyof typeof voiceClips;

const cache = new Map<VoiceClipName, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;

/** Toca uma fala interrompendo a anterior; falhas de autoplay são silenciosas. */
export function playVoiceClip(name: VoiceClipName, volume = 0.7) {
  if (typeof window === 'undefined') return;

  try {
    let audio = cache.get(name);
    if (!audio) {
      audio = new Audio(voiceClips[name]);
      audio.preload = 'auto';
      cache.set(name, audio);
    }

    if (current && current !== audio) {
      try {
        current.pause();
      } catch {
        // ignora
      }
    }

    current = audio;
    try {
      audio.currentTime = 0;
    } catch {
      // Alguns navegadores só permitem seek depois do metadata.
    }
    audio.volume = Math.min(1, Math.max(0, volume));
    void audio.play().catch(() => undefined);
  } catch {
    // Áudio nunca deve interromper a interface.
  }
}
