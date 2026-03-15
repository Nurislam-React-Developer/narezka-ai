import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(({
  label,
  id,
  error,
  hint,
  icon: Icon,
  className,
  ...props
}, ref) => {
  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-zinc-300 pl-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center group">
        {Icon && (
          <div className="absolute left-4 z-10 flex items-center justify-center text-zinc-500 group-focus-within:text-violet-400 transition-colors pointer-events-none">
            <Icon size={20} />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full glass-input rounded-2xl py-4 text-base placeholder:text-zinc-600 text-zinc-100",
            Icon ? "pl-12 pr-4" : "px-4",
            error && "!border-red-500/50 focus:!border-red-500 focus:!shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"
          )}
          {...props}
        />
      </div>

      {(error || hint) && (
        <p className={cn("text-xs font-medium pl-1", error ? "text-red-400" : "text-zinc-500")}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
