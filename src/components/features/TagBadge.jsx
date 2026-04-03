"use client";

/**
 * TagBadge — компонент для выбора тега сессии в истории.
 * Показывает текущий тег (или кнопку "+ Тег") и inline-дропдаун для выбора.
 */

import { useState, useRef, useEffect } from "react";
import { Tag, X } from "lucide-react";

export const PRESET_TAGS = [
  { id: "lecture",   label: "Лекция",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { id: "podcast",   label: "Подкаст",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { id: "stream",    label: "Стрим",     color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: "interview", label: "Интервью",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: "other",     label: "Другое",    color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
];

export default function TagBadge({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Закрываем дропдаун при клике вне компонента
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentTag = PRESET_TAGS.find((t) => t.label === value);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {currentTag ? (
        // Показываем текущий тег с кнопкой удалить
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer select-none ${currentTag.color}`}
          onClick={() => setOpen((v) => !v)}
        >
          <Tag size={10} />
          {currentTag.label}
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        // Кнопка добавить тег
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-white/10 text-[10px] font-medium text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-colors"
        >
          <Tag size={10} />
          Тег
        </button>
      )}

      {/* Дропдаун */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 flex flex-col gap-1 p-1.5 rounded-xl glass border border-white/[0.08] shadow-xl min-w-[130px] animate-fade-in">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => { onChange(tag.label); setOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all hover:scale-[1.02] ${
                value === tag.label ? tag.color : "text-zinc-400 hover:bg-white/[0.04]"
              }`}
            >
              {tag.label}
              {value === tag.label && <span className="ml-auto text-[10px] opacity-60">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
