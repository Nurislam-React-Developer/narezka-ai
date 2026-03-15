import { cn } from "@/lib/utils";

export default function Card({
  children,
  className,
  hover = true,
  padding = "p-6 sm:p-8",
  ...props
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-3xl relative overflow-hidden",
        hover && "transition-all duration-300",
        padding,
        className
      )}
      {...props}
    >
      {/* Top shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
