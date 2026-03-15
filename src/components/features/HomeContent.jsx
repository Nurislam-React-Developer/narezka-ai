"use client";

import { API_URL } from '@/lib/config';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import Button from "@/components/ui/Button";
import TabSwitcher from "@/components/ui/TabSwitcher";
import HeroBadge from "@/components/ui/HeroBadge";
import UrlInput from "@/components/features/UrlInput";
import FileUploader from "@/components/features/FileUploader";
import DurationPicker from "@/components/features/DurationPicker";

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
  const router = useRouter();
  const [tab, setTab] = useState(TAB_URL);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(60);

  const [progressInfo, setProgressInfo] = useState({ status: "", percent: 0 });

  const startPolling = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/task/${taskId}`);
        if (!res.ok) throw new Error(`Ошибка получения статуса`);
        const data = await res.json();

        if (data.status === "error") {
          clearInterval(interval);
          setUrlError(data.error || "Ошибка при обработке.");
          setProcessing(false);
          setProgressInfo({ status: "", percent: 0 });
        } else if (data.status === "done") {
          clearInterval(interval);
          sessionStorage.setItem("cutResult", JSON.stringify(data.result));
          router.push("/results");
        } else {
          // Status update
          setProgressInfo({ status: data.status, percent: data.progress || 0 });
        }
      } catch (err) {
        clearInterval(interval);
        setUrlError("Потеряно соединение с сервером.");
        setProcessing(false);
        setProgressInfo({ status: "", percent: 0 });
      }
    }, 1000);
  };

  const handleProcessUrl = async () => {
    if (!isValidUrl(url)) {
      setUrlError("Введите корректную ссылку (YouTube, TikTok, Instagram, VK и др.)");
      return;
    }
    setUrlError("");
    setProcessing(true);
    setProgressInfo({ status: "starting", percent: 0 });

    try {
      const response = await fetch(`${API_URL}/process-url/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, segment_duration: segmentDuration }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail?.message || errData?.detail || `Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      if (data.task_id) {
        startPolling(data.task_id);
      } else {
        // Fallback if backend isn't Async yet
        sessionStorage.setItem("cutResult", JSON.stringify(data));
        router.push("/settings");
      }
    } catch (err) {
      setUrlError(err.message || "Ошибка при запросе. Проверьте ссылку.");
      setProcessing(false);
      setProgressInfo({ status: "", percent: 0 });
    }
  };

  const getProcessingText = () => {
    if (progressInfo.status === "downloading") return `Скачивание... ${progressInfo.percent}%`;
    if (progressInfo.status === "cutting") return "ИИ нарезает видео... Это может занять время";
    if (progressInfo.status === "starting") return "Инициализация...";
    return "ИИ анализирует видео...";
  };

  return (
    <div className="relative flex-col items-center justify-center px-4 py-16 sm:py-24 md:py-32 min-h-[calc(100vh-80px)] overflow-hidden flex flex-1 w-full flex-grow">

      {/* Ambient Orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] bg-violet-600/15 blur-[120px] sm:blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-fuchsia-600/10 blur-[100px] sm:blur-[150px] rounded-full pointer-events-none" />
      <div className="hidden sm:block absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-blue-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero */}
      <div className="relative z-10 text-center mb-10 sm:mb-16 max-w-3xl px-2 sm:px-4 animate-fade-in-up">
        <HeroBadge />

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 text-zinc-100">
          Нарежь видео на{" "}
          <span className="gradient-text text-glow">вирусные Shorts</span>
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
                
                <DurationPicker value={segmentDuration} onChange={setSegmentDuration} />

                <Button
                  variant="primary"
                  size="lg"
                  loading={processing}
                  icon={Wand2}
                  onClick={handleProcessUrl}
                  className="w-full h-14 text-base relative overflow-hidden"
                >
                  <span className="relative z-10">
                    {processing ? getProcessingText() : "Сгенерировать клипы"}
                  </span>
                  {processing && progressInfo.status === "downloading" && (
                    <div
                      className="absolute left-0 bottom-0 top-0 bg-white/10 transition-all duration-300 pointer-events-none"
                      style={{ width: `${progressInfo.percent}%` }}
                    />
                  )}
                </Button>
              </div>
            ) : (
              <div className="animate-fade-in">
                <FileUploader />
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
