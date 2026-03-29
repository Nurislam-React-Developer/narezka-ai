// Хук для управления тостами (будет использоваться глобально)
import { useState, useCallback } from "react";
import { playNotificationSound } from "./notification";

let globalShowToast = null;

export function setGlobalToastFunction(fn) {
  globalShowToast = fn;
}

// Утилита для показа тоста из любого места в коде
export function showToast(title, message = "", options = {}) {
  if (globalShowToast) {
    globalShowToast({
      type: options.type || "success",
      title,
      message,
      duration: options.duration !== undefined ? options.duration : 4000,
      sound: options.sound !== false,
    });
  }
}

// Хук для управления списком тостов
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = "success", title, message, duration = 4000, sound = true }) => {
    const id = Date.now();
    const toast = { id, type, title, message, duration };

    // Воспроизводим звук уведомления
    if (sound) {
      playNotificationSound();
    }

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Инициализируем глобальную функцию
  if (globalShowToast === null) {
    setGlobalToastFunction(addToast);
  }

  return { toasts, addToast, removeToast };
}
