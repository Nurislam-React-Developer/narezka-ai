"use client";

import Card from "@/components/ui/Card";

export default function ModeSelector({ modes, value, onChange }) {
  return (
    <Card padding="p-6">
      <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Режим нарезки</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {modes.map(({ id, label, description, icon: Icon }) => {
          const selected = value === id;
          return (
            <label
              key={id}
              className={`
                flex flex-col p-5 rounded-xl border cursor-pointer transition-all duration-200
                ${selected
                  ? "border-violet-500/40 bg-violet-500/10 glow-accent"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }
              `}
            >
              <input type="radio" value={id} checked={selected} onChange={() => onChange(id)} className="sr-only" />
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${selected ? "bg-violet-500/20 text-violet-400" : "bg-white/[0.04] text-zinc-400"}`}>
                  <Icon size={18} />
                </div>
                <span className={`font-semibold ${selected ? "text-violet-300" : "text-zinc-300"}`}>{label}</span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed font-light">{description}</p>
            </label>
          );
        })}
      </div>
    </Card>
  );
}
