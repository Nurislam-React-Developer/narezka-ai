"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FileVideo, Link as LinkIcon, Upload, Download, Loader2, AlertCircle, Play } from "lucide-react";
import { API_URL } from "@/lib/config";
import { showToast } from "@/lib/useToast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TabSwitcher from "@/components/ui/TabSwitcher";
import HeroBadge from "@/components/ui/HeroBadge";

const TABS = [
  { id: "url", label: "По ссылке" },
  { id: "file", label: "Загрузить файл" },
];

const LANGUAGES = [
  { code: "auto", label: "Автоопределение" },
  { code: "ru",   label: "Русский" },
  { code: "en",   label: "Английский" },
  { code: "es",   label: "Испанский" },
  { code: "fr",   label: "Французский" },
  { code: "de",   label: "Немецкий" },
  { code: "zh",   label: "Китайский" },
];

const FONT_SIZES = [
  { label: "S",  value: 16 },
  { label: "M",  value: 22 },
  { label: "L",  value: 30 },
  { label: "XL", value: 40 },
];

const COLORS = [
  { id: "white",  label: "Белый",    hex: "#FFFFFF" },
  { id: "yellow", label: "Жёлтый",   hex: "#FFE800" },
  { id: "cyan",   label: "Голубой",  hex: "#00E5FF" },
  { id: "orange", label: "Оранжевый",hex: "#FF8C00" },
];

const POSITIONS = [
  { id: "top",    label: "Сверху",   icon: "⬆" },
  { id: "center", label: "По центру",icon: "↕" },
  { id: "bottom", label: "Снизу",    icon: "⬇" },
];

export default function SubtitlesContent() {
  const [tab, setTab] = useState("url");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [language, setLanguage] = useState("auto");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Transcription state
  const [transcribeTaskId, setTranscribeTaskId] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState(null);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [srtResult, setSrtResult] = useState(null);

  // Style state
  const [style, setStyle] = useState({
    font_size: 22,
    color: "white",
    outline: true,
    outline_color: "black",
    position: "bottom",
    bold: false,
  });

  // Render state
  const [renderTaskId, setRenderTaskId] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoResult, setVideoResult] = useState(null);

  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Poll transcription task
  const startTranscribePolling = useCallback((id) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/subtitles/task/${id}`);
        if (!res.ok) throw new Error("Ошибка при получении статуса");
        const data = await res.json();
        setTranscribeStatus(data.status);
        setTranscribeProgress(data.progress || 0);

        if (data.status === "done") {
          stopPolling();
          setSrtResult(data.result);
        } else if (data.status === "error") {
          stopPolling();
          setError(data.error || "Неизвестная ошибка");
          showToast("Ошибка", data.error, { type: "error", duration: 5000 });
        }
      } catch (err) {
        stopPolling();
        setError(err.message);
      }
    }, 1000);
  }, []);

  // Poll render task
  const startRenderPolling = useCallback((id) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/subtitles/task/${id}`);
        if (!res.ok) throw new Error("Ошибка при получении статуса рендера");
        const data = await res.json();
        setRenderStatus(data.status);
        setRenderProgress(data.progress || 0);

        if (data.status === "done") {
          stopPolling();
          setVideoResult(data.result);
          showToast("✨ Готово!", "Видео с субтитрами готово!", {
            type: "success",
            duration: 6000,
          });
        } else if (data.status === "error") {
          stopPolling();
          setError(data.error || "Ошибка при рендере");
          showToast("Ошибка", data.error, { type: "error", duration: 5000 });
        }
      } catch (err) {
        stopPolling();
        setError(err.message);
      }
    }, 1000);
  }, []);

  useEffect(() => () => stopPolling(), []);

  // Submit URL
  const handleProcessUrl = async () => {
    if (!url.trim()) { setUrlError("Введите ссылку на видео"); return; }
    if (!url.startsWith("http")) { setUrlError("Ссылка должна начинаться с http://"); return; }
    setUrlError(""); setError(null); setSrtResult(null); setVideoResult(null);
    setTranscribeProgress(0); setTranscribeStatus("started");

    try {
      const res = await fetch(`${API_URL}/subtitles/from-url/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Ошибка: ${res.status}`);
      }
      const data = await res.json();
      setTranscribeTaskId(data.task_id);
      startTranscribePolling(data.task_id);
    } catch (err) {
      setTranscribeStatus(null);
      setError(err.message);
      showToast("Ошибка", err.message, { type: "error", duration: 5000 });
    }
  };

  // Submit file
  const handleFileUpload = async () => {
    if (!file) return;
    setTranscribeStatus("uploading");
    setTranscribeProgress(10);
    setError(null); setSrtResult(null); setVideoResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      setTranscribeProgress(30);
      const res = await fetch(`${API_URL}/subtitles/from-file/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Ошибка: ${res.status}`);
      }
      const data = await res.json();
      setTranscribeTaskId(data.task_id);
      setTranscribeStatus("started");
      setTranscribeProgress(50);
      startTranscribePolling(data.task_id);
    } catch (err) {
      setTranscribeStatus(null);
      setTranscribeProgress(0);
      setError(err.message);
      showToast("Ошибка", err.message, { type: "error", duration: 5000 });
    }
  };

  // Submit render
  const handleRender = async () => {
    if (!transcribeTaskId) return;
    setRenderStatus("rendering");
    setRenderProgress(0);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/subtitles/render/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: transcribeTaskId, ...style }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Ошибка: ${res.status}`);
      }
      const data = await res.json();
      setRenderTaskId(data.task_id);
      startRenderPolling(data.task_id);
    } catch (err) {
      setRenderStatus(null);
      setError(err.message);
      showToast("Ошибка", err.message, { type: "error", duration: 5000 });
    }
  };

  const handleFileSelect = (f) => {
    if (!f.type.startsWith("video/")) { setError("Выберите видеофайл"); return; }
    if (f.size > 2 * 1024 * 1024 * 1024) { setError("Максимальный размер 2GB"); return; }
    setError(null); setFile(f); setSrtResult(null); setVideoResult(null);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type.includes("enter") || e.type.includes("over"));
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleReset = () => {
    stopPolling();
    setTranscribeTaskId(null); setTranscribeStatus(null); setTranscribeProgress(0);
    setSrtResult(null); setRenderTaskId(null); setRenderStatus(null);
    setRenderProgress(0); setVideoResult(null); setError(null);
    setUrl(""); setFile(null);
  };

  // Determine current phase
  const isTranscribing = transcribeStatus && !srtResult && !error;
  const isStyleEditor = srtResult && !renderStatus && !videoResult;
  const isRendering = renderStatus && !videoResult && !error;
  const isDone = !!videoResult;
  const showInput = !transcribeStatus && !srtResult && !videoResult;

  // Live preview style
  const previewColor = COLORS.find(c => c.id === style.color)?.hex || "#fff";
  const previewFontSize = Math.round(style.font_size * 0.6);
  const previewAlign = { top: "flex-start", center: "center", bottom: "flex-end" }[style.position];

  return (
    <div className="relative flex-col items-center justify-center px-4 py-16 sm:py-24 md:py-32 min-h-[calc(100vh-80px)] overflow-hidden flex flex-1 w-full flex-grow">
      {/* Ambient Orbs */}
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Hero */}
      <div className="relative z-10 text-center mb-10 sm:mb-16 max-w-3xl px-2 sm:px-4 animate-fade-in-up">
        <HeroBadge />
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 text-zinc-100">
          Субтитры{" "}
          <span className="gradient-text sm:text-glow">прямо в видео</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed font-normal max-w-xl mx-auto">
          AI распознаёт речь, ты выбираешь стиль — и получаешь готовое видео с вшитыми субтитрами.
        </p>
      </div>

      {/* Main Card */}
      <div className="relative z-20 w-full max-w-2xl animate-fade-in-up delay-100 flex-none mx-auto">
        <div className="glass rounded-[32px] overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Error */}
          {error && (
            <div className="mx-6 mt-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={handleReset} className="text-zinc-500 hover:text-zinc-300 text-xs">сброс</button>
            </div>
          )}

          {/* ── PHASE 1: Input ── */}
          {showInput && (
            <>
              <TabSwitcher tab={tab} setTab={setTab} tabs={TABS} />
              <div className="p-6 sm:p-10 pt-4 flex flex-col gap-4">
                {tab === "url" ? (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase">Ссылка на видео</label>
                      <div className="flex items-center gap-2 glass-input rounded-xl px-3">
                        <LinkIcon size={16} className="text-zinc-500" />
                        <input
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={url}
                          onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                          onKeyDown={e => e.key === "Enter" && url && handleProcessUrl()}
                          className="flex-1 bg-transparent py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                        />
                      </div>
                      {urlError && <p className="text-xs text-red-400">{urlError}</p>}
                    </div>
                    <LanguageSelect value={language} onChange={setLanguage} />
                    <Button variant="primary" size="lg" disabled={!url} onClick={handleProcessUrl} className="w-full h-12 text-base">
                      Распознать речь
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <div
                      onDragEnter={handleDrag} onDragLeave={handleDrag}
                      onDragOver={handleDrag} onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                        dragActive ? "border-violet-500/50 bg-violet-500/5" : "border-white/[0.08] hover:border-white/[0.15]"
                      }`}
                    >
                      <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.04] text-zinc-400">
                        <Upload size={20} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-zinc-300">{dragActive ? "Отпусти файл" : "Выбери или перетащи видео"}</p>
                        <p className="text-xs text-zinc-500">MP4, MOV, AVI до 2GB</p>
                      </div>
                    </div>
                    {file && (
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileVideo size={16} className="text-violet-400" />
                          <p className="text-sm text-zinc-200 truncate max-w-[280px]">{file.name}</p>
                        </div>
                        <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
                      </div>
                    )}
                    <LanguageSelect value={language} onChange={setLanguage} />
                    <Button variant="primary" size="lg" disabled={!file} onClick={handleFileUpload} className="w-full h-12 text-base">
                      Распознать речь
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PHASE 2: Transcribing ── */}
          {isTranscribing && (
            <div className="p-6 sm:p-10 flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-2xl opacity-40 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={40} className="text-violet-300 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-violet-300 mb-1">
                  {transcribeStatus === "uploading" ? "Загружаю файл..." :
                   transcribeStatus === "downloading" ? "Скачиваю видео..." :
                   transcribeStatus === "extracting_audio" ? "Извлекаю аудио..." :
                   transcribeStatus === "transcribing" ? "AI распознаёт речь..." :
                   "Обрабатываю..."}
                </p>
                <p className="text-xs text-zinc-500">Это может занять несколько минут</p>
              </div>
              <ProgressBar progress={transcribeProgress} />
              <div className="grid grid-cols-4 gap-2 w-full">
                {[
                  { label: "Загрузка",    done: transcribeProgress > 10 },
                  { label: "Аудио",       done: transcribeProgress > 25 },
                  { label: "Распознавание",done: transcribeProgress > 70 },
                  { label: "Готово",      done: transcribeProgress === 100 },
                ].map((step, i) => (
                  <div key={i} className={`text-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    step.done ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/5 text-zinc-500 border border-white/10"
                  }`}>
                    {step.done ? "✓" : "○"} {step.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 3: Style editor ── */}
          {isStyleEditor && (
            <div className="p-6 sm:p-10 flex flex-col gap-6 animate-fade-in">
              <div className="text-center">
                <p className="text-base font-bold text-emerald-400 mb-1">✓ Речь распознана — {srtResult.segment_count} фраз</p>
                <p className="text-sm text-zinc-400">Настрой стиль субтитров и создай видео</p>
              </div>

              {/* Live preview */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                <div className="absolute inset-0 flex flex-col" style={{ justifyContent: previewAlign, padding: "12px 20px" }}>
                  <span
                    style={{
                      color: previewColor,
                      fontSize: `${previewFontSize}px`,
                      fontWeight: style.bold ? 700 : 400,
                      textShadow: style.outline
                        ? `1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000`
                        : "none",
                      lineHeight: 1.3,
                      textAlign: "center",
                      display: "block",
                      width: "100%",
                    }}
                  >
                    {srtResult.srt_preview?.split("\n").filter(l => !l.match(/^\d+$/) && !l.includes("-->") && l.trim())[0]
                      || "Пример текста субтитра"}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Play size={18} className="text-white/40 ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Style controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Font size */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Размер</p>
                  <div className="flex gap-2">
                    {FONT_SIZES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setStyle(p => ({ ...p, font_size: s.value }))}
                        className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${
                          style.font_size === s.value
                            ? "bg-violet-600 text-white"
                            : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Цвет текста</p>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setStyle(p => ({ ...p, color: c.id }))}
                        title={c.label}
                        className={`flex-1 h-9 rounded-lg transition-all border-2 ${
                          style.color === c.id ? "border-violet-500 scale-105" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c.hex + "33", }}
                      >
                        <span className="block w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: c.hex }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Позиция</p>
                  <div className="flex gap-2">
                    {POSITIONS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setStyle(prev => ({ ...prev, position: p.id }))}
                        className={`flex-1 h-9 rounded-lg text-sm transition-all ${
                          style.position === p.id
                            ? "bg-violet-600 text-white"
                            : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                        }`}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Эффекты</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyle(p => ({ ...p, bold: !p.bold }))}
                      className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${
                        style.bold ? "bg-violet-600 text-white" : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                      }`}
                    >
                      B Жирный
                    </button>
                    <button
                      onClick={() => setStyle(p => ({ ...p, outline: !p.outline }))}
                      className={`flex-1 h-9 rounded-lg text-sm transition-all ${
                        style.outline ? "bg-violet-600 text-white" : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                      }`}
                    >
                      ◻ Обводка
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <Button variant="primary" size="lg" onClick={handleRender} className="w-full h-12 text-base">
                Создать видео с субтитрами
              </Button>
              <button
                onClick={handleReset}
                className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-sm hover:bg-white/[0.08]"
              >
                Загрузить другое видео
              </button>
            </div>
          )}

          {/* ── PHASE 4: Rendering ── */}
          {isRendering && (
            <div className="p-6 sm:p-10 flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 rounded-full blur-2xl opacity-40 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={40} className="text-fuchsia-300 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-fuchsia-300 mb-1">Вжигаю субтитры в видео...</p>
                <p className="text-xs text-zinc-500">FFmpeg накладывает твой стиль — это займёт минуту</p>
              </div>
              <ProgressBar progress={renderProgress} color="fuchsia" />
            </div>
          )}

          {/* ── PHASE 5: Done ── */}
          {isDone && (
            <div className="p-6 sm:p-10 flex flex-col gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-center">
                <p className="text-2xl font-black text-emerald-300 mb-1">✨ Готово!</p>
                <p className="text-sm text-zinc-400">Видео с вшитыми субтитрами готово к скачиванию</p>
              </div>

              <a
                href={`${API_URL}${videoResult.video_url}`}
                download={videoResult.video_filename}
                className="inline-flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
              >
                <Download size={20} />
                Скачать видео с субтитрами
              </a>

              <button
                onClick={handleReset}
                className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-sm hover:bg-white/[0.08]"
              >
                Обработать другое видео
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LanguageSelect({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-zinc-400 uppercase">Язык речи</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-xl glass-input text-sm text-zinc-200 focus:outline-none"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

function ProgressBar({ progress, color = "violet" }) {
  const from = color === "fuchsia" ? "from-fuchsia-600" : "from-violet-600";
  const via  = color === "fuchsia" ? "via-violet-600"   : "via-fuchsia-600";
  const to   = color === "fuchsia" ? "to-fuchsia-600"   : "to-violet-600";
  const shadow = color === "fuchsia" ? "shadow-fuchsia-500/50" : "shadow-violet-500/50";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-zinc-300">Прогресс</span>
        <span className="text-lg font-bold text-violet-400">{progress}%</span>
      </div>
      <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden border border-violet-500/20">
        <div
          className={`h-full bg-gradient-to-r ${from} ${via} ${to} transition-all duration-300 shadow-lg ${shadow}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
