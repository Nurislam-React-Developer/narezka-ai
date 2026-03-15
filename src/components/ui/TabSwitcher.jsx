"use client";

export default function TabSwitcher({ tab, setTab, tabs }) {
  return (
    <div className="p-3 mx-4 sm:mx-8 mt-6">
      <div className="flex p-1 glass-subtle rounded-2xl relative">
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`
                flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 relative
                ${active
                  ? "text-zinc-100 bg-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
