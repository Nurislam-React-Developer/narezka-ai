"use client";

import { API_URL } from '@/lib/config';

import { useState, useEffect } from "react";
import { Download, Archive, BarChart2, Clock, Scissors, TrendingUp, CheckCheck, ChevronDown } from "lucide-react";
import ClipCard from "@/components/features/ClipCard";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";

const PAGE_SIZE = 12;

export default function ResultsContent() {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const stored = sessionStorage.getItem("cutResult");
    if (stored) {
      try {
        setData(JSON.parse(stored));
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing stored data", e);
      }
    }

    fetch(`${API_URL}/results/?page=1&limit=1`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setData(json.data[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadAll = async () => {
    if (!data || !data.clips || data.clips.length === 0) return;
    setDownloadingAll(true);

    try {
      const paths = data.clips.map((clip) => clip.path);
      const res = await fetch(`${API_URL}/download-zip/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paths),
      });

      if (!res.ok) throw new Error("ZIP generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Narezka_Clips.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Batch zip download failed", err);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <p className="text-zinc-400 font-medium">Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.clips || data.clips.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-zinc-500">
        <p>Нет готовых клипов.</p>
      </div>
    );
  }

  const { clips, total_clips, segment_duration_seconds } = data;
  const visibleClips = clips.slice(0, visibleCount);
  const hasMoreClips = visibleCount < clips.length;

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/[0.05] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full glass text-xs font-bold text-emerald-400">
            <CheckCheck size={14} />
            Успешно обработано
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-100">Ваши Вирусные Клипы</h1>
          <p className="text-sm md:text-base text-zinc-400 mt-3 font-medium">
            ИИ собрал <span className="text-violet-400 font-bold">{total_clips} лучших моментов</span> из оригинала.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          icon={Archive}
          loading={downloadingAll}
          onClick={handleDownloadAll}
          className="shrink-0 w-full sm:w-auto"
        >
          {downloadingAll ? "Генерация Архива..." : "Скачать Все (.zip)"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        <StatCard icon={Scissors} label="Готовых клипов" value={total_clips} />
        <StatCard icon={Clock} label="Время сегмента" value={`${segment_duration_seconds || 60}с`} />
        <StatCard icon={BarChart2} label="Статус" value="Успешно" />
        <StatCard icon={TrendingUp} label="Вовлеченность" value="94%" />
      </div>

      {/* Clips grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {visibleClips.map((clip) => (
          <ClipCard key={clip.id} clip={{
            id: clip.id,
            title: `Клип #${clip.id} — ${clip.filename}`,
            timecode: `00:00:00 — 00:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
            duration: `${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
            durationSecs: clip.duration,
            src: `${API_URL}/outputs/${clip.path}`,
            thumbnail: clip.thumbnail ? `${API_URL}/outputs/${clip.thumbnail}` : "",
            filename: clip.filename,
          }} />
        ))}
      </div>

      {/* Show more clips */}
      {hasMoreClips && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="flex items-center gap-2 px-8 py-3 rounded-full glass text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Показать ещё {Math.min(PAGE_SIZE, clips.length - visibleCount)} клипов <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="flex justify-center mt-12 sm:mt-20 pt-8 sm:pt-10 border-t border-white/[0.05]">
        <Button
          variant="secondary"
          size="lg"
          icon={Download}
          loading={downloadingAll}
          onClick={handleDownloadAll}
        >
          Скачать всю нарезку одним архивом
        </Button>
      </div>
    </div>
  );
}
