"use client";

import { API_URL } from '@/lib/config';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Brain, ArrowRight, Sliders } from "lucide-react";
import Button from "@/components/ui/Button";
import ModeSelector from "@/components/features/ModeSelector";
import DurationPicker from "@/components/features/DurationPicker";
import SubtitleToggle from "@/components/features/SubtitleToggle";

const MODES = [
  {
    id: "mvp",
    label: "MVP",
    description: "Быстрая нарезка на равные отрезки. Подходит для длинных лекций.",
    icon: Zap,
  },
  {
    id: "smart",
    label: "Smart AI Detection",
    description: "ИИ находит ключевые моменты и нарезает лучшие сцены.",
    icon: Brain,
  },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 min-h-[400px]">
      <div className="relative flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
        <Brain size={28} className="absolute text-violet-400 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-zinc-100">ИИ анализирует ваше видео...</p>
        <p className="text-sm text-zinc-400 max-w-xs mx-auto">Мы ищем самые сочные и вирусные моменты.</p>
      </div>
    </div>
  );
}

export default function SettingsContent() {
  const router = useRouter();

  const [mode, setMode] = useState("smart");
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [segmentDuration, setSegmentDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const [progressInfo, setProgressInfo] = useState({ status: "", percent: 0 });

  const pollTask = (taskId) => new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/task/${taskId}`);
        const data = await res.json();
        setProgressInfo({ status: data.status, percent: data.progress || 0 });
        if (data.status === "done") {
          clearInterval(interval);
          resolve(data.result);
        } else if (data.status === "error") {
          clearInterval(interval);
          reject(new Error(data.error || "Ошибка обработки"));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 1000);
  });

  const handleStart = async () => {
    setLoading(true);

    sessionStorage.setItem("cutSettings", JSON.stringify({
      mode,
      addSubtitles,
      segmentDuration,
    }));

    const stored = sessionStorage.getItem("cutResult");
    if (stored) {
      try {
        const prevData = JSON.parse(stored);
        if (prevData.source_url) {
          setProgressInfo({ status: "downloading", percent: 0 });
          const response = await fetch(`${API_URL}/process-url/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: prevData.source_url,
              segment_duration: segmentDuration,
            }),
          });

          if (response.ok) {
            const taskData = await response.json();
            if (taskData.task_id) {
              // Ждём завершения задачи
              const result = await pollTask(taskData.task_id);
              sessionStorage.setItem("cutResult", JSON.stringify(result));
            }
          }
        }
      } catch (err) {
        console.error("Re-cut error", err);
      }
    }

    router.push("/results");
  };

  if (loading) {
    const statusText = progressInfo.status === "downloading"
      ? `Скачивание... ${progressInfo.percent}%`
      : progressInfo.status === "cutting"
      ? "ИИ нарезает видео..."
      : "ИИ анализирует ваше видео...";

    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="flex flex-col items-center justify-center gap-6 py-20 min-h-[400px]">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
            <Brain size={28} className="absolute text-violet-400 animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-lg font-semibold text-zinc-100">{statusText}</p>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto">Мы ищем самые сочные и вирусные моменты.</p>
            {progressInfo.status === "downloading" && (
              <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressInfo.percent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full glass text-xs font-medium text-zinc-300">
          <Sliders size={12} className="text-violet-400" />
          Конфигурация
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">Настройки Нарезки</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Выберите параметры клиппинга, а наш ИИ сделает остальное
        </p>
      </div>

      <div className="grid gap-6">
        <ModeSelector modes={MODES} value={mode} onChange={setMode} />
        <DurationPicker value={segmentDuration} onChange={setSegmentDuration} />
        <SubtitleToggle value={addSubtitles} onChange={setAddSubtitles} />

        <div className="pt-4 pb-12">
          <Button variant="primary" size="lg" icon={ArrowRight} onClick={handleStart} className="w-full">
            Создать шедевры
          </Button>
        </div>
      </div>
    </div>
  );
}
