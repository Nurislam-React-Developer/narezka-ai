"""
routes/subtitles.py — API для генерации субтитров через faster-whisper.

Эндпоинты:
  POST /subtitles/from-url/      — скачать видео по URL и транскрибировать
  POST /subtitles/from-file/     — загрузить файл и транскрибировать
  POST /subtitles/render/        — вжечь субтитры в видео с выбранным стилем
  GET  /subtitles/task/{task_id} — получить статус задачи
"""

import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

from config import INPUTS_DIR, SUBTITLES_DIR, ALLOWED_VIDEO_EXTENSIONS
from services.task_manager import (
    create_task,
    get_task,
    update_task_progress,
    set_task_done,
    set_task_error,
)
from services.downloader import get_stream_info
from services.whisper_service import transcribe_audio, srt_from_segments, srt_preview
from services.ffmpeg import get_video_duration
import subprocess

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


# ─────────────────────────────────────────────────────────────────────────────
# Константы для рендера
# ─────────────────────────────────────────────────────────────────────────────

# ASS цвета: &HAABBGGRR (alpha, blue, green, red)
_ASS_COLORS = {
    "white":  "&H00FFFFFF",
    "yellow": "&H0000FFFF",
    "cyan":   "&H00FFFF00",
    "orange": "&H000080FF",
    "black":  "&H00000000",
}

_ASS_ALIGNMENT = {
    "bottom": 2,
    "center": 5,
    "top":    8,
}


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic модели
# ─────────────────────────────────────────────────────────────────────────────


class SubtitlesUrlRequest(BaseModel):
    url: str
    language: str = "auto"

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL должен начинаться с http:// или https://")
        return v


class RenderRequest(BaseModel):
    task_id: str
    font_size: int = 24       # 16, 20, 26, 34
    color: str = "white"      # white, yellow, cyan, orange
    outline: bool = True
    outline_color: str = "black"
    position: str = "bottom"  # bottom, center, top
    bold: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Вспомогательные функции
# ─────────────────────────────────────────────────────────────────────────────


async def _extract_audio(video_path: Path, task_id: str) -> Path:
    """Извлекает аудио из видео через FFmpeg (временный wav файл)."""
    audio_path = INPUTS_DIR / f"{task_id}_audio.wav"
    update_task_progress(task_id, "extracting_audio", 15)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-q:a", "9",
        str(audio_path),
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg ошибка при извлечении аудио: {result.stderr[-500:]}",
            )
        return audio_path
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Извлечение аудио заняло > 10 минут")


async def _process_video_for_subtitles(
    video_path: Path,
    task_id: str,
    language: str = "auto",
) -> dict:
    """
    Транскрибирует видео и генерирует SRT.
    Видео НЕ удаляется — оно нужно для последующего рендера.
    """
    try:
        duration = get_video_duration(video_path)
        update_task_progress(task_id, "got_duration", 10)

        audio_path = await _extract_audio(video_path, task_id)
        update_task_progress(task_id, "extracting_audio", 20)

        def progress_callback(progress, desc):
            mapped = 20 + int((progress / 100) * 60)
            update_task_progress(task_id, "transcribing", mapped)

        transcription = await transcribe_audio(
            audio_path,
            language=language,
            task=progress_callback,
        )

        srt_content = srt_from_segments(transcription["segments"])
        srt_preview_text = srt_preview(srt_content, lines=5)

        srt_filename = f"{task_id}.srt"
        srt_path = SUBTITLES_DIR / srt_filename
        srt_path.write_text(srt_content, encoding="utf-8")

        # Удаляем только аудио — видео оставляем для рендера
        audio_path.unlink(missing_ok=True)

        update_task_progress(task_id, "done", 100)

        return {
            "srt_filename": srt_filename,
            "video_filename": video_path.name,  # нужен для рендера
            "srt_preview": srt_preview_text,
            "word_count": len(srt_content.split()),
            "duration": duration,
            "language": transcription.get("language", language),
            "segment_count": len(transcription["segments"]),
        }

    except Exception as e:
        error_msg = str(e)
        print(f"[subtitles] Error in _process_video_for_subtitles: {error_msg}")
        set_task_error(task_id, error_msg)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Эндпоинты
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/from-url/")
async def subtitles_from_url(req: SubtitlesUrlRequest, background_tasks: BackgroundTasks):
    task_id = create_task()
    update_task_progress(task_id, "downloading", 5)

    async def process():
        try:
            video_url, audio_url, title = await get_stream_info(req.url, task_id=task_id)
            update_task_progress(task_id, "downloading", 40)

            video_filename = f"{task_id}.mp4"
            video_path = INPUTS_DIR / video_filename

            ffmpeg_cmd = ["ffmpeg", "-y", "-i", video_url]
            if audio_url:
                ffmpeg_cmd.extend(["-i", audio_url, "-map", "0:v:0", "-map", "1:a:0"])
            ffmpeg_cmd.extend(["-c:v", "copy", "-c:a", "copy", str(video_path)])

            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                raise Exception(f"FFmpeg ошибка при скачивании: {result.stderr[-500:]}")

            update_task_progress(task_id, "processing", 50)

            result = await _process_video_for_subtitles(video_path, task_id, req.language)
            set_task_done(task_id, result)

        except Exception as e:
            print(f"[subtitles] Error in subtitles_from_url: {e}")
            set_task_error(task_id, str(e))

    background_tasks.add_task(process)
    return {"task_id": task_id, "status": "started"}


@router.post("/from-file/")
async def subtitles_from_file(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    background_tasks: BackgroundTasks = None,
):
    task_id = create_task()
    update_task_progress(task_id, "uploading", 5)

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        set_task_error(task_id, f"Недопустимый формат: {file_ext}")
        raise HTTPException(
            status_code=400,
            detail=f"Только видеофайлы: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
        )

    video_path = INPUTS_DIR / f"{task_id}{file_ext}"
    try:
        content = await file.read()
        video_path.write_bytes(content)
    except Exception as e:
        set_task_error(task_id, f"Ошибка при загрузке файла: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка при сохранении файла")

    update_task_progress(task_id, "processing", 20)

    async def process():
        try:
            result = await _process_video_for_subtitles(video_path, task_id, language)
            set_task_done(task_id, result)
        except Exception as e:
            print(f"[subtitles] Error in subtitles_from_file: {e}")
            set_task_error(task_id, str(e))

    background_tasks.add_task(process)
    return {"task_id": task_id, "status": "started"}


@router.post("/render/")
async def render_subtitles_video(req: RenderRequest, background_tasks: BackgroundTasks):
    """Вжигает субтитры в видео с выбранным стилем."""
    task = get_task(req.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if task.get("status") != "done":
        raise HTTPException(status_code=400, detail="Транскрипция ещё не завершена")

    result = task.get("result", {})
    srt_filename = result.get("srt_filename")
    video_filename = result.get("video_filename")

    if not srt_filename or not video_filename:
        raise HTTPException(status_code=400, detail="Нет данных о файлах")

    srt_path = SUBTITLES_DIR / srt_filename
    video_path = INPUTS_DIR / video_filename

    if not srt_path.exists():
        raise HTTPException(status_code=404, detail="SRT файл не найден")
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Видеофайл не найден (возможно, истёк срок хранения)")

    render_task_id = create_task()
    output_filename = f"{render_task_id}_rendered.mp4"
    output_path = SUBTITLES_DIR / output_filename

    async def process():
        try:
            update_task_progress(render_task_id, "rendering", 5)

            primary_color = _ASS_COLORS.get(req.color, "&H00FFFFFF")
            outline_color_val = _ASS_COLORS.get(req.outline_color, "&H00000000")
            alignment = _ASS_ALIGNMENT.get(req.position, 2)
            outline_width = 2 if req.outline else 0
            bold = 1 if req.bold else 0
            margin_v = 30 if req.position == "bottom" else (30 if req.position == "top" else 0)

            force_style = (
                f"FontName=Arial,"
                f"FontSize={req.font_size},"
                f"PrimaryColour={primary_color},"
                f"OutlineColour={outline_color_val},"
                f"Outline={outline_width},"
                f"Bold={bold},"
                f"Alignment={alignment},"
                f"MarginV={margin_v}"
            )

            # Путь к SRT должен быть без спецсимволов для фильтра
            srt_escaped = str(srt_path).replace("\\", "/").replace(":", "\\:")

            cmd = [
                "ffmpeg", "-y",
                "-i", str(video_path),
                "-vf", f"subtitles={srt_escaped}:force_style='{force_style}'",
                "-c:v", "libx264",
                "-crf", "23",
                "-preset", "fast",
                "-c:a", "aac",
                "-b:a", "128k",
                str(output_path),
            ]

            update_task_progress(render_task_id, "rendering", 10)

            proc = await asyncio.to_thread(
                subprocess.run, cmd, capture_output=True, text=True, timeout=1200
            )

            if proc.returncode != 0:
                raise Exception(f"FFmpeg error: {proc.stderr[-800:]}")

            update_task_progress(render_task_id, "done", 100)
            set_task_done(render_task_id, {
                "video_filename": output_filename,
                "video_url": f"/outputs/subtitles/{output_filename}",
            })

        except Exception as e:
            print(f"[subtitles] Render error: {e}")
            set_task_error(render_task_id, str(e))

    background_tasks.add_task(process)
    return {"task_id": render_task_id, "status": "started"}


@router.get("/task/{task_id}")
async def get_subtitles_task(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    return {
        "task_id": task_id,
        "status": task.get("status"),
        "progress": task.get("progress", 0),
        "result": task.get("result"),
        "error": task.get("error"),
    }


@router.get("/download/{filename}")
async def download_subtitles(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")

    file_path = SUBTITLES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")

    media_type = "video/mp4" if filename.endswith(".mp4") else "text/plain; charset=utf-8"
    return FileResponse(path=file_path, filename=filename, media_type=media_type)
