"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Pause, Download, Volume2, VolumeX, ArrowLeft, Maximize, Minimize } from "lucide-react";
import Button from "@/components/ui/Button";

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const src = searchParams.get("src") || "";
  const title = searchParams.get("title") || "Клип";
  const filename = searchParams.get("filename") || "clip.mp4";

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef(null);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  }, []);

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  };

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }, []);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setMuted(val === 0);
    }
  };

  const handleDownload = async () => {
    if (!src) return;
    setDownloading(true);

    try {
      if (window.showSaveFilePicker) {
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

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (err) {
      // Fallback for iOS: use native video fullscreen
      if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      }
    }
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "m") toggleMute();
      if (e.key === "f") toggleFullscreen();
      if (e.key === "ArrowLeft" && videoRef.current) videoRef.current.currentTime -= 5;
      if (e.key === "ArrowRight" && videoRef.current) videoRef.current.currentTime += 5;
      if (e.key === "Escape" && isFullscreen) toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, toggleMute, toggleFullscreen, isFullscreen]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Touch: tap to show controls, double-tap ±10sec
  const lastTap = useRef(0);
  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap → seek
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !videoRef.current) return;
      const touch = e.changedTouches[0];
      const x = touch.clientX - rect.left;
      if (x < rect.width / 2) videoRef.current.currentTime -= 10;
      else videoRef.current.currentTime += 10;
    } else {
      // Single tap → toggle controls or play
      if (showControls) togglePlay();
      resetControlsTimer();
    }
    lastTap.current = now;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-zinc-500">
        <p>Видео не найдено.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-0 md:px-6 py-0 md:py-8 animate-fade-in">
      {/* Video Player Container */}
      <div
        ref={containerRef}
        className={`relative w-full bg-black md:rounded-2xl overflow-hidden group ${isFullscreen ? "!rounded-none" : ""}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => playing && setShowControls(false)}
        onTouchEnd={handleTouchEnd}
      >
        {/* Video */}
        <div className={`relative w-full cursor-pointer ${isFullscreen ? "h-screen flex items-center" : "aspect-video"}`}>
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => { setPlaying(false); setShowControls(true); }}
            playsInline
            autoPlay
            webkit-playsinline="true"
          />

          {/* Big centered play button */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-white/[0.1] backdrop-blur-xl border border-white/[0.1] text-white glow-accent">
                <Play fill="currentColor" size={28} className="ml-1 sm:w-9 sm:h-9" />
              </div>
            </div>
          )}
        </div>

        {/* Controls overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-20 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

          <div className="relative px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-8 sm:pt-10 space-y-2">
            {/* Progress bar */}
            <div
              className="w-full h-2 sm:h-1 sm:hover:h-2.5 bg-white/[0.15] rounded-full cursor-pointer group/bar transition-all duration-200 relative touch-none"
              onClick={handleSeek}
              onTouchMove={handleSeek}
            >
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full relative transition-all duration-75"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-lg border-2 border-violet-500 sm:scale-0 sm:group-hover/bar:scale-100 transition-transform" />
              </div>
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Left controls */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 sm:p-2 text-white hover:text-violet-300 transition-colors"
                >
                  {playing
                    ? <Pause fill="currentColor" size={20} className="sm:w-6 sm:h-6" />
                    : <Play fill="currentColor" size={20} className="ml-0.5 sm:w-6 sm:h-6" />
                  }
                </button>

                {/* Volume — hidden on mobile (use hw buttons) */}
                <div className="hidden sm:flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} className="p-1 text-white/80 hover:text-white transition-colors">
                    {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-violet-500 cursor-pointer opacity-0 group-hover/vol:opacity-100"
                  />
                </div>

                {/* Mobile mute button */}
                <button onClick={toggleMute} className="sm:hidden p-1.5 text-white/80 hover:text-white transition-colors">
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* Time */}
                <span className="text-[11px] sm:text-sm font-mono text-white/70 select-none whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={toggleFullscreen} className="p-1.5 sm:p-2 text-white/80 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize size={18} className="sm:w-[22px] sm:h-[22px]" /> : <Maximize size={18} className="sm:w-[22px] sm:h-[22px]" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video info below player */}
      <div className="px-4 md:px-0 mt-4 sm:mt-6 space-y-4 pb-8">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-100 leading-tight">{title}</h1>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="primary" size="md" icon={Download} onClick={handleDownload} loading={downloading} className="w-full sm:w-auto">
            {downloading ? "Сохраняем..." : "Скачать HD"}
          </Button>
          <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => router.back()} className="w-full sm:w-auto">
            Назад к клипам
          </Button>
        </div>

        {/* Keyboard shortcuts hint — only on desktop */}
        <div className="hidden md:block glass-subtle rounded-xl p-4 mt-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Управление клавиатурой</p>
          <div className="grid grid-cols-4 gap-2 text-xs text-zinc-500">
            <div><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono">Space</kbd> Пауза</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono">M</kbd> Звук</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono">F</kbd> Фуллскрин</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono">← →</kbd> ±5сек</div>
          </div>
        </div>

        {/* Mobile gesture hint */}
        <div className="md:hidden glass-subtle rounded-xl p-4 mt-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Жесты</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <div>👆 Тап — пауза</div>
            <div>👆👆 2x тап — ±10 сек</div>
          </div>
        </div>
      </div>
    </div>
  );
}
