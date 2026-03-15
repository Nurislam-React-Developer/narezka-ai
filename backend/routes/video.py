"""
routes/video.py — Эндпоинты для работы с видео.
"""

import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse

from config import (
    ALLOWED_VIDEO_EXTENSIONS,
    BASE_DIR,
    DEFAULT_SEGMENT_DURATION,
    INPUTS_DIR,
    OUTPUTS_DIR,
)
from schemas import UrlRequest
from services.cutter import cut_and_save_metadata
from services.downloader import download_video
from services.task_manager import create_task, get_task, update_task_progress, set_task_done, set_task_error

router = APIRouter(tags=["Video Processing"])

async def _run_pipeline(task_id: str, url: str, segment_duration: int):
    try:
        update_task_progress(task_id, "downloading", 0)
        unique_prefix = uuid.uuid4().hex[:8]

        # 1. Скачивание
        downloaded_path = await download_video(url, INPUTS_DIR, unique_prefix, task_id)

        # 2. Нарезка
        update_task_progress(task_id, "cutting", 0)
        base_name = f"{unique_prefix}_{downloaded_path.stem}"
        result = await asyncio.to_thread(
            cut_and_save_metadata,
            downloaded_path,
            base_name,
            downloaded_path.name,
            url,
            segment_duration,
        )

        result["source_url"] = url
        set_task_done(task_id, result)

    except HTTPException as e:
        err_detail = e.detail.get("message") if isinstance(e.detail, dict) else e.detail
        set_task_error(task_id, str(err_detail))
    except Exception as e:
        set_task_error(task_id, f"Внутренняя ошибка: {str(e)}")


@router.post(
    "/process-url/",
    summary="Скачать видео по URL и нарезать на клипы (Асинхронно)",
)
async def process_url(body: UrlRequest, background_tasks: BackgroundTasks) -> JSONResponse:
    """Стартует фоновую задачу по скачиванию и возвращает task_id для отслеживания."""
    task_id = create_task()
    background_tasks.add_task(_run_pipeline, task_id, body.url, body.segment_duration)
    return JSONResponse(status_code=200, content={"task_id": task_id})


@router.get(
    "/task/{task_id}",
    summary="Получить статус задачи",
)
async def get_task_status(task_id: str) -> JSONResponse:
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return JSONResponse(status_code=200, content=task)


@router.get(
    "/results/",
    summary="Получить результаты всех загрузок",
)
async def get_results() -> JSONResponse:
    """Возвращает список всех нарезанных клипов из metadata.json."""
    metadata_path = OUTPUTS_DIR / "metadata.json"

    if not metadata_path.exists():
        return JSONResponse(status_code=200, content={"status": "success", "data": []})

    try:
        with metadata_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = [data]
    except (json.JSONDecodeError, OSError):
        data = []

    return JSONResponse(status_code=200, content={"status": "success", "data": data})
