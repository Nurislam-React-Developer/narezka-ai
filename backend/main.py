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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import BASE_DIR, INPUTS_DIR, OUTPUTS_DIR
from routes.video import router as video_router
from routes.health import router as health_router

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

# CORS — разрешаем запросы от любого клиента (фронтенд, телефон, Vercel и т.д.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы — раздаём нарезанные клипы
# Монтируем директорию с клипами напрямую
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs/clips", StaticFiles(directory=str(OUTPUTS_DIR)), name="clips")
# Fallback: раздаём родительскую папку outputs целиком (для metadata.json, report.md)
_static_parent = OUTPUTS_DIR.parent
_static_parent.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(_static_parent)), name="outputs")

# Роуты
app.include_router(video_router)
app.include_router(health_router)


@app.on_event("startup")
async def create_directories() -> None:
    """Создаёт рабочие директории при старте."""
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[startup] Директории готовы:\n  {INPUTS_DIR}\n  {OUTPUTS_DIR}")
