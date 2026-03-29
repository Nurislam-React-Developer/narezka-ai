"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, Eraser, Download, X, AlertCircle, Info, Link, RotateCcw, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import TabSwitcher from "@/components/ui/TabSwitcher";
import { API_URL } from "@/lib/config";
import { showToast } from "@/lib/useToast";

const TABS = [
  { id: "url", label: "По ссылке" },
  { id: "file", label: "Из файла" },
];

const METHODS = [
  { id: "blur", label: "Размытие", hint: "Гауссово размытие — самый надёжный способ" },
  { id: "pixelate", label: "Пикселизация", hint: "Пиксели поверх знака" },
  { id: "delogo", label: "Восстановление", hint: "Интерполяция фона (для простых фонов)" },
];

// ─── Таб 1: скачать без знака по ссылке ─────────────────────────────────────

function UrlTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [filename, setFilename] = useState("video.mp4");

  const isValid = url.trim().startsWith("http");

  const handleDownload = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    setDownloadUrl(null);

    try {
      const res = await fetch(`${API_URL}/download-clean/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Ошибка сервера: ${res.status}`);
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const name = match?.[1] || "video.mp4";

      setDownloadUrl(URL.createObjectURL(blob));
      setFilename(name);
      showToast("✨ Видео готово!", "Видео без водяного знака загружено.", { type: "success", duration: 5000 });
    } catch (e) {
      setError(e.message || "Ошибка при скачивании");
      showToast("Ошибка", e.message || "Ошибка при скачивании видео", { type: "error", duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setUrl("");
    setError("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">
          Вставь ссылку на TikTok, Instagram, VK, YouTube — получишь чистое видео без водяного знака.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 glass-input rounded-xl px-3">
            <Link size={15} className="text-zinc-500 shrink-0" />
            <input
              type="url"
              placeholder="https://tiktok.com/@user/video/..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); setDownloadUrl(null); }}
              onKeyDown={(e) => e.key === "Enter" && !loading && isValid && handleDownload()}
              className="flex-1 bg-transparent py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {url && (
              <button onClick={() => { setUrl(""); setError(""); setDownloadUrl(null); }} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-3 py-2.5 rounded-lg">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {downloadUrl ? (
        <div className="flex flex-col gap-3">
          <a
            href={downloadUrl}
            download={filename}
            className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Download size={20} /> Скачать видео без знака
          </a>
          <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center">
            Скачать другое видео
          </button>
        </div>
      ) : (
        <button
          onClick={handleDownload}
          disabled={!isValid || loading}
          className={`relative overflow-hidden inline-flex items-center justify-center gap-3 h-14 rounded-2xl font-bold text-base transition-all duration-300 w-full
            ${isValid && !loading
              ? "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 text-white glow-accent hover:opacity-95 active:scale-[0.97]"
              : "bg-white/[0.04] text-zinc-500 cursor-not-allowed border border-white/[0.06]"
            }`}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Скачиваем...
            </>
          ) : (
            <>
              <Download size={20} />
              Скачать без водяного знака
            </>
          )}
        </button>
      )}

      {loading && (
        <p className="text-xs text-zinc-500 text-center animate-pulse">
          Скачиваем видео с сервера — это может занять несколько секунд...
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-1">
        {["TikTok", "Instagram", "VK"].map((p) => (
          <div key={p} className="text-center py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-zinc-500">
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Таб 2: удалить знак из файла вручную ───────────────────────────────────

function FileTab() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [method, setMethod] = useState("blur");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoDims = useRef({ width: 0, height: 0 });
  const frameBitmap = useRef(null);

  useEffect(() => {
    if (!file) return;
    setFrameReady(false);
    setSelection(null);
    setDownloadUrl(null);
    setError("");

    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    video.src = url;

    const drawFrame = async () => {
      const canvas = canvasRef.current;
      if (!canvas || video.videoWidth === 0) return;
      const maxW = 640;
      const ratio = Math.min(1, maxW / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * ratio);
      canvas.height = Math.round(video.videoHeight * ratio);
      videoDims.current = { width: video.videoWidth, height: video.videoHeight };
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frameBitmap.current = await createImageBitmap(canvas);
      setFrameReady(true);
    };

    video.onloadedmetadata = () => {
      const dur = video.duration;
      video.currentTime = Math.min(0.5, dur > 0 ? dur * 0.1 : 0);
    };
    video.onseeked = drawFrame;
    video.oncanplay = () => { if (!frameReady) drawFrame(); };

    return () => {
      URL.revokeObjectURL(url);
      video.src = "";
      frameBitmap.current = null;
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const redrawCanvas = useCallback(() => {
    if (!frameReady || !canvasRef.current || !frameBitmap.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(frameBitmap.current, 0, 0);
    if (selection && selection.w > 2 && selection.h > 2) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frameBitmap.current, selection.x, selection.y, selection.w, selection.h, selection.x, selection.y, selection.w, selection.h);
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 11px sans-serif";
      const rx = videoDims.current.width / canvas.width;
      const ry = videoDims.current.height / canvas.height;
      ctx.fillText(`${Math.round(selection.w * rx)}×${Math.round(selection.h * ry)} px`, selection.x + 4, selection.y + 14);
    }
  }, [frameReady, selection]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onMouseDown = (e) => { if (!frameReady) return; const p = getPos(e); setIsDrawing(true); setDrawStart(p); setSelection(null); };
  const onMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;
    const p = getPos(e);
    setSelection({ x: Math.min(p.x, drawStart.x), y: Math.min(p.y, drawStart.y), w: Math.abs(p.x - drawStart.x), h: Math.abs(p.y - drawStart.y) });
  };
  const onMouseUp = () => setIsDrawing(false);

  const handleFile = (f) => {
    if (!f.type.startsWith("video/")) { setError("Только видеофайлы"); return; }
    setError(""); setFile(f);
  };

  const handleProcess = async () => {
    if (!file || !selection || selection.w < 5 || selection.h < 5) return;
    setProcessing(true); setError(""); setDownloadUrl(null);
    const canvas = canvasRef.current;
    const sx = videoDims.current.width / canvas.width;
    const sy = videoDims.current.height / canvas.height;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("x", Math.round(selection.x * sx));
    fd.append("y", Math.round(selection.y * sy));
    fd.append("w", Math.round(selection.w * sx));
    fd.append("h", Math.round(selection.h * sy));
    fd.append("method", method);
    try {
      const res = await fetch(`${API_URL}/remove-watermark/`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.detail || `Ошибка: ${res.status}`); }
      setDownloadUrl(URL.createObjectURL(await res.blob()));
      showToast("✨ Готово!", "Водяной знак удалён. Скачивай чистое видео.", { type: "success", duration: 5000 });
    } catch (e) {
      setError(e.message || "Ошибка при обработке");
      showToast("Ошибка", e.message || "Ошибка при обработке видео", { type: "error", duration: 5000 });
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null); setFrameReady(false); setSelection(null); setDownloadUrl(null); setError("");
  };

  const hasSelection = selection && selection.w >= 5 && selection.h >= 5;

  return (
    <div className="flex flex-col gap-5">
      <video ref={videoRef} className="hidden" playsInline />

      {!file ? (
        <div
          role="button" tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          className={`relative flex flex-col items-center justify-center gap-4 h-44 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
            dragActive ? "border-violet-500/50 bg-violet-500/5 ring-4 ring-violet-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
          }`}
        >
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragActive ? "bg-violet-500/10 text-violet-400" : "bg-white/[0.04] text-zinc-400"}`}>
            <UploadCloud size={24} />
          </div>
          <p className="text-sm font-medium text-zinc-300">{dragActive ? "Бросайте!" : "Выберите или перетащите видео"}</p>
          <p className="text-xs text-zinc-500">MP4, MOV, AVI до 2 GB</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <span className="text-sm text-zinc-300 truncate">{file.name}</span>
            <button onClick={reset} className="text-zinc-500 hover:text-red-400 transition-colors ml-3 shrink-0"><X size={16} /></button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Метод</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)} title={m.hint}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    method === m.id ? "border-violet-500/60 bg-violet-500/15 text-violet-300" : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                  }`}
                >{m.label}</button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">{METHODS.find((m) => m.id === method)?.hint}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Info size={12} />
              {frameReady ? "Зажми мышь и обведи область с водяным знаком" : "Загружаем кадр..."}
              {hasSelection && (
                <button onClick={() => setSelection(null)} className="ml-auto flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <RotateCcw size={10} /> сбросить
                </button>
              )}
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black/50">
              <canvas
                ref={canvasRef}
                className={`w-full rounded-xl select-none ${frameReady ? "cursor-crosshair" : "opacity-30"}`}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              />
              {!frameReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {downloadUrl ? (
            <div className="flex flex-col gap-3">
              <a href={downloadUrl} download="watermark_removed.mp4"
                className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
              >
                <Download size={20} /> Скачать чистое видео
              </a>
              <button onClick={() => { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); setSelection(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center"
              >
                Обработать с другой областью
              </button>
            </div>
          ) : (
            <Button variant="primary" size="lg" disabled={!hasSelection} loading={processing} icon={Eraser} onClick={handleProcess} className="w-full h-14 text-base">
              {processing ? "Обрабатываем..." : "Удалить водяной знак"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function WatermarkContent() {
  const [tab, setTab] = useState("url");

  return (
    <div className="relative flex-col items-center justify-center px-4 py-16 sm:py-24 md:py-32 min-h-[calc(100vh-80px)] overflow-hidden flex flex-1 w-full flex-grow">
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center mb-10 sm:mb-16 max-w-3xl px-2 sm:px-4 animate-fade-in-up">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 text-zinc-100">
          Видео без <span className="gradient-text sm:text-glow">водяного знака</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl mx-auto">
          Вставь ссылку — скачаем чистый оригинал. Или загрузи файл и вырежи знак вручную.
        </p>
      </div>

      <div className="relative z-20 w-full max-w-2xl animate-fade-in-up delay-100 mx-auto">
        <div className="glass rounded-[32px] overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <TabSwitcher tab={tab} setTab={setTab} tabs={TABS} />
          <div className="p-6 sm:p-10 pt-4">
            {tab === "url" ? <UrlTab /> : <FileTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
