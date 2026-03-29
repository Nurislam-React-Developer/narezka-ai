"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, AlertCircle, X, ExternalLink, ListVideo } from "lucide-react";

const STATUS_LABELS = {
  starting:    "Инициализация...",
  downloading: "Скачивание",
  cutting:     "Нарезка",
  done:        "Готово",
  error:       "Ошибка",
};

function TaskRow({ task, onRemove }) {
  const router = useRouter();
  const { taskId, url, status, progress, result, error } = task;

  const isDone    = status === "done";
  const isError   = status === "error";
  const isActive  = !isDone && !isError;

  const openResults = () => {
    if (result) {
      sessionStorage.setItem("cutResult", JSON.stringify(result));
      router.push("/results");
    }
  };

  const shortUrl = (() => {
    try {
      const u = new URL(url);
      return (u.hostname + u.pathname).slice(0, 40) + (url.length > 50 ? "…" : "");
    } catch {
      return url.slice(0, 40);
    }
  })();

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${
      isDone  ? "border-emerald-500/20 bg-emerald-500/5" :
      isError ? "border-red-500/20 bg-red-500/5" :
                "border-white/[0.06] bg-white/[0.02]"
    }`}>
      <div className="flex items-center gap-2">
        {/* Status icon */}
        <div className="shrink-0">
          {isDone   && <CheckCheck size={14} className="text-emerald-400" />}
          {isError  && <AlertCircle size={14} className="text-red-400" />}
          {isActive && <Loader2 size={14} className="text-violet-400 animate-spin" />}
        </div>

        {/* URL */}
        <span className="flex-1 text-xs text-zinc-400 truncate font-mono">{shortUrl}</span>

        {/* Status label */}
        <span className={`text-[10px] font-semibold shrink-0 ${
          isDone ? "text-emerald-400" : isError ? "text-red-400" : "text-violet-400"
        }`}>
          {STATUS_LABELS[status] || status}
          {isActive && progress > 0 ? ` ${progress}%` : ""}
        </span>

        {/* Remove button */}
        {(isDone || isError) && (
          <button
            onClick={() => onRemove(taskId)}
            className="shrink-0 p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress || 5}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {isError && error && (
        <p className="text-[10px] text-red-400 leading-relaxed">{error}</p>
      )}

      {/* Open results button */}
      {isDone && result && (
        <button
          onClick={openResults}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
        >
          <ExternalLink size={11} />
          Открыть результаты ({result.total_clips} клипов)
        </button>
      )}
    </div>
  );
}

export default function TaskQueue({ queue, onRemove }) {
  if (!queue || queue.length === 0) return null;

  const activeCount = queue.filter(t => t.status !== "done" && t.status !== "error").length;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <ListVideo size={14} className="text-violet-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Очередь задач
        </span>
        {activeCount > 0 && (
          <span className="ml-auto text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
            {activeCount} активных
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        {queue.map(task => (
          <TaskRow key={task.taskId} task={task} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
