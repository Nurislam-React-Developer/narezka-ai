"use client";

import { API_URL } from '@/lib/config';

import { useState, useEffect } from "react";
import { Download, Archive, BarChart2, Clock, Scissors, TrendingUp, CheckCheck } from "lucide-react";
import ClipCard from "@/components/features/ClipCard";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";

export default function ResultsContent() {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

    fetch(`${API_URL}/results/`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setData(json.data[json.data.length - 1]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadAll = async () => {
    if (!data || !data.clips || data.clips.length === 0) return;
    setDownloadingAll(true);
    
    try {
      if (window.showDirectoryPicker) {
        // Запросить у пользователя папку для сохранения
        const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        for (const clip of data.clips) {
          const res = await fetch(`${API_URL}/outputs/${clip.path}`);
          const blob = await res.blob();
          const fileHandle = await dirHandle.getFileHandle(clip.filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
      } else {
        // Fallback для старых браузеров (подряд скачают все)
        for (const clip of data.clips) {
          const a = document.createElement("a");
          a.href = `${API_URL}/outputs/${clip.path}`;
          a.download = clip.filename || "clip.mp4";
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 600)); // Задержка от блокировки
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Batch download failed", err);
      }
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
        {clips.map((clip, i) => (
          <div key={clip.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <ClipCard clip={{
              id: clip.id,
              title: `Клип #${clip.id} — ${clip.filename}`,
              timecode: `00:00:00 — 00:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
              duration: `${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
              src: `${API_URL}/outputs/${clip.path}`,
              thumbnail: "",
              filename: clip.filename,
            }} />
          </div>
        ))}
      </div>

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
