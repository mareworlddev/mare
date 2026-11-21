import { DitherField } from '@/components/ui/dither-field';

/**
 * Fundo do workspace: só o campo de pontos do DitherField (@magicui/dither-field),
 * em cinza claro e branco, reagindo ao ponteiro sem competir com o texto.
 */
export function MareBackground() {
  return (
    <div className="mare-background" aria-hidden="true">
      <DitherField
        pattern="clouds"
        color={['#eef0f4', '#d4d8e0', '#a4abb9']}
        dotSize={2}
        intensity={0.32}
        speed={0.35}
        fps={24}
        className="h-full w-full"
      />
    </div>
  );
}

export default MareBackground;
