"""
main.py — Точка входа FastAPI-приложения.

Структура проекта:
  backend/
  ├── main.py              ← вы здесь
  ├── config.py            ← конфигурация (пути, константы)
  ├── schemas.py           ← Pydantic-модели запросов
  ├── routes/
  │   ├── video.py         ← эндпоинты обработки видео
  │   └── health.py        ← health-check
  └── services/
      ├── ffmpeg.py        ← работа с ffmpeg (нарезка, длительность)
      ├── downloader.py    ← скачивание через yt-dlp
      └── cutter.py        ← оркестрация нарезки + метаданные

Запуск:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from config import BASE_DIR, INPUTS_DIR, OUTPUTS_DIR, SUBTITLES_DIR
from routes.video import router as video_router
from routes.health import router as health_router
from routes.watermark import router as watermark_router
from routes.subtitles import router as subtitles_router

# ---------------------------------------------------------------------------
# Инициализация FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Video Auto-Cut API",
    description=(
        "REST API для автоматической нарезки видео на равные сегменты с помощью ffmpeg. "
        "Поддерживает загрузку файлов и скачивание по URL через yt-dlp."
    ),
    version="3.0.0",
)

# GZip — сжимаем JSON-ответы (метаданные, статусы задач)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — разрешаем запросы от любого клиента (фронтенд, телефон, Vercel и т.д.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    """Добавляет Cache-Control заголовки для видеофайлов — браузер кеширует на 24 часа."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/outputs/") and path.endswith(".mp4"):
        response.headers["Cache-Control"] = "public, max-age=86400"
        response.headers["Accept-Ranges"] = "bytes"
    return response

# Статические файлы — раздаём нарезанные клипы и субтитры
# Монтируем директорию с клипами напрямую
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs/clips", StaticFiles(directory=str(OUTPUTS_DIR)), name="clips")

# Монтируем директорию с субтитрами
SUBTITLES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs/subtitles", StaticFiles(directory=str(SUBTITLES_DIR)), name="subtitles")

# Fallback: раздаём родительскую папку outputs целиком (для metadata.json, report.md)
_static_parent = OUTPUTS_DIR.parent
_static_parent.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(_static_parent)), name="outputs")

# Роуты
app.include_router(video_router)
app.include_router(health_router)
app.include_router(watermark_router)
app.include_router(subtitles_router)


async def cleanup_old_files_task():
    """Фоновая задача: очищает только inputs/ (временные исходники) раз в час.
    Клипы в outputs/clips/ НЕ удаляются автоматически — пользователь управляет ими вручную."""
    while True:
        try:
            now = time.time()
            max_age_seconds = 2 * 3600  # 2 часа — страховка если нарезка упала на половине
            deleted_count: int = 0

            for file_path in INPUTS_DIR.glob("*"):
                if file_path.is_file() and (now - file_path.stat().st_mtime) > max_age_seconds:
                    file_path.unlink(missing_ok=True)
                    deleted_count += 1

            if deleted_count > 0:
                print(f"[cleanup] Очищено временных исходников: {deleted_count} шт.")
        except Exception as e:
            print(f"[cleanup] Ошибка при очистке: {e}")

        await asyncio.sleep(3600)


@app.on_event("startup")
async def create_directories() -> None:
    """Создаёт рабочие директории при старте и запускает автоочистку."""
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    SUBTITLES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[startup] Директории готовы:\n  {INPUTS_DIR}\n  {OUTPUTS_DIR}\n  {SUBTITLES_DIR}")

    # Запускаем сборщик мусора в фоне
    asyncio.create_task(cleanup_old_files_task())
