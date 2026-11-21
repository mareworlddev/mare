/**
 * Declaração mínima do pacote `howler`: só o que a camada de som da Mare usa.
 */
declare module 'howler' {
  export interface HowlOptions {
    src: string | string[];
    preload?: boolean;
    loop?: boolean;
    volume?: number;
    html5?: boolean;
    onload?: () => void;
    onloaderror?: (id: number, error: unknown) => void;
  }

  export class Howl {
    constructor(options: HowlOptions);
    play(id?: number): number;
    stop(id?: number): this;
    pause(id?: number): this;
    playing(id?: number): boolean;
    volume(volume?: number, id?: number): number | this;
    unload(): void;
  }

  export const Howler: {
    ctx?: AudioContext | null;
    volume?(value: number): number;
    mute?(value: boolean): boolean;
  };

  export default Howler;
}
