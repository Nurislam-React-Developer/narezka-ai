"""
routes/video.py — Эндпоинты для работы с видео.
"""

import asyncio
import io
import json
import os
import tempfile
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from config import (
    ALLOWED_VIDEO_EXTENSIONS,
    BASE_DIR,
    DEFAULT_SEGMENT_DURATION,
    INPUTS_DIR,
    OUTPUTS_DIR,
)
from schemas import UrlRequest
from services.cutter import cut_and_save_metadata
from services.downloader import get_stream_info, get_video_preview
from services.task_manager import create_task, get_task, update_task_progress, set_task_done, set_task_error

router = APIRouter(tags=["Video Processing"])

async def _run_pipeline(
    task_id: str,
    url: str,
    segment_duration: int,
    start_time: "float | None" = None,
    end_time: "float | None" = None,
    clip_prefix: "str | None" = None,
):
    try:
        unique_prefix = uuid.uuid4().hex[:8]

        # 1. Получаем прямые URL потоков БЕЗ скачивания на диск
        update_task_progress(task_id, "downloading", 0)
        video_url, audio_url, title = await get_stream_info(url, task_id)

        # 2. FFmpeg читает с URL напрямую и нарезает — inputs/ не используется
        update_task_progress(task_id, "cutting", 0)
        if clip_prefix:
            base_name = f"{clip_prefix}_{unique_prefix}"
        else:
            base_name = f"{unique_prefix}_{title[:40]}"
        result = await asyncio.to_thread(
            cut_and_save_metadata,
            video_url,
            base_name,
            title,
            url,
            segment_duration,
            task_id,
            audio_url,
            start_time,
            end_time,
        )

        result["source_url"] = url
        set_task_done(task_id, result)

    except HTTPException as e:
        err_detail = e.detail.get("message") if isinstance(e.detail, dict) else e.detail
        set_task_error(task_id, str(err_detail))
    except Exception as e:
        set_task_error(task_id, f"Внутренняя ошибка: {str(e)}")


@router.post(
    "/video-preview/",
    summary="Получить метаданные видео (название, длительность, обложка) без скачивания",
)
async def video_preview(body: UrlRequest) -> JSONResponse:
    """Быстрый предпросмотр видео: возвращает title, duration, thumbnail, uploader."""
    info = await get_video_preview(body.url)
    return JSONResponse(status_code=200, content=info)


@router.post(
    "/process-url/",
    summary="Скачать видео по URL и нарезать на клипы (Асинхронно)",
)
async def process_url(body: UrlRequest, background_tasks: BackgroundTasks) -> JSONResponse:
    """Стартует фоновую задачу по скачиванию и возвращает task_id для отслеживания."""
    task_id = create_task()
    background_tasks.add_task(
        _run_pipeline, task_id, body.url, body.segment_duration,
        body.start_time, body.end_time, body.clip_prefix,
    )
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
    summary="Получить результаты всех загрузок (с пагинацией)",
)
async def get_results(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=50),
) -> JSONResponse:
    """Возвращает список нарезанных клипов из metadata.json с пагинацией по сессиям."""
    metadata_path = OUTPUTS_DIR / "metadata.json"

    if not metadata_path.exists():
        return JSONResponse(status_code=200, content={"status": "success", "data": [], "total": 0, "page": page, "limit": limit})

    try:
        with metadata_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = [data]
    except (json.JSONDecodeError, OSError):
        data = []

    # Новые сессии — первыми
    data = list(reversed(data))
    total = len(data)
    start = (page - 1) * limit
    paginated = data[start: start + limit]

    return JSONResponse(status_code=200, content={
        "status": "success",
        "data": paginated,
        "total": total,
        "page": page,
        "limit": limit,
    })


@router.delete(
    "/results/",
    summary="Удалить все сессии и их файлы",
)
async def delete_all_results() -> JSONResponse:
    metadata_path = OUTPUTS_DIR / "metadata.json"
    base_dir = OUTPUTS_DIR.parent.resolve()

    if metadata_path.exists():
        try:
            with metadata_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = [data]
        except (json.JSONDecodeError, OSError):
            data = []

        for session in data:
            for clip in session.get("clips", []):
                for field in ("path", "thumbnail"):
                    rel = clip.get(field)
                    if rel:
                        full = (base_dir / rel).resolve()
                        if str(full).startswith(str(base_dir)) and full.exists():
                            full.unlink(missing_ok=True)

        metadata_path.unlink(missing_ok=True)

    return JSONResponse(status_code=200, content={"status": "success"})


@router.delete(
    "/results/sessions",
    summary="Удалить выбранные сессии (по индексам из фронтенда)",
)
async def delete_selected_sessions(indices: list[int]) -> JSONResponse:
    """indices — 0-based позиции сессий в перевёрнутом списке (как на фронте)."""
    metadata_path = OUTPUTS_DIR / "metadata.json"
    base_dir = OUTPUTS_DIR.parent.resolve()

    if not metadata_path.exists():
        return JSONResponse(status_code=200, content={"status": "success", "remaining": 0})

    try:
        with metadata_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = [data]
    except (json.JSONDecodeError, OSError):
        data = []

    total = len(data)
    # фронт видит reversed список, переводим обратно в оригинальные индексы
    original_indices = {total - 1 - i for i in indices if 0 <= i < total}

    for i in original_indices:
        for clip in data[i].get("clips", []):
            for field in ("path", "thumbnail"):
                rel = clip.get(field)
                if rel:
                    full = (base_dir / rel).resolve()
                    if str(full).startswith(str(base_dir)) and full.exists():
                        full.unlink(missing_ok=True)

    new_data = [s for i, s in enumerate(data) if i not in original_indices]

    with metadata_path.open("w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)

    return JSONResponse(status_code=200, content={"status": "success", "remaining": len(new_data)})


@router.post(
    "/download-zip/",
    summary="Создать ZIP-архив из нарезанных клипов (стриминг с прогресс-баром)",
)
async def download_zip(paths: list[str], background_tasks: BackgroundTasks) -> FileResponse:
    """Записывает ZIP во временный файл на диске и стримит его клиенту.
    Браузер получает Content-Length и показывает реальный прогресс скачивания."""
    base_dir = OUTPUTS_DIR.parent.resolve()

    # Собираем валидные пути заранее
    valid_paths: list[Path] = []
    for rel_path in paths:
        full_path = (base_dir / rel_path).resolve()
        if str(full_path).startswith(str(base_dir)) and full_path.is_file():
            valid_paths.append(full_path)

    if not valid_paths:
        raise HTTPException(status_code=404, detail="Нет доступных файлов для архива.")

    # Пишем ZIP на диск (не в RAM) — быстрее и не съедает память
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".zip")
    os.close(tmp_fd)
    try:
        with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_STORED, allowZip64=True) as zf:
            for fp in valid_paths:
                zf.write(fp, fp.name)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Ошибка создания архива: {e}")

    # Удаляем temp-файл после того как FastAPI закончит отправку
    background_tasks.add_task(os.unlink, tmp_path)

    return FileResponse(
        path=tmp_path,
        media_type="application/zip",
        filename="Narezka_Clips.zip",
        headers={"Content-Disposition": "attachment; filename=Narezka_Clips.zip"},
    )
