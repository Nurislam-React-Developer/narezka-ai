/**
 * Базовый URL бэкенда
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "${API_URL}";

/**
 * Обёртка над fetch с базовыми заголовками
 * @param {string} path
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  return response;
}

/**
 * Отправить URL видео на обработку
 * @param {{ url: string, mode: string, preset: string, subtitles: boolean }} payload
 * @returns {Promise<{ job_id: string }>}
 */
export async function submitVideoUrl(payload) {
  const res = await apiFetch("/api/process-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

/**
 * Загрузить файл на сервер
 * @param {File} file
 * @param {{ mode: string, preset: string, subtitles: boolean }} settings
 * @returns {Promise<{ job_id: string }>}
 */
export async function uploadVideoFile(file, settings) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("settings", JSON.stringify(settings));

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Получить статус задания
 * @param {string} jobId
 * @returns {Promise<{ status: string, progress: number, clips: Array }>}
 */
export async function getJobStatus(jobId) {
  const res = await apiFetch(`/api/jobs/${jobId}`);
  return res.json();
}

/**
 * Получить результаты нарезки
 * @param {string} jobId
 * @returns {Promise<{ clips: Array, report: Object }>}
 */
export async function getJobResults(jobId) {
  const res = await apiFetch(`/api/jobs/${jobId}/results`);
  return res.json();
}
