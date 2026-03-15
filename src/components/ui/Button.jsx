"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 text-white border-none glow-accent glow-accent-hover hover:opacity-95",
  secondary:
    "glass-card text-zinc-100 hover:bg-white/[0.06]",
  outline:
    "bg-transparent text-zinc-300 border border-white/10 hover:bg-white/[0.04] hover:text-white hover:border-white/20",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
  ghost:
    "bg-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
};

const sizes = {
  sm: "h-10 px-4 text-sm gap-2 rounded-xl font-medium",
  md: "h-12 px-6 text-sm gap-2 rounded-2xl font-semibold",
  lg: "h-14 px-8 text-base gap-3 rounded-2xl font-bold",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  className,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30 active:scale-[0.97]",
        sizes[size],
        variants[variant],
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {/* Shimmer effect for primary */}
      {variant === "primary" && !isDisabled && (
        <div className="absolute inset-0 overflow-hidden rounded-inherit">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-shimmer opacity-0 hover:opacity-100" />
        </div>
      )}

      {loading ? (
        <Loader2 size={size === "sm" ? 16 : 20} className="animate-spin relative z-10" />
      ) : (
        Icon && <Icon size={size === "sm" ? 16 : 20} className="relative z-10" />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
