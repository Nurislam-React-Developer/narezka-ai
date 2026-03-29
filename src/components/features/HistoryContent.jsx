"use client";

import { API_URL } from "@/lib/config";

import { useState, useEffect, useCallback } from "react";
import { Clock, Scissors, Play, ChevronDown, Loader2, Trash2 } from "lucide-react";
import HistoryClipCard from "@/components/features/HistoryClipCard";
import DeleteHistoryModal from "@/components/features/DeleteHistoryModal";

const CLIPS_PREVIEW = 4;
const SESSIONS_PER_PAGE = 5;

export default function HistoryContent() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchPage = useCallback(async (pageNum, append = false) => {
    try {
      const res = await fetch(`${API_URL}/results/?page=${pageNum}&limit=${SESSIONS_PER_PAGE}`);
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setSessions((prev) => append ? [...prev, ...json.data] : json.data);
        const loaded = append ? sessions.length + json.data.length : json.data.length;
        setHasMore(loaded < (json.total || 0));
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }, [sessions.length]);

  useEffect(() => {
    fetchPage(1, false).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleted = (type, indices) => {
    setShowDeleteModal(false);
    if (type === "all") {
      setSessions([]);
      setHasMore(false);
    } else {
      const indexSet = new Set(indices);
      setSessions((prev) => prev.filter((_, i) => !indexSet.has(i)));
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const toggleExpand = (index) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] text-zinc-500">
        <p>История пуста. Самое время нарезать пару клипов!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">
      <div className="mb-12 border-b border-white/[0.05] pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full glass text-xs font-bold text-violet-400">
              <Clock size={14} />
              Архив
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-100">История Нарезок</h1>
            <p className="text-sm md:text-base text-zinc-400 mt-3 font-medium">
              Показано {sessions.length} сессий. Все ролики доступны для скачивания.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold shrink-0 mt-1"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">Удалить</span>
          </button>
        </div>
      </div>

      <div className="space-y-16">
        {sessions.map((session, index) => {
          const clips = session.clips || [];
          const isExpanded = expanded.has(index);
          const shownClips = isExpanded ? clips : clips.slice(0, CLIPS_PREVIEW);
          const hiddenCount = clips.length - CLIPS_PREVIEW;

          return (
            <div key={index}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-200 truncate max-w-2xl">
                    {session.original_filename || session.source_file || "Неизвестное видео"}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Scissors size={14} /> {session.total_clips} клипов</span>
                    <span className="flex items-center gap-1"><Play size={14} /> Сегменты по {session.segment_duration_seconds}с</span>
                  </div>
                </div>
                {session.source_url && (
                  <a
                    href={session.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0"
                  >
                    Оригинальное видео ↗
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {shownClips.map((clip) => (
                  <HistoryClipCard
                    key={clip.id}
                    clip={{
                      id: clip.id,
                      title: `Клип #${clip.id} — ${clip.filename}`,
                      duration: `${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2, "0")}`,
                      durationSecs: clip.duration,
                      src: `${API_URL}/outputs/${clip.path}`,
                      thumbnail: clip.thumbnail ? `${API_URL}/outputs/${clip.thumbnail}` : "",
                      filename: clip.filename,
                    }}
                  />
                ))}
              </div>

              {hiddenCount > 0 && (
                <button
                  onClick={() => toggleExpand(index)}
                  className="mt-6 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <>Свернуть <ChevronDown size={16} className="rotate-180 transition-transform" /></>
                  ) : (
                    <>Показать ещё {hiddenCount} клипов <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more sessions */}
      {hasMore && (
        <div className="flex justify-center mt-16">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-8 py-3 rounded-full glass text-sm font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <><Loader2 size={16} className="animate-spin" /> Загружаем...</>
            ) : (
              <>Загрузить ещё сессии <ChevronDown size={16} /></>
            )}
          </button>
        </div>
      )}
      {showDeleteModal && (
        <DeleteHistoryModal
          sessions={sessions}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
