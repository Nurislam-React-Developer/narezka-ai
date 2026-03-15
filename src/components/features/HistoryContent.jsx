"use client";

import { API_URL } from '@/lib/config';

import { useState, useEffect } from "react";
import { Clock, Scissors, Play } from "lucide-react";
import ClipCard from "@/components/features/ClipCard";

export default function HistoryContent() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/results/`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          // Показываем новые скачивания первыми
          setHistory(json.data.reverse());
        }
      })
      .catch((err) => console.error('Error fetching history:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <p className="text-zinc-400 font-medium">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-zinc-500">
        <p>История пуста. Самое время нарезать пару клипов!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">
      <div className="mb-12 border-b border-white/[0.05] pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full glass text-xs font-bold text-violet-400">
          <Clock size={14} />
          Архив
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-100">История Нарезок</h1>
        <p className="text-sm md:text-base text-zinc-400 mt-3 font-medium">
          Все ваши предыдущие видео сохранены и доступны для скачивания.
        </p>
      </div>

      <div className="space-y-16">
        {history.map((session, index) => (
          <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-200 truncate max-w-2xl">
                  {session.original_filename || session.source_file || "Неизвестное видео"}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Scissors size={14}/> {session.total_clips} клипов</span>
                  <span className="flex items-center gap-1"><Play size={14}/> Сегменты по {session.segment_duration_seconds}с</span>
                </div>
              </div>
              {session.source_url && (
                <a
                  href={session.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Оригинальное видео ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {session.clips && session.clips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={{
                    id: clip.id,
                    title: `Клип #${clip.id} — ${clip.filename}`,
                    timecode: `00:00:00 — 00:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
                    duration: `${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`,
                    src: `${API_URL}/outputs/${clip.path}`,
                    thumbnail: "",
                    filename: clip.filename,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
