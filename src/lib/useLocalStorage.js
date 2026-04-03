/**
 * useLocalStorage — универсальный хук, работает как useState,
 * но автоматически синхронизирует значение с localStorage.
 *
 * Особенности:
 * - SSR-безопасен (чтение только на клиенте)
 * - Автоматическая JSON-сериализация/десериализация
 * - Обновляет состояние при изменении localStorage из другой вкладки
 *
 * Использование:
 *   const [duration, setDuration] = useLocalStorage('segmentDuration', 60);
 */

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage(key, defaultValue) {
  // Инициализируем из localStorage только на клиенте
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Сохраняем при каждом изменении
  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(next));
          }
        } catch {
          // localStorage недоступен (приватный режим / полный диск) — молча игнорируем
        }
        return next;
      });
    },
    [key]
  );

  // Синхронизация между вкладками
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  return [storedValue, setValue];
}
