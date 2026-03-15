"use client";

import { CheckCheck } from "lucide-react";
import Card from "@/components/ui/Card";

export default function SubtitleToggle({ value, onChange }) {
  return (
    <Card padding="p-5">
      <label className="flex items-center justify-between cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-1.5 rounded transition-colors ${value ? "bg-violet-500 text-white" : "bg-white/[0.06] text-zinc-400 group-hover:bg-white/[0.1]"}`}>
            <CheckCheck size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Сгенерировать Субтитры</p>
            <p className="text-xs text-zinc-500 mt-1">ИИ распознает голос и добавит анимированные субтитры</p>
          </div>
        </div>

        <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? "bg-violet-500" : "bg-white/[0.08]"}`}>
          <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
          <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${value ? "translate-x-5" : "translate-x-0"}`} />
        </div>
      </label>
    </Card>
  );
}
