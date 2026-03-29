"use client";

import { API_URL } from '@/lib/config';
import { showToast } from '@/lib/useToast';

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Wand2, Tag, FileVideo } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TabSwitcher from "@/components/ui/TabSwitcher";
import HeroBadge from "@/components/ui/HeroBadge";
import UrlInput from "@/components/features/UrlInput";
import DurationPicker from "@/components/features/DurationPicker";
import RangePicker from "@/components/features/RangePicker";
import VideoPreview from "@/components/features/VideoPreview";
import TaskQueue from "@/components/features/TaskQueue";

// FileUploader грузим лениво — нужен только когда переключились на вкладку "Загрузить файл"
const FileUploader = dynamic(() => import("@/components/features/FileUploader"), { ssr: false });

const TAB_URL = "url";
const TAB_FILE = "file";

const TABS = [
  { id: TAB_URL, label: "Вставить ссылку" },
  { id: TAB_FILE, label: "Загрузить файл" },
];

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function HomeContent() {
  const [tab, setTab] = useState(TAB_URL);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [submitting, setSubmitting] = useState(false); // только время отправки запроса
  const [segmentDuration, setSegmentDuration] = useState(60);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [clipPrefix, setClipPrefix] = useState("");

  // Глобальный Drag & Drop — перетаскивание файла в любое место страницы
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const onDragEnter = (e) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        dragCounterRef.current++;
        setGlobalDragOver(true);
      }
    };
    const onDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setGlobalDragOver(false);
      }
    };
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setGlobalDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("video/")) {
        setTab(TAB_FILE);
        setDroppedFile(file);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  // Очередь задач: [{taskId, url, status, progress, result, error}]
  const [queue, setQueue] = useState([]);

  const updateTask = useCallback((taskId, updates) => {
    setQueue(prev => prev.map(t => t.taskId === taskId ? { ...t, ...updates } : t));
  }, []);

  const removeFromQueue = useCallback((taskId) => {
    setQueue(prev => prev.filter(t => t.taskId !== taskId));
  }, []);

  const startPolling = useCallback((taskId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/task/${taskId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (data.status === "error") {
          clearInterval(interval);
          updateTask(taskId, { status: "error", error: data.error || "Ошибка при обработке." });
          showToast("Ошибка", data.error || "Ошибка при обработке видео", { type: "error", duration: 5000 });
        } else if (data.status === "done") {
          clearInterval(interval);
          updateTask(taskId, { status: "done", progress: 100, result: data.result });
          showToast("✨ Готово!", "Клипы успешно нарезаны. Скачивай или смотри в истории.", { type: "success", duration: 6000 });
        } else {
          updateTask(taskId, { status: data.status, progress: data.progress || 0 });
        }
      } catch {
        clearInterval(interval);
        updateTask(taskId, { status: "error", error: "Потеряно соединение с сервером." });
      }
    }, 1000);
  }, [updateTask]);

  const handleProcessUrl = async () => {
    if (!isValidUrl(url)) {
      setUrlError("Введите корректную ссылку (YouTube, TikTok, Instagram, VK и др.)");
      return;
    }
    setUrlError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/process-url/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          segment_duration: segmentDuration,
          start_time: startTime,
          end_time: endTime,
          clip_prefix: clipPrefix.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail?.message || errData?.detail || `Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      if (data.task_id) {
        // Добавляем в очередь и сразу очищаем поле URL
        setQueue(prev => [...prev, {
          taskId: data.task_id,
          url,
          status: "starting",
          progress: 0,
          result: null,
          error: null,
        }]);
        setUrl("");
        startPolling(data.task_id);
      }
    } catch (err) {
      setUrlError(err.message || "Ошибка при запросе. Проверьте ссылку.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex-col items-center justify-center px-4 py-16 sm:py-24 md:py-32 min-h-[calc(100vh-80px)] overflow-hidden flex flex-1 w-full flex-grow">

      {/* Глобальный drag overlay */}
      {globalDragOver && (
        <div className="fixed inset-0 z-999 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-violet-950/60 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border-2 border-dashed border-violet-400/60 bg-violet-500/10">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-300">
              <FileVideo size={32} />
            </div>
            <p className="text-xl font-bold text-violet-200">Бросай видео сюда!</p>
            <p className="text-sm text-violet-400">MP4, MOV до 2 GB</p>
          </div>
        </div>
      )}

      {/* Ambient Orbs — только на десктопе, на мобиле убраны (тяжёлый filter:blur) */}
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="hidden sm:block absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-blue-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero */}
      <div className="relative z-10 text-center mb-10 sm:mb-16 max-w-3xl px-2 sm:px-4 animate-fade-in-up">
        <HeroBadge />

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 text-zinc-100">
          Нарежь видео на{" "}
          <span className="gradient-text sm:text-glow">вирусные Shorts</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed font-normal max-w-xl mx-auto">
          Преврати длинные лекции и подкасты в десятки готовых роликов для TikTok и Reels одним кликом.
        </p>
      </div>

      {/* Main Glass Dashboard */}
      <div className="relative z-20 w-full max-w-2xl animate-fade-in-up delay-100 flex-none mx-auto">
        <div className="glass rounded-[32px] overflow-hidden relative">
          {/* Top shine */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Tabs */}
          <TabSwitcher tab={tab} setTab={setTab} tabs={TABS} />

          {/* Action Area */}
          <div className="p-6 sm:p-10 pt-4">
            {tab === TAB_URL ? (
              <div className="flex flex-col gap-6 animate-fade-in">
                <UrlInput
                  url={url}
                  setUrl={setUrl}
                  error={urlError}
                  setError={setUrlError}
                  onSubmit={handleProcessUrl}
                />

                <VideoPreview url={url} />

                <RangePicker
                  startTime={startTime}
                  endTime={endTime}
                  onChange={(s, e) => { setStartTime(s); setEndTime(e); }}
                />

                <Card padding="p-6">
                  <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Tag size={16} className="text-violet-400" />
                    Название клипов
                  </h2>
                  <p className="text-xs text-zinc-500 mb-4">
                    Префикс для имён файлов. Клипы будут:{" "}
                    <span className="text-zinc-400">{clipPrefix.trim() || "clip"}_001.mp4</span>
                  </p>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="например: Лекция_1, Подкаст_2024..."
                    value={clipPrefix}
                    onChange={(e) => setClipPrefix(e.target.value)}
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                </Card>

                <DurationPicker value={segmentDuration} onChange={setSegmentDuration} />

                {/* Очередь задач */}
                <TaskQueue queue={queue} onRemove={removeFromQueue} />

                <Button
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  icon={Wand2}
                  onClick={handleProcessUrl}
                  className="w-full h-14 text-base"
                >
                  {submitting ? "Добавляем в очередь..." : "Сгенерировать клипы"}
                </Button>
              </div>
            ) : (
              <div className="animate-fade-in">
                <FileUploader initialFile={droppedFile} onFileSet={() => setDroppedFile(null)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 flex flex-wrap justify-center gap-8 sm:gap-10 md:gap-20 mt-14 sm:mt-20 md:mt-28 animate-fade-in-up delay-200 px-4 sm:px-6">
        {[
          { value: "2M+", label: "Обработано видео" },
          { value: "99%", label: "Точность ИИ" },
          { value: "< 2м", label: "Среднее время" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center group">
            <p className="text-2xl sm:text-3xl font-black gradient-text group-hover:text-glow transition-all duration-300">
              {value}
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-[0.15em] mt-1.5 sm:mt-2">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
