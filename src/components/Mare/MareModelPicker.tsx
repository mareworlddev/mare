"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useTime, useTransform } from "motion/react";
import { Check, ChevronDown, ChevronRight, RotateCcw, Zap } from "lucide-react";

export type ModelOption = { id: string; name: string; note: string };

export const effortLevels = ["Minimal", "Low", "Medium", "High", "Extra high", "Ultra"] as const;
export type EffortLevel = (typeof effortLevels)[number];

type EffortPickerProps = {
  models: ModelOption[];
  model: string;
  onModelChange: (id: string) => void;
  effort: EffortLevel;
  onEffortChange: (effort: EffortLevel) => void;
  fast: boolean;
  onFastChange: (fast: boolean) => void;
  defaultEffort?: EffortLevel;
};

type View = "closed" | "effort" | "models";

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;
const morph = { type: "spring", stiffness: 420, damping: 36 } as const;
const KNOB = 30;
const PAD = 5;

// Bolhas que atravessam o preenchimento no modo rápido: [altura %, tamanho px, segundos por travessia, início 0-1].
const bubbles: [number, number, number, number][] = [
  [28, 3, 2.6, 0.05], [64, 2, 3.4, 0.4], [44, 3, 2.9, 0.75], [74, 2, 2.4, 0.2], [34, 2, 3.8, 0.6],
  [56, 3, 3.1, 0.9], [22, 2, 2.7, 0.3], [70, 3, 3.6, 0.1], [48, 2, 2.3, 0.5], [38, 3, 3.3, 0.85],
  [60, 2, 2.8, 0.65], [30, 2, 3.5, 0.15],
];

function levelIndex(level: EffortLevel) {
  return effortLevels.indexOf(level);
}

// Uma bolha atravessando o preenchimento num relógio compartilhado, para não reiniciar quando o preenchimento muda.
function Bubble({ y, size, duration, offset, span, still }: { y: number; size: number; duration: number; offset: number; span: number; still: boolean }) {
  const time = useTime();
  const spanRef = useRef(span);
  spanRef.current = span;
  const progress = useTransform(time, (t) => (still ? offset : (t / 1000 / duration + offset) % 1));
  const x = useTransform(progress, (p) => -8 + p * (spanRef.current + 16));
  const opacity = useTransform(progress, (p) => (still ? 0.6 : p < 0.15 ? (p / 0.15) * 0.95 : p > 0.8 ? ((1 - p) / 0.2) * 0.95 : 0.95));
  return (
    <motion.span
      className="absolute left-0 rounded-full bg-white"
      style={{ top: y + "%", width: size, height: size, x, opacity }}
    />
  );
}

function EffortSlider({ effort, onEffortChange, fast }: { effort: EffortLevel; onEffortChange: (e: EffortLevel) => void; fast: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reduce = useReducedMotion();
  const index = levelIndex(effort);
  const steps = effortLevels.length - 1;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const travel = Math.max(width - KNOB - PAD * 2, 0);
  const knobX = PAD + (travel * index) / steps;
  const fillWidth = knobX + KNOB + PAD;
  const stopX = (i: number) => PAD + KNOB / 2 + (travel * i) / steps;

  function pick(clientX: number) {
    const el = track.current;
    if (!el || travel === 0) return;
    const x = clientX - el.getBoundingClientRect().left - PAD - KNOB / 2;
    const next = Math.round(Math.min(Math.max(x / travel, 0), 1) * steps);
    if (effortLevels[next] !== effort) onEffortChange(effortLevels[next]);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pick(event.clientX);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let next = index;
    if (event.key in moves) next = index + moves[event.key];
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps;
    else return;
    event.preventDefault();
    onEffortChange(effortLevels[Math.min(Math.max(next, 0), steps)]);
  }

  const ultra = index === steps;
  // Mais esforço: mais bolhas, um pouco mais rápidas.
  const bubbleCount = 4 + index * 2;
  const speed = 1 - index * 0.08;

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label="Esforço de raciocínio"
      aria-valuemin={0}
      aria-valuemax={steps}
      aria-valuenow={index}
      aria-valuetext={effort}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event.clientX);
      }}
      onKeyDown={onKeyDown}
      className="relative h-10 w-full cursor-pointer touch-none select-none rounded-full bg-mare-soft outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40"
    >
      {/* Preenchimento, da borda esquerda até o botão */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
        initial={false}
        animate={{ width: fillWidth }}
        transition={spring}
        style={{
          background: ultra
            ? "linear-gradient(90deg,#000e54 0%,#0553af 55%,#7aa2e3 100%)"
            : "linear-gradient(90deg,#000e54,#0553af)",
        }}
      >
        {fast && width > 0 && (
          <div className="absolute inset-0">
            {bubbles.slice(0, bubbleCount).map(([y, size, seconds, offset], i) => (
              <Bubble key={i} y={y} size={size} duration={seconds * speed} offset={offset} span={fillWidth} still={!!reduce} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Marcas. Sem modo rápido aparecem por cima do preenchimento também. */}
      {effortLevels.map((level, i) => {
        const inFill = i <= index;
        if (inFill && fast) return null;
        return (
          <span
            key={level}
            aria-hidden
            className={
              "pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors " +
              (inFill ? "bg-white/60" : "bg-mare-navy/20")
            }
            style={{ left: stopX(i) }}
          />
        );
      })}

      {/* Botão */}
      <motion.span
        aria-hidden
        className="absolute top-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,14,84,0.35),0_0_0_1px_rgba(0,14,84,0.08)]"
        style={{ width: KNOB, height: KNOB, marginTop: -KNOB / 2 }}
        initial={false}
        animate={{ x: knobX }}
        transition={spring}
      />
    </div>
  );
}

export function EffortPicker({
  models,
  model,
  onModelChange,
  effort,
  onEffortChange,
  fast,
  onFastChange,
  defaultEffort = "Medium",
}: EffortPickerProps) {
  const [view, setView] = useState<View>("closed");
  const [tip, setTip] = useState<{ id: string; top: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === model) ?? models[0];
  const index = levelIndex(effort);
  // Telas estreitas: mantém o popover dentro do [data-popover-bounds] mais próximo (ou da viewport).
  const [fit, setFit] = useState({ max: Infinity, shift: 0 });
  const want = view === "effort" ? 280 : 250;

  useLayoutEffect(() => {
    if (view === "closed") return;
    function measure() {
      const el = root.current;
      if (!el) return;
      const host = el.closest("[data-popover-bounds]");
      const b = host ? host.getBoundingClientRect() : { left: 8, width: window.innerWidth - 16 };
      const r = el.getBoundingClientRect();
      const width = Math.min(want, b.width);
      setFit({ max: b.width, shift: Math.max(0, b.left - (r.right - width)) });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, want]);

  useEffect(() => {
    if (view === "closed") return;
    function onDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setView("closed");
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setView("closed");
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [view]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={view !== "closed"}
        onClick={() => setView((v) => (v === "closed" ? "effort" : "closed"))}
        className="flex h-9 min-w-[150px] items-center justify-center gap-1.5 rounded-full bg-mare-soft px-3.5 font-ui text-[13.5px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-[#dce9ff]"
      >
        {view === "effort" ? (
          <span className="text-mare-muted">Escolher esforço</span>
        ) : (
          <>
            {fast && <Zap className="size-3.5 fill-current text-mare-blue" />}
            <span className="font-medium text-mare-navy">{current.name}</span>
            <span className={index >= 3 ? "font-medium text-mare-blue" : "text-mare-muted"}>{effort}</span>
          </>
        )}
        <ChevronDown className="size-3.5 text-mare-muted" />
      </button>

      <AnimatePresence>
        {view !== "closed" && (
          /* Um popover que muda de forma entre esforço e modelos. */
          <motion.div
            layout
            key="popover"
            role="dialog"
            aria-label={view === "effort" ? "Esforço de raciocínio" : "Escolher modelo"}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ layout: morph, default: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
            style={{ width: Math.min(want, fit.max), right: -fit.shift }}
            className="absolute bottom-full right-0 z-20 mb-2 origin-bottom-right rounded-[20px] border border-mare-line bg-white shadow-[0_18px_44px_-16px_rgba(0,14,84,0.45)]"
          >
            <div className="relative overflow-hidden rounded-[19px]">
            <AnimatePresence mode="popLayout" initial={false}>
              {view === "effort" ? (
                <motion.div
                  key="effort"
                  layout="position"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.18 }}
                  className="p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      aria-pressed={fast}
                      aria-label="Modo rápido"
                      title={fast ? "Modo rápido ligado" : "Modo rápido desligado"}
                      onClick={() => onFastChange(!fast)}
                      className={
                        "grid size-7 shrink-0 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-soft " +
                        (fast ? "text-mare-blue" : "text-mare-muted")
                      }
                    >
                      <motion.span
                        key={String(fast)}
                        initial={{ scale: 0.6, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={spring}
                        className="grid place-items-center"
                      >
                        <Zap className={"size-4 " + (fast ? "fill-current" : "")} />
                      </motion.span>
                    </button>

                    <div className="flex min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setView("models")}
                      aria-label={`${effort} de esforço em ${current.name}. Trocar modelo`}
                      className="group flex min-w-0 flex-col items-center rounded-lg px-2.5 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-soft"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={effort}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16 }}
                          className="block text-[15px] font-semibold text-mare-navy"
                          aria-live="polite"
                        >
                          {effort}
                        </motion.span>
                      </AnimatePresence>
                      <span className="mt-0.5 inline-flex items-center gap-0.5 font-ui text-[12.5px] text-mare-muted transition group-hover:text-mare-navy">
                        {current.name}
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                    </div>

                    <button
                      type="button"
                      aria-label={"Volta para " + defaultEffort}
                      onClick={() => onEffortChange(defaultEffort)}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-mare-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-soft hover:text-mare-navy"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <EffortSlider effort={effort} onEffortChange={onEffortChange} fast={fast} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="models"
                  layout="position"
                  role="listbox"
                  aria-label="Escolher modelo"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.18 }}
                  className="relative p-1.5"
                  onMouseLeave={() => setTip(null)}
                >
                  <p className="px-2.5 pb-1.5 pt-1.5 font-ui text-[12.5px] text-mare-muted">Escolher modelo</p>
                  {models.map((m, i) => {
                    const selected = m.id === model;
                    const isDefault = i === 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={(event) => setTip({ id: m.id, top: event.currentTarget.offsetTop + event.currentTarget.offsetHeight / 2 })}
                        onFocus={(event) => setTip({ id: m.id, top: event.currentTarget.offsetTop + event.currentTarget.offsetHeight / 2 })}
                        onBlur={() => setTip(null)}
                        onClick={() => {
                          onModelChange(m.id);
                          setView("effort");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left font-ui transition focus-visible:outline-none focus-visible:bg-mare-soft hover:bg-mare-soft"
                      >
                        <span className="min-w-0">
                          <span className="block text-[13.5px] text-mare-navy">{m.name}</span>
                          {isDefault && <span className="block text-[12px] text-mare-muted">{m.note}</span>}
                        </span>
                        {selected && <Check className="size-4 shrink-0 text-mare-blue" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            {/* Notas dos modelos ficam ao lado da lista, fora da área recortada. */}
            <AnimatePresence>
              {view === "models" && tip && tip.id !== models[0].id && (
                <motion.span
                  key={tip.id}
                  role="tooltip"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.14 }}
                  style={{ top: tip.top }}
                  className="pointer-events-none absolute left-full z-30 ml-3 hidden w-max max-w-[220px] -translate-y-1/2 rounded-lg border border-mare-line bg-white px-2.5 py-1.5 font-ui text-[12.5px] text-mare-ink shadow-[0_8px_24px_-12px_rgba(0,14,84,0.4)] sm:block"
                >
                  {models.find((m) => m.id === tip.id)?.note}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
