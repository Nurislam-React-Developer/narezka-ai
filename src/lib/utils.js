/**
 * Проверяет, является ли строка валидным HTTP/HTTPS URL
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Форматирует секунды в читаемый таймкод  MM:SS или HH:MM:SS
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTimecode(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Форматирует длительность в секундах в человекочитаемую строку
 * @param {number} seconds
 * @returns {string}  e.g. "1 ч 2 мин" | "45 сек"
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

/**
 * Форматирует размер файла в байтах
 * @param {number} bytes
 * @returns {string}  e.g. "2.4 MB"
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Задержка (для имитации загрузки)
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Склеивает className строки, отфильтровывая falsy
 * @param {...string} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
