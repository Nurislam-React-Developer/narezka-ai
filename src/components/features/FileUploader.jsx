"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, X, Check, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import DurationPicker from "@/components/features/DurationPicker";
import { API_URL } from "@/lib/config";

export default function FileUploader({ initialFile = null, onFileSet }) {
  const router = useRouter();
  const inputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(60);

  const validateFile = (f) => {
    if (!f) return "Файл не выбран";
    if (!f.type.startsWith("video/")) return "Только видеофайлы (.mp4, .mov)";
    if (f.size > 2 * 1024 * 1024 * 1024) return "Файл слишком большой (макс. 2 GB)";
    return null;
  };

  const handleFile = useCallback((f) => {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); }
    else { setError(""); setFile(f); }
  }, []);

  // Когда родитель передал файл через глобальный D&D
  useEffect(() => {
    if (initialFile) {
      handleFile(initialFile);
      onFileSet?.();
    }
  }, [initialFile, handleFile, onFileSet]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/upload-and-cut/?segment_duration=${segmentDuration}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail?.message || errData?.detail || `Ошибка: ${response.status}`);
      }

      const data = await response.json();
      sessionStorage.setItem("cutResult", JSON.stringify(data));
      router.push("/settings");
    } catch (err) {
      setError(err.message || "Ошибка при загрузке видео.");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        className={`
          relative flex flex-col items-center justify-center gap-4
          h-48 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragActive
            ? "border-violet-500/50 bg-violet-500/5 ring-4 ring-violet-500/10"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5"
            : error
            ? "border-red-500/30 bg-red-500/5"
            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
          }
        `}
      >
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {file ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
              <Check size={24} />
            </div>
            <p className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-zinc-500 mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setError(""); }}
              className="mt-3 text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Удалить
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center transition-colors ${dragActive ? "bg-violet-500/10 text-violet-400" : "bg-white/[0.04] text-zinc-400"}`}>
              {dragActive ? <FileVideo size={24} /> : <UploadCloud size={24} />}
            </div>
            <p className="text-sm font-medium text-zinc-300">
              {dragActive ? "Бросайте файл!" : "Выберите файл или перетащите сюда"}
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">MP4, MOV до 2 GB</p>
          </div>
        )}
      </div>

      <DurationPicker value={segmentDuration} onChange={setSegmentDuration} />

      {error && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-3 py-2 rounded-lg animate-fade-in">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        disabled={!file}
        loading={uploading}
        icon={UploadCloud}
        onClick={handleUpload}
        className="w-full"
      >
        {uploading ? "Загружаем..." : "Загрузить видео"}
      </Button>
    </div>
  );
}
