"use client";

/**
 * RangeSlider — визуальный двойной слайдер для выбора диапазона.
 * Показывает два ползунка (start/end) на треке, раскрашивает выбранный диапазон.
 *
 * Props:
 *   min, max      — границы (в секундах)
 *   startValue    — текущее значение левого ползунка (сек)
 *   endValue      — текущее значение правого ползунка (сек)
 *   onChange      — (start, end) => void
 */

import { useRef, useCallback, useEffect, useState } from "react";

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RangeSlider({ min = 0, max, startValue, endValue, onChange }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null); // "start" | "end" | null
  const [dragging, setDragging] = useState(null);

  const startPct = max > 0 ? ((startValue - min) / (max - min)) * 100 : 0;
  const endPct   = max > 0 ? ((endValue   - min) / (max - min)) * 100 : 100;

  // Конвертация clientX в секунды
  const clientXToSec = useCallback((clientX) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + pct * (max - min));
  }, [min, max]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const sec = clientXToSec(e.clientX);
    if (draggingRef.current === "start") {
      onChange(Math.min(sec, endValue - 1), endValue);
    } else {
      onChange(startValue, Math.max(sec, startValue + 1));
    }
  }, [clientXToSec, onChange, startValue, endValue]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = null;
    setDragging(null);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startDrag = useCallback((which, e) => {
    e.preventDefault();
    draggingRef.current = which;
    setDragging(which);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, [onPointerMove, onPointerUp]);

  // Клик по треку — двигаем ближайший маркер
  const onTrackClick = useCallback((e) => {
    if (e.target.closest("[data-thumb]")) return;
    const sec = clientXToSec(e.clientX);
    const distStart = Math.abs(sec - startValue);
    const distEnd   = Math.abs(sec - endValue);
    if (distStart <= distEnd) {
      onChange(Math.min(sec, endValue - 1), endValue);
    } else {
      onChange(startValue, Math.max(sec, startValue + 1));
    }
  }, [clientXToSec, onChange, startValue, endValue]);

  // Очистка на размонтировании
  useEffect(() => () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove, onPointerUp]);

  return (
    <div className="relative select-none">
      {/* Трек */}
      <div
        ref={trackRef}
        onClick={onTrackClick}
        className="relative h-2 rounded-full bg-white/[0.08] cursor-pointer mx-2"
      >
        {/* Выбранный диапазон */}
        <div
          className="absolute top-0 h-full rounded-full bg-violet-500/70"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Маркер START */}
        <div
          data-thumb="start"
          onPointerDown={(e) => startDrag("start", e)}
          style={{ left: `${startPct}%` }}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transition-transform z-10 ${
            dragging === "start"
              ? "border-violet-300 bg-violet-400 scale-125"
              : "border-violet-400 bg-zinc-900 hover:scale-110"
          }`}
        >
          {/* Тултип над маркером */}
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[10px] font-mono text-violet-300 whitespace-nowrap pointer-events-none transition-opacity ${
            dragging === "start" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
            {formatTime(startValue)}
          </div>
        </div>

        {/* Маркер END */}
        <div
          data-thumb="end"
          onPointerDown={(e) => startDrag("end", e)}
          style={{ left: `${endPct}%` }}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transition-transform z-10 ${
            dragging === "end"
              ? "border-fuchsia-300 bg-fuchsia-400 scale-125"
              : "border-fuchsia-400 bg-zinc-900 hover:scale-110"
          }`}
        >
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[10px] font-mono text-fuchsia-300 whitespace-nowrap pointer-events-none transition-opacity ${
            dragging === "end" ? "opacity-100" : "opacity-0"
          }`}>
            {formatTime(endValue)}
          </div>
        </div>
      </div>

      {/* Подписи под треком */}
      <div className="flex justify-between mt-3 text-[10px] font-mono text-zinc-600 px-2">
        <span>{formatTime(min)}</span>
        <span className="text-violet-400/80 font-semibold">
          {formatTime(startValue)} — {formatTime(endValue)}
          <span className="text-zinc-600 font-normal ml-1">({formatTime(endValue - startValue)})</span>
        </span>
        <span>{formatTime(max)}</span>
      </div>
    </div>
  );
}
