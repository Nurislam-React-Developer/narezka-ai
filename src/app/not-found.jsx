import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16 overflow-hidden">
      {/* Ambient Orbs */}
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="hidden sm:block absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-blue-600/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl">
        {/* Big Animated 404 */}
        <div className="mb-8 relative">
          <p className="text-9xl sm:text-[180px] font-black gradient-text animate-fade-in-up leading-none">
            404
          </p>
          <div className="absolute inset-0 text-9xl sm:text-[180px] font-black blur-2xl opacity-30 gradient-text">
            404
          </div>
        </div>

        {/* Main Text */}
        <h1 className="text-3xl sm:text-5xl font-black text-zinc-100 mb-4 animate-fade-in-up delay-100 tracking-tight">
          Страница потеряется в сети
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed max-w-lg mx-auto animate-fade-in-up delay-200">
          Кажется, вы перешли по неправильной ссылке. Эта страница либо была удалена, либо никогда не существовала.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white font-bold text-base transition-all active:scale-[0.97] glow-accent"
          >
            <Home size={20} />
            На главную
          </Link>

          <Link
            href="/results"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white font-bold text-base transition-all active:scale-[0.97]"
          >
            <Search size={20} />
            Мои клипы
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-xs sm:text-sm text-zinc-500 mt-10 animate-fade-in-up delay-400">
          Попробуй вернуться в главное меню или посмотреть свои результаты обработки
        </p>
      </div>
    </div>
  );
}
