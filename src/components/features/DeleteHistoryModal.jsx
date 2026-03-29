"use client";

import { useState } from "react";
import { Trash2, X, CheckSquare, Square, AlertTriangle, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

// step: "choose" | "select" | "confirm-all"
export default function DeleteHistoryModal({ sessions, onClose, onDeleted }) {
  const [step, setStep] = useState("choose");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const toggleSession = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((_, i) => i)));
    }
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/results/`, { method: "DELETE" });
      onDeleted("all");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/results/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...selected]),
      });
      onDeleted("selected", [...selected]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
        {/* Top shine */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Удалить историю</h2>
              <p className="text-xs text-zinc-500">
                {step === "select"
                  ? `Выбрано ${selected.size} из ${sessions.length}`
                  : `${sessions.length} сессий в истории`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">

          {/* ─── STEP: choose ─── */}
          {step === "choose" && (
            <div className="space-y-3 mt-2">
              {/* Удалить всё */}
              <button
                onClick={() => setStep("confirm-all")}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 group-hover:bg-red-500/25 transition-colors">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-100 text-sm">Удалить всю историю</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Удалит все {sessions.length} сессий и видеофайлы с сервера</p>
                </div>
                <div className="ml-auto text-zinc-600 group-hover:text-red-400 transition-colors">→</div>
              </button>

              {/* Выбрать сессии */}
              <button
                onClick={() => setStep("select")}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 group-hover:bg-violet-500/25 transition-colors">
                  <CheckSquare size={20} className="text-violet-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-100 text-sm">Выбрать сессии</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Отметить конкретные видео для удаления</p>
                </div>
                <div className="ml-auto text-zinc-600 group-hover:text-violet-400 transition-colors">→</div>
              </button>
            </div>
          )}

          {/* ─── STEP: confirm-all ─── */}
          {step === "confirm-all" && (
            <div className="mt-2 space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">
                  Будут удалены <span className="font-bold">все {sessions.length} сессий</span> и все видеофайлы с сервера. Это действие необратимо.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 rounded-2xl glass text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Удаляем...</> : "Удалить всё"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP: select ─── */}
          {step === "select" && (
            <div className="mt-2 space-y-4">
              {/* Select all toggle */}
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {selected.size === sessions.length
                  ? <CheckSquare size={14} className="text-violet-400" />
                  : <Square size={14} />}
                {selected.size === sessions.length ? "Снять все" : "Выбрать все"}
              </button>

              {/* Sessions list */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {sessions.map((session, index) => {
                  const isChecked = selected.has(index);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleSession(index)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 text-left
                        ${isChecked
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                        }`}
                    >
                      {isChecked
                        ? <CheckSquare size={16} className="text-red-400 shrink-0" />
                        : <Square size={16} className="text-zinc-600 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">
                          {session.original_filename || session.source_file || "Неизвестное видео"}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{session.total_clips} клипов · {session.segment_duration_seconds}с</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 rounded-2xl glass text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={loading || selected.size === 0}
                  className="flex-1 py-3 rounded-2xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Удаляем...</>
                    : `Удалить ${selected.size > 0 ? selected.size : ""} выбранных`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
