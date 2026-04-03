"use client";

import { useState } from "react";
import Link from "next/link";
import { Scissors, Github, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Upload" },
  { path: "/watermark", label: "Watermark" },
  { path: "/compress", label: "Compress" },
  { path: "/subtitles", label: "Subtitles" },
  { path: "/settings", label: "Settings" },
  { path: "/results", label: "Results" },
  { path: "/history", label: "History" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-[64px] sm:h-[72px] glass">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 glow-accent group-hover:glow-accent-hover transition-shadow duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Scissors size={16} className="text-white relative z-10 sm:w-[18px] sm:h-[18px]" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-100">
            Narezka<span className="text-zinc-500 font-medium"> AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-6 bg-white/10 mx-2" />

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <Github size={18} />
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/85" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-[64px] left-0 right-0 glass border-t border-white/[0.05] p-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3.5 rounded-xl text-base font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all active:bg-white/[0.1]"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3.5 rounded-xl text-base font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 transition-all"
            >
              <Github size={18} /> GitHub
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
