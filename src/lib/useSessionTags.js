/**
 * useSessionTags — хук для управления тегами сессий в истории.
 * Теги хранятся в localStorage: { [sessionId]: tagName }
 *
 * sessionId формируется из filename + кол-ва клипов (уникальный, но стабильный).
 *
 * Использование:
 *   const { getTag, setTag, makeSessionId } = useSessionTags();
 *   const id = makeSessionId(session);
 *   const tag = getTag(id); // "Лекция" | null
 *   setTag(id, "Подкаст");
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "narezka_session_tags";

/** Генерируем стабильный ID сессии из её данных */
export function makeSessionId(session) {
  const name = session.original_filename || session.source_file || "";
  const count = session.total_clips ?? 0;
  const dur = session.segment_duration_seconds ?? 0;
  return `${name}__${count}__${dur}`;
}

function loadTags() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveTags(tags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // ignore
  }
}

export function useSessionTags() {
  const [tags, setTagsState] = useState(loadTags);

  const getTag = useCallback(
    (sessionId) => tags[sessionId] ?? null,
    [tags]
  );

  const setTag = useCallback((sessionId, tag) => {
    setTagsState((prev) => {
      const next = { ...prev };
      if (tag === null) {
        delete next[sessionId];
      } else {
        next[sessionId] = tag;
      }
      saveTags(next);
      return next;
    });
  }, []);

  return { getTag, setTag, tags };
}
