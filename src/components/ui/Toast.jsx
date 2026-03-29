"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

// Контейнер для всех тостов (вверху справа)
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-9999 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Отдельный тост
function Toast({ id, type = "success", title, message, duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Ждём анимацию
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === "success";
  const isError = type === "error";

  return (
    <div
      className={`
        pointer-events-auto transform transition-all duration-300 ease-out
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-96 opacity-0"}
      `}
    >
      <div className={`
        flex gap-3 items-start p-4 rounded-2xl backdrop-blur-xl border
        ${isSuccess
          ? "bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/30"
          : isError
            ? "bg-gradient-to-r from-red-950/80 to-rose-950/80 border-red-500/30"
            : "bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border-blue-500/30"
        }
      `}>
        {isSuccess && <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />}
        {isError && <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />}

        <div className="flex-1 min-w-0">
          {title && (
            <p className={`font-semibold text-sm mb-1 ${
              isSuccess ? "text-emerald-100" : isError ? "text-red-100" : "text-blue-100"
            }`}>
              {title}
            </p>
          )}
          {message && (
            <p className="text-xs text-zinc-300 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
