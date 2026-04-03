"use client";

import { useState, useCallback } from "react";
import { Scissors } from "lucide-react";
import Card from "@/components/ui/Card";
import RangeSlider from "@/components/ui/RangeSlider";

// "1:30" или "0:45" или "1:02:30" → секунды
function parseTime(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

// секунды → "мм:сс" или "чч:мм:сс"
function formatTime(seconds) {
  if (seconds == null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RangePicker({ startTime, endTime, onChange, videoDuration }) {
  const [enabled, setEnabled] = useState(false);
  const [startRaw, setStartRaw] = useState("");
  const [endRaw, setEndRaw] = useState("");

  // Рабочие значения: если нет videoDuration — только текстовый ввод
  const hasVideo = videoDuration != null && videoDuration > 0;

  // Значения для слайдера (с defaults)
  const sliderStart = startTime ?? 0;
  const sliderEnd   = endTime ?? (videoDuration ?? 0);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      setStartRaw("");
      setEndRaw("");
      onChange(null, null);
    } else if (hasVideo) {
      // При включении инициализируем диапазон как весь ролик
      onChange(0, videoDuration);
      setStartRaw(formatTime(0));
      setEndRaw(formatTime(videoDuration));
    }
  };

  // Изменение через текстовые поля
  const handleStartChange = (val) => {
    setStartRaw(val);
    onChange(parseTime(val), endTime);
  };
  const handleEndChange = (val) => {
    setEndRaw(val);
    onChange(startTime, parseTime(val));
  };

  // Изменение через слайдер
  const handleSliderChange = useCallback((start, end) => {
    onChange(start, end);
    setStartRaw(formatTime(start));
    setEndRaw(formatTime(end));
  }, [onChange]);

  const hasRange = startTime !== null || endTime !== null;

  return (
    <Card padding="p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <Scissors size={16} className="text-violet-400" />
          Диапазон нарезки
        </h2>
        {/* Toggle switch */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Включить диапазон нарезки"
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
            enabled ? "bg-violet-600" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        {enabled
          ? hasVideo
            ? "Перетащи маркеры или введи время вручную"
            : "Введите время начала и конца (мм:сс или чч:мм:сс)"
          : "Нарезать весь ролик целиком"}
      </p>

      {enabled && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Визуальный слайдер — только когда известна длина видео */}
          {hasVideo && (
            <div className="pt-4 pb-1 group">
              <RangeSlider
                min={0}
                max={videoDuration}
                startValue={sliderStart}
                endValue={sliderEnd}
                onChange={handleSliderChange}
              />
            </div>
          )}

          {/* Текстовые поля — всегда как дополнение */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1.5 block">С</label>
              <input
                type="text"
                placeholder="0:00"
                value={startRaw}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono"
              />
            </div>
            <div className="pb-3 text-zinc-600 text-lg select-none">—</div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1.5 block">По</label>
              <input
                type="text"
                placeholder={hasVideo ? formatTime(videoDuration) : "10:00"}
                value={endRaw}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Итоговый диапазон */}
          {hasRange && (
            <div className="px-4 py-2.5 rounded-xl glass-subtle text-center">
              <span className="text-xs text-zinc-500">Диапазон: </span>
              <span className="text-sm font-bold text-violet-400 font-mono">
                {startTime !== null ? formatTime(startTime) : "начало"}
                {" — "}
                {endTime !== null ? formatTime(endTime) : "конец"}
              </span>
              {startTime !== null && endTime !== null && (
                <span className="text-xs text-zinc-600 ml-2">
                  ({formatTime(endTime - startTime)})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
