"use client";

import { useEffect, useState } from "react";
import { Clock, User, Film, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPreview({ url, onDuration }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!url || !isValidUrl(url)) {
      setState("idle");
      setInfo(null);
      onDuration?.(null);
      return;
    }

    setState("loading");
    setInfo(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/video-preview/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setInfo(data);
        setState("done");
        // Пробрасываем длительность в родителя для RangePicker
        if (data.duration) onDuration?.(data.duration);
      } catch {
        setState("error");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [url, onDuration]);

  if (state === "idle") return null;

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass-subtle text-xs text-zinc-400 animate-fade-in">
        <Loader2 size={14} className="animate-spin text-violet-400 shrink-0" />
        Получаем информацию о видео...
      </div>
    );
  }

  if (state === "error") {
    return null; // Тихо игнорируем — превью не критично
  }

  const { title, duration, thumbnail, uploader } = info;

  return (
    <div className="flex gap-3 p-3 rounded-2xl glass border border-white/[0.06] animate-fade-in">
      {/* Thumbnail */}
      <div className="shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Film size={20} className="text-zinc-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">{title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {duration && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock size={11} className="text-violet-400" />
              {formatDuration(duration)}
            </span>
          )}
          {uploader && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 truncate max-w-[160px]">
              <User size={11} />
              {uploader}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
