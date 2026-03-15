"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Volume2, VolumeX, X } from "lucide-react";
import Button from "@/components/ui/Button";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoModal({ src, filename, onClose }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename || "clip.mp4";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black animate-fade-in"
      onClick={onClose}
    >
      {/* Close Button — top right */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-5 right-5 z-50 p-3 rounded-full bg-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.15] transition-all backdrop-blur-md"
      >
        <X size={22} />
      </button>

      {/* Video — fills all available space */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer relative"
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
      >
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
          onEnded={() => setPlaying(false)}
          playsInline
          autoPlay
        />

        {/* Big play button overlay */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 flex items-center justify-center rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white glow-accent">
              <Play fill="currentColor" size={40} className="ml-1.5" />
            </div>
          </div>
        )}
      </div>

      {/* Controls bar — bottom of screen */}
      <div
        className="w-full px-6 md:px-10 py-5 bg-gradient-to-t from-black via-black/90 to-transparent space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          className="w-full h-1.5 hover:h-3 bg-white/[0.1] rounded-full cursor-pointer group/p relative transition-all duration-200"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full relative transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-violet-500 scale-0 group-hover/p:scale-100 transition-transform" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={togglePlay}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors glow-accent"
            >
              {playing ? <Pause fill="currentColor" size={22} /> : <Play fill="currentColor" size={22} className="ml-0.5" />}
            </button>

            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors p-2">
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            <span className="text-sm font-mono text-zinc-400">
              {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
            </span>
          </div>

          <Button variant="secondary" size="sm" icon={Download} onClick={handleDownload}>
            Скачать HD
          </Button>
        </div>
      </div>
    </div>
  );
}
