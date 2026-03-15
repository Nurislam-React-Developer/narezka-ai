"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Download, Clock, Scissors, Volume2, VolumeX, Maximize2 } from "lucide-react";
import Button from "@/components/ui/Button";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ClipCard({ clip }) {
  const { title, timecode, duration, src, thumbnail, filename } = clip;
  const router = useRouter();
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pct * totalDuration;
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const openWatch = () => {
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    const params = new URLSearchParams({
      src,
      title: title || "Клип",
      filename: filename || "clip.mp4",
    });
    router.push(`/watch?${params.toString()}`);
  };

  const handleDownload = async (e) => {
    e?.stopPropagation();
    if (!src) return;
    setDownloading(true);

    try {
      if (window.showSaveFilePicker) {
        // Modern browsers: ask where to save
        const res = await fetch(src);
        const blob = await res.blob();
        
        const handle = await window.showSaveFilePicker({
          suggestedName: filename || "clip.mp4",
          types: [{
            description: 'Видео',
            accept: { 'video/mp4': ['.mp4'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback for Safari/Mobile
        const a = document.createElement("a");
        a.href = src;
        a.download = filename || "clip.mp4";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Download failed", err);
      }
    } finally {
      setDownloading(false);
    }
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      className="group flex flex-col glass-card rounded-2xl overflow-hidden cursor-pointer"
      onClick={openWatch}
    >
      {/* Video */}
      <div className="relative aspect-[9/16] bg-black/50">
        <video
          ref={videoRef}
          src={src}
          poster={thumbnail}
          className="absolute inset-0 w-full h-full object-cover"
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => videoRef.current && setTotalDuration(videoRef.current.duration)}
          playsInline
          preload="none"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg glass text-[10px] sm:text-xs font-semibold text-zinc-200">
          <Clock size={10} className="text-zinc-400 sm:w-3 sm:h-3" />
          {duration}
        </div>
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-violet-500/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold">
          99%
        </div>

        {/* Play overlay — ALWAYS visible on mobile, hover on desktop */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full glass text-white glow-accent sm:hover:scale-105 transition-transform">
            {playing ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
          </div>
        </button>

        {/* Bottom controls — always visible on mobile */}
        <div
          className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={progressRef} className="w-full h-1 sm:h-1.5 bg-white/[0.1] rounded-full cursor-pointer group/bar" onClick={handleSeek}>
            <div className="h-full bg-violet-500 rounded-full relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-300">
            <span className="font-mono">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={toggleMute} className="p-0.5 sm:p-1 hover:text-white transition-colors">
                {muted ? <VolumeX size={12} className="sm:w-[14px] sm:h-[14px]" /> : <Volume2 size={12} className="sm:w-[14px] sm:h-[14px]" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); openWatch(); }} className="p-0.5 sm:p-1 hover:text-white transition-colors">
                <Maximize2 size={12} className="sm:w-[14px] sm:h-[14px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Timecode (hidden when controls show) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-zinc-300 font-medium opacity-0 sm:group-hover:opacity-0 transition-opacity pointer-events-none">
          <Scissors size={12} className="text-violet-400" />
          {timecode}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-4 flex-1" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">{title}</h3>
        <div className="mt-auto flex flex-col gap-2">
          {/* Watch button — visible, especially for mobile */}
          <Button
            variant="primary"
            size="sm"
            icon={Play}
            onClick={openWatch}
            className="w-full text-xs font-semibold"
          >
            Смотреть
          </Button>
          <Button variant="secondary" size="sm" icon={Download} loading={downloading} onClick={handleDownload} className="w-full text-xs font-semibold">
            {downloading ? "Сохраняем..." : "Скачать HD"}
          </Button>
        </div>
      </div>
    </div>
  );
}
