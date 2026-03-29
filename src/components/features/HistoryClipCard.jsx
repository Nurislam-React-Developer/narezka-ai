"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Download, Clock } from "lucide-react";
import { API_URL } from "@/lib/config";

export default function HistoryClipCard({ clip }) {
  const { id, title, duration, src, thumbnail, filename } = clip;
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const openWatch = () => {
    const params = new URLSearchParams({ src, title: title || "Клип", filename: filename || "clip.mp4" });
    router.push(`/watch?${params.toString()}`);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = src;
      a.download = filename || "clip.mp4";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="group flex flex-col glass-card rounded-2xl overflow-hidden cursor-pointer"
      onClick={openWatch}
    >
      {/* Thumbnail — просто <img>, без <video> */}
      <div className="relative aspect-[9/16] bg-black/50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <Play size={32} className="text-zinc-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

        {/* Duration badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg glass text-[10px] sm:text-xs font-semibold text-zinc-200">
          <Clock size={10} className="text-zinc-400" />
          {duration}
        </div>
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-violet-500/80 backdrop-blur-md text-white text-[10px] font-bold">
          #{id}
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 flex items-center justify-center rounded-full glass text-white">
            <Play fill="currentColor" size={18} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xs font-semibold text-zinc-100 line-clamp-1">{title}</h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg glass text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <Download size={12} />
          {downloading ? "Сохраняем..." : "Скачать"}
        </button>
      </div>
    </div>
  );
}
