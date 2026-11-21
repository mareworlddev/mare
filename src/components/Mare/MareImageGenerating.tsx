'use client';

import { DitherField } from '@/components/ui/dither-field';

/**
 * Cartão de geração de imagem: o DitherField em variação de card
 * (padrão do próprio componente), com o pedido no pé para o usuário
 * saber o que está sendo desenhado.
 */
export function MareImageGenerating({ prompt }: { prompt?: string }) {
  return (
    <DitherField
      pattern="glow"
      color={['#dce9ff', '#87aeea', '#0553af']}
      intensity={0.6}
      speed={0.6}
      fps={30}
      className="relative flex h-40 w-full flex-col justify-end overflow-hidden rounded-xl border border-mare-line bg-white p-4 select-none"
    >
      {/* Some com os pontos atrás do texto, como no card do DitherField. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white to-transparent" />
      <p className="relative text-[13px] font-semibold text-mare-navy">Gerando imagem…</p>
      <p className="relative mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-mare-muted">
        {prompt || 'Compondo a cena'}
      </p>
    </DitherField>
  );
}
