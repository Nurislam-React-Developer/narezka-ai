export default function Footer() {
  return (
    <footer className="py-6 sm:py-8 border-t border-white/[0.05] relative z-10 glass-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
        <p className="text-xs sm:text-sm font-medium text-zinc-500">
          © 2026 Narezka AI
        </p>
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500" />
          </span>
          Systems Operational
        </p>
      </div>
    </footer>
  );
}
