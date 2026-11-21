import { AnimatedPetSprite } from '@/components/Mare/MareSprite';
import { DitherField } from '@/components/ui/dither-field';
import { MARE_CHAT_ROWS } from '@/lib/mare/constants';

/** Transição entre telas: a Mare atravessa o carregamento correndo. */
export default function Loading() {
  return (
    <main className="mare-ws-shell mare-ws-loading" aria-busy="true" aria-label="Carregando a Mare">
      <div className="mare-ws-loader">
        <div className="mare-ws-loader-dither" aria-hidden="true">
          <DitherField
            pattern="waves"
            color={['#dce9ff', '#7fa8ea', '#0553af']}
            dotSize={2}
            intensity={0.5}
            speed={0.7}
            fps={24}
            interactive={false}
            className="h-full w-full"
          />
        </div>
        <AnimatedPetSprite
          sheet="chat"
          row={MARE_CHAT_ROWS.run.row}
          frames={MARE_CHAT_ROWS.run.frames}
          fps={MARE_CHAT_ROWS.run.fps}
          height={120}
          label="Mare correndo durante o carregamento"
        />
        <p>Abrindo a porteira...</p>
      </div>
    </main>
  );
}
