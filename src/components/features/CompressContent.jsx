"use client";

import { useState, useRef } from "react";
import { UploadCloud, ImageDown, Download, X, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { API_URL } from "@/lib/config";
import { showToast } from "@/lib/useToast";

const FORMATS = [
  { id: "webp", label: "WebP" },
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 20 * 1024 * 1024; // 20 МБ

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompressContent() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [format, setFormat] = useState("webp");

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, originalSize, compressedSize }

  const handleFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Допустимые форматы: JPG, PNG, WebP, GIF");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("Максимальный размер 20 МБ");
      return;
    }
    setError("");
    setFile(f);
    setResult(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("quality", quality);
    fd.append("format", format);
    if (width) fd.append("width", parseInt(width, 10));
    if (height) fd.append("height", parseInt(height, 10));

    try {
      const res = await fetch(`${API_URL}/compress-image/`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Ошибка: ${res.status}`);
      }

      const blob = await res.blob();
      const originalSize = parseInt(res.headers.get("X-Original-Size") || file.size, 10);
      const compressedSize = parseInt(res.headers.get("X-Compressed-Size") || blob.size, 10);

      setResult({
        url: URL.createObjectURL(blob),
        originalSize,
        compressedSize,
        filename: `compressed.${format === "jpg" ? "jpg" : format}`,
      });
      showToast("Готово!", "Изображение сжато", { type: "success", duration: 5000 });
    } catch (e) {
      setError(e.message || "Ошибка при сжатии");
      showToast("Ошибка", e.message || "Ошибка при сжатии", { type: "error", duration: 5000 });
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setQuality(80);
    setWidth("");
    setHeight("");
    setFormat("webp");
  };

  const savings = result
    ? Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100))
    : 0;

  return (
    <div className="relative flex-col items-center justify-center px-4 py-16 sm:py-24 md:py-32 min-h-[calc(100vh-80px)] overflow-hidden flex flex-1 w-full flex-grow">
      <div className="hidden sm:block absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/15 blur-[180px] rounded-full pointer-events-none animate-float" />
      <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center mb-10 sm:mb-16 max-w-3xl px-2 sm:px-4 animate-fade-in-up">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 text-zinc-100">
          Сжатие <span className="gradient-text sm:text-glow">фото</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl mx-auto">
          Загрузи картинку — выбери качество, размер и формат. Получишь оптимизированный файл за секунду.
        </p>
      </div>

      <div className="relative z-20 w-full max-w-2xl animate-fade-in-up delay-100 mx-auto">
        <div className="glass rounded-[32px] overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="p-6 sm:p-10 flex flex-col gap-5">
            {/* ── Загрузка файла ────────────────────────────────────────── */}
            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                className={`relative flex flex-col items-center justify-center gap-4 h-44 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  dragActive
                    ? "border-violet-500/50 bg-violet-500/5 ring-4 ring-violet-500/10"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  dragActive ? "bg-violet-500/10 text-violet-400" : "bg-white/[0.04] text-zinc-400"
                }`}>
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  {dragActive ? "Бросайте!" : "Выберите или перетащите изображение"}
                </p>
                <p className="text-xs text-zinc-500">JPG, PNG, WebP, GIF до 20 МБ</p>
              </div>
            ) : (
              <>
                {/* Превью + имя файла */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    {preview && (
                      <img
                        src={preview}
                        alt="preview"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="text-zinc-500 hover:text-red-400 transition-colors ml-3 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── Качество ──────────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Качество</p>
                    <span className="text-sm font-bold text-violet-400">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-white/[0.08] accent-violet-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>Мин. размер</span>
                    <span>Макс. качество</span>
                  </div>
                </div>

                {/* ── Размеры ──────────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Размер (px)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 glass-input rounded-xl px-3">
                      <span className="text-xs text-zinc-500 shrink-0">W</span>
                      <input
                        type="number"
                        placeholder="авто"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        min={1}
                        className="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 glass-input rounded-xl px-3">
                      <span className="text-xs text-zinc-500 shrink-0">H</span>
                      <input
                        type="number"
                        placeholder="авто"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        min={1}
                        className="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600">Оставь пустым — сохранится оригинальный размер</p>
                </div>

                {/* ── Формат ───────────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Формат</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                          format === f.id
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-300"
                            : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Ошибка ───────────────────────────────────────────── */}
                {error && (
                  <div className="flex items-start gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-3 py-2.5 rounded-lg">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                  </div>
                )}

                {/* ── Результат ─────────────────────────────────────────── */}
                {result ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">До</p>
                        <p className="text-sm font-bold text-zinc-200">{formatBytes(result.originalSize)}</p>
                      </div>
                      <div className="text-center py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-zinc-500 mb-1">После</p>
                        <p className="text-sm font-bold text-emerald-400">{formatBytes(result.compressedSize)}</p>
                      </div>
                      <div className="text-center py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-zinc-500 mb-1">Экономия</p>
                        <p className="text-sm font-bold text-emerald-300">{savings}%</p>
                      </div>
                    </div>

                    <a
                      href={result.url}
                      download={result.filename}
                      className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
                    >
                      <Download size={20} /> Скачать сжатое фото
                    </a>

                    <button
                      onClick={reset}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center"
                    >
                      Сжать другое изображение
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    loading={processing}
                    icon={ImageDown}
                    onClick={handleCompress}
                    className="w-full h-14 text-base"
                  >
                    {processing ? "Сжимаем..." : "Сжать"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
