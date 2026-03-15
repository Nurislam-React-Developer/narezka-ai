"use client";

import { Timer } from "lucide-react";
import Card from "@/components/ui/Card";

const PRESETS = [15, 30, 40, 60, 90, 120];

export default function DurationPicker({ value, onChange }) {
  const handlePreset = (val) => {
    onChange(val);
  };

  const handleCustom = (e) => {
    const raw = e.target.value;
    // Allow typing freely
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1 && num <= 600) {
      onChange(num);
    } else if (raw === "") {
      // Don't change value when clearing
    }
  };

  return (
    <Card padding="p-6">
      <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Timer size={16} className="text-violet-400" />
        Длительность клипа
      </h2>
      <p className="text-xs text-zinc-500 mb-5">Выберите по сколько секунд нарезать каждый клип</p>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        {PRESETS.map((val) => {
          const selected = value === val;
          return (
            <button
              key={val}
              onClick={() => handlePreset(val)}
              className={`
                flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 text-center
                ${selected
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-300 glow-accent"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-200"
                }
              `}
            >
              <span className="text-lg font-bold">{val}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider">сек</span>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">Своё значение:</span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="number"
            min={5}
            max={600}
            placeholder="например 45"
            onChange={handleCustom}
            className="flex-1 sm:flex-none sm:w-[140px] px-3 py-2.5 glass-input rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-zinc-600 whitespace-nowrap">(5–600)</span>
        </div>
      </div>

      {/* Current value */}
      <div className="mt-4 px-4 py-2.5 rounded-xl glass-subtle text-center">
        <span className="text-xs text-zinc-500">Текущая длительность: </span>
        <span className="text-sm font-bold text-violet-400">{value} сек</span>
      </div>
    </Card>
  );
}
