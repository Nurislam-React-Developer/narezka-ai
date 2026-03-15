"use client";

export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-card flex flex-col gap-3 p-5 rounded-2xl hover:bg-white/[0.05] transition-all">
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-zinc-100">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
