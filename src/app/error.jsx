"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Error occurred:", error);
  }, [error]);

  return (
    <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-16 overflow-hidden">
      {/* Ambient Orbs — red/pink theme */}
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-red-600/10 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-rose-600/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="hidden sm:block absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl">
        {/* Error Icon with Animation */}
        <div className="mb-8 flex justify-center animate-fade-in-up">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertCircle size={64} className="text-red-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Big Error Code */}
        <p className="text-9xl sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400 mb-4 animate-fade-in-up delay-100 leading-none">
          500
        </p>

        {/* Main Text */}
        <h1 className="text-3xl sm:text-5xl font-black text-zinc-100 mb-4 animate-fade-in-up delay-200 tracking-tight">
          Внутренняя ошибка сервера
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed max-w-lg mx-auto animate-fade-in-up delay-300">
          Упс! Что-то пошло не так на нашей стороне. Наша команда уже в курсе проблемы и работает над её решением.
        </p>

        {/* Error Details (if available) */}
        {error?.message && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 animate-fade-in-up delay-400 text-left">
            <p className="text-xs sm:text-sm text-red-400 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-500">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white font-bold text-base transition-all active:scale-[0.97] glow-accent"
          >
            <RefreshCw size={20} />
            Попробовать снова
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white font-bold text-base transition-all active:scale-[0.97]"
          >
            <Home size={20} />
            На главную
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-10 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-fade-in-up delay-600">
          <div className="flex items-start gap-3 text-left">
            <Bug size={18} className="text-zinc-500 shrink-0 mt-1" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-zinc-300 mb-1">Если проблема сохраняется:</p>
              <p className="text-xs text-zinc-500">
                Обнови страницу или попробуй позже. Если ошибка повторяется, свяжись с поддержкой.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
