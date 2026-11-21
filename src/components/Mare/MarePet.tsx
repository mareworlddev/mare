import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedPetSprite, PetSprite, watchColumn } from './MareSprite';
import { MARE_CHAT_ROWS, MARE_FEED_SHEETS, MARE_OUTROS_ROWS, MARE_WATCH_COLUMNS } from '@/lib/mare/constants';
import type { MareFeedKind } from '@/lib/mare/types';

type MarePetProps = {
  active: boolean;
  paused?: boolean;
  celebrateKey: number;
  onFeed?: (kind: MareFeedKind) => void;
  onRear?: () => void;
};

const WATCH_HEIGHT = 92;
/** Altura do quadro do tufo de grama; como o quadro é 1:2, a largura fica na metade. */
const SCENERY_HEIGHT = 220;
const DRAG_THRESHOLD = 5;

const TREATS: Array<{ kind: MareFeedKind; src: string; alt: string }> = [
  { kind: 'eat', src: '/mare/opt/maca.png', alt: 'Maçã para a Mare' },
  { kind: 'drink', src: '/mare/opt/agua.png', alt: 'Água para a Mare' },
];

/**
 * A Mare da conversa. Parada, ela olha para o mouse; gerando, ela corre
 * (folha 6×6); ao terminar, dorme com "Z" voando e acorda no primeiro
 * toque/tecla. Maçã e água se arrastam até ela — durante a geração nada
 * acontece. O conjunto inteiro se arrasta com o ponteiro para qualquer
 * canto da tela; dois cliques na Mare fazem ela voltar à sidebar.
 */
export function MarePet({ active, paused = false, celebrateKey, onFeed, onRear }: MarePetProps) {
  const [column, setColumn] = useState(-1);
  const [feed, setFeed] = useState<{ kind: MareFeedKind; key: number } | null>(null);
  const [rearKey, setRearKey] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedTreat, setSelectedTreat] = useState<MareFeedKind | null>(null);
  const [treatDrag, setTreatDrag] = useState<{ kind: MareFeedKind; x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const dockRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const suppressTreatClickRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; w: number; h: number; moved: boolean } | null>(null);
  const seenCelebrateRef = useRef(celebrateKey);
  const feedGuardRef = useRef(false);
  const busy = active || paused;

  // --- Acordar / dormir -------------------------------------------------
  useEffect(() => {
    if (celebrateKey !== seenCelebrateRef.current) {
      seenCelebrateRef.current = celebrateKey;
      if (celebrateKey > 0) setSleeping(true);
    }
  }, [celebrateKey]);

  useEffect(() => {
    if (!sleeping || active) return;
    const wake = () => setSleeping(false);
    const timer = window.setTimeout(wake, 20000);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [sleeping, active]);

  // --- Olhar para o mouse (só parada e acordada) ------------------------
  useEffect(() => {
    if (active || sleeping || feed || rearKey > 0) return;
    let raf = 0;
    let lastX = -1;
    let lastY = -1;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = dockRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        if (dx === lastX && dy === lastY) return;
        lastX = dx;
        lastY = dy;
        setColumn((current) => {
          const next = watchColumn(dx, dy);
          return next === current ? current : next;
        });
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [active, sleeping, feed, rearKey]);

  // --- Alimentar --------------------------------------------------------
  const startFeed = useCallback(
    (kind: MareFeedKind) => {
      if (busy || feedGuardRef.current) return;
      if (feed?.kind === kind) return;
      feedGuardRef.current = true;
      setSelectedTreat(null);
      setSleeping(false);
      setFeed({ kind, key: Date.now() });
      onFeed?.(kind);
    },
    [busy, feed, onFeed]
  );

  /**
   * Arrasto da maçã/água com ponteiro: sem drag nativo, o cursor nunca vira
   * "bloqueado" no meio da tela. Soltar sobre a Mare alimenta; soltar fora
   * apenas seleciona a guloseima.
   */
  const startTreatDrag = (kind: MareFeedKind, event: React.PointerEvent<HTMLButtonElement>) => {
    if (busy) return;
    const insideStage = (x: number, y: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return false;
      return x >= rect.left - 24 && x <= rect.right + 24 && y >= rect.top - 24 && y <= rect.bottom + 24;
    };
    const originX = event.clientX;
    const originY = event.clientY;
    let moved = false;

    const onMove = (moveEvent: PointerEvent) => {
      if (!moved && Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) < 4) return;
      moved = true;
      setTreatDrag({ kind, x: moveEvent.clientX, y: moveEvent.clientY });
      setDragOver(insideStage(moveEvent.clientX, moveEvent.clientY));
    };
    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setTreatDrag(null);
      setDragOver(false);
      if (!moved) return;
      suppressTreatClickRef.current = true;
      if (insideStage(upEvent.clientX, upEvent.clientY)) startFeed(kind);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // --- Arrastar o conjunto pela tela ----------------------------------
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, origX: rect.left, origY: rect.top, w: rect.width, h: rect.height, moved: false };
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true;
        suppressClickRef.current = true;
        setDragging(true);
      }
      const x = Math.min(Math.max(8, drag.origX + dx), Math.max(8, window.innerWidth - drag.w - 8));
      const y = Math.min(Math.max(8, drag.origY + dy), Math.max(8, window.innerHeight - drag.h - 8));
      setPos({ x, y });
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const onDropClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (busy) return;
    if (selectedTreat) {
      startFeed(selectedTreat);
      return;
    }
    if (sleeping) {
      setSleeping(false);
      return;
    }
    if (feed) return;

    // Fora da barra, esperar o segundo clique: um empina, dois voltam.
    if (pos) {
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        setPos(null);
        setRearKey(0);
        return;
      }
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        setRearKey((key) => key + 1);
        onRear?.();
      }, 260);
      return;
    }

    setRearKey((key) => key + 1);
    onRear?.();
  };

  // Nada pendente pode sobreviver ao desmonte.
  useEffect(
    () => () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    },
    []
  );

  // Enquanto a guloseima está no ar, nada mostra cursor de "proibido".
  useEffect(() => {
    if (!treatDrag) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.cursor = previous;
    };
  }, [treatDrag]);

  // --- O que desenhar ---------------------------------------------------
  const row = MARE_CHAT_ROWS.run;
  const sleepRow = MARE_OUTROS_ROWS[4];
  const feedSheet = feed ? MARE_FEED_SHEETS[feed.kind] : undefined;
  const directionLabel = column >= 0 ? MARE_WATCH_COLUMNS[column] : 'em frente';

  const renderSprite = () => {
    if (feed && feedSheet) {
      return (
        <AnimatedPetSprite
          key={`feed-${feed.key}`}
          sheet={feed.kind}
          row={0}
          frames={feedSheet.frames}
          fps={feedSheet.fps}
          loop={2}
          paused={paused}
          height={WATCH_HEIGHT}
          onFinish={() => {
            setFeed(null);
            feedGuardRef.current = false;
          }}
          label={feed.kind === 'eat' ? 'Mare comendo maçã' : 'Mare bebendo água'}
        />
      );
    }
    if (rearKey > 0) {
      return (
        <AnimatedPetSprite
          key={`rear-${rearKey}`}
          sheet="chat"
          row={MARE_CHAT_ROWS.rear.row}
          frames={MARE_CHAT_ROWS.rear.frames}
          fps={MARE_CHAT_ROWS.rear.fps}
          loop={2}
          height={WATCH_HEIGHT}
          onFinish={() => setRearKey(0)}
          label="Mare empinando"
        />
      );
    }
    if (active) {
      return (
        <AnimatedPetSprite
          sheet="chat"
          row={row.row}
          frames={row.frames}
          fps={row.fps}
          height={WATCH_HEIGHT}
          label="Mare correndo enquanto gera a resposta"
        />
      );
    }
    if (sleeping) {
      return (
        <AnimatedPetSprite
          sheet="outros"
          row={sleepRow.row}
          frames={sleepRow.frames}
          fps={sleepRow.fps}
          height={WATCH_HEIGHT}
          label="Mare dormindo depois de responder"
        />
      );
    }
    return (
      <PetSprite
        sheet="watch"
        column={column >= 0 ? column : 1}
        height={WATCH_HEIGHT}
        label={`Mare olha ${directionLabel}`}
      />
    );
  };

  const ariaLabel = useMemo(() => {
    if (feed) return feed.kind === 'eat' ? 'Mare comendo maçã' : 'Mare bebendo água';
    if (active) return 'Mare correndo enquanto gera a resposta';
    if (sleeping) return 'Mare dormindo. Clique para acordar.';
    return pos
      ? `Mare olha ${directionLabel}. Clique para ela empinar, dois cliques voltam para a barra lateral.`
      : `Mare olha ${directionLabel}. Clique para ela empinar.`;
  }, [feed, active, sleeping, directionLabel, pos]);

  const dock = (
    <div
      ref={dockRef}
      className={`mare-pet-dock${pos ? ' is-floating' : ''}${dragging ? ' is-dragging' : ''}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="mare-pet-treats">
        {TREATS.map((treat) => (
          <button
            key={treat.kind}
            type="button"
            className={`mare-pet-treat${selectedTreat === treat.kind ? ' is-selected' : ''}${busy ? ' is-muted' : ''}`}
            aria-pressed={selectedTreat === treat.kind}
            aria-disabled={busy}
            title={busy ? 'A Mare está gerando; ela não come agora' : `${treat.alt} — arraste até a Mare ou clique e depois clique na Mare`}
            onPointerDown={(event) => startTreatDrag(treat.kind, event)}
            onClick={() => {
              if (suppressTreatClickRef.current) {
                suppressTreatClickRef.current = false;
                return;
              }
              if (busy) return;
              setSelectedTreat((current) => (current === treat.kind ? null : treat.kind));
            }}
          >
            <img src={treat.src} alt="" draggable={false} />
          </button>
        ))}
      </div>

      <div className="mare-pet-stage" ref={stageRef}>
        {/* Chão da cena: o tufo de grama balança atrás da Mare, dentro da sidebar.
            Solta pela tela, ela viaja sozinha — a grama fica no lugar dela. */}
        {pos ? null : (
          <div className="mare-pet-scene" aria-hidden="true">
            <AnimatedPetSprite sheet="scenery" row={0} frames={8} fps={5} paused={paused} height={SCENERY_HEIGHT} />
          </div>
        )}
        <button
          type="button"
          className={`mare-pet-drop${dragOver ? ' is-over' : ''}`}
          aria-label={ariaLabel}
          title={pos ? 'Arraste para mover · dois cliques voltam à barra' : 'Arraste a Mare para mover pela tela'}
          onPointerDown={onPointerDown}
          onClick={onDropClick}
        >
          {renderSprite()}
        </button>
        {sleeping && !active && (
          <span className="mare-pet-zzz" aria-hidden="true">
            <span>Z</span>
            <span>Z</span>
            <span>Z</span>
          </span>
        )}
      </div>

      {treatDrag ? (
        <img
          className="mare-pet-treat-ghost"
          src={TREATS.find((treat) => treat.kind === treatDrag.kind)?.src}
          alt=""
          aria-hidden="true"
          style={{ left: treatDrag.x, top: treatDrag.y }}
        />
      ) : null}

      <p className="mare-pet-hint">
        {selectedTreat
          ? 'Agora clique na Mare para dar a ela'
          : pos
            ? 'Arraste a Mare para mover · dois cliques voltam à barra'
            : 'Arraste a maçã ou a água até a Mare'}
      </p>
    </div>
  );

  // Solto pela tela, o pet sai da sidebar: preso nela, ficava abaixo do chat
  // (mesmo z-index, pintado depois) e não aceitava mais o segundo arrasto.
  return pos ? createPortal(dock, document.body) : dock;
}
