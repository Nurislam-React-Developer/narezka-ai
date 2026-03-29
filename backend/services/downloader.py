"""
services/downloader.py — Извлекает прямые URL потоков БЕЗ скачивания на диск.

Возвращает (video_url, audio_url | None, title) — затем FFmpeg
читает с этих URL напрямую и нарезает на клипы, минуя inputs/.
"""

import asyncio
from pathlib import Path

import yt_dlp
from fastapi import HTTPException

from services.task_manager import update_task_progress


def _is_direct_url(url: str) -> bool:
    """Прямые MP4/WebM/HLS ссылки — отдаём как есть."""
    low = url.lower().split("?")[0]
    return any(low.endswith(ext) for ext in (".m3u8", ".mp4", ".webm", ".avi", ".mkv", ".ts", ".flv"))


async def get_video_preview(url: str) -> dict:
    """
    Возвращает метаданные видео без скачивания: title, duration, thumbnail, uploader.
    Используется для предпросмотра перед нарезкой.
    """
    return await asyncio.to_thread(_get_video_preview_sync, url)


def _get_video_preview_sync(url: str) -> dict:
    if _is_direct_url(url):
        name = url.split("?")[0].rstrip("/").split("/")[-1] or "video.mp4"
        return {"title": name, "duration": None, "thumbnail": None, "uploader": None}

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 20,  # 20 сек timeout на preview
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        return {
            "title": info.get("title") or "Без названия",
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "uploader": info.get("uploader") or info.get("channel"),
        }
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail={"message": "Timeout при получении информации о видео. YouTube отвечает слишком долго."},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Не удалось получить информацию о видео: {str(exc)[:300]}"},
        ) from exc


async def get_stream_info(url: str, task_id: str | None = None) -> tuple[str, str | None, str]:
    """
    Возвращает (video_url, audio_url | None, title).
    Не скачивает файл — только извлекает прямые ссылки на поток.
    """
    return await asyncio.to_thread(_get_stream_info_sync, url, task_id)


def _get_stream_info_sync(url: str, task_id: str | None) -> tuple[str, str | None, str]:
    if task_id:
        update_task_progress(task_id, "downloading", 5)

    # Прямые ссылки — возвращаем как есть, без запросов
    if _is_direct_url(url):
        filename = url.split("?")[0].rstrip("/").split("/")[-1] or "video.mp4"
        if task_id:
            update_task_progress(task_id, "downloading", 30)
        return url, None, filename

    # YouTube, TikTok, VK и остальные — через yt-dlp (только извлечение URL)
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,  # ← TIMEOUT 30 сек на каждый запрос
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        # Упрощённый формат — быстрее выбирает поток (не зависает)
        "format": "best[height<=1080]/best",
    }

    try:
        if task_id:
            update_task_progress(task_id, "downloading", 15)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if task_id:
            update_task_progress(task_id, "downloading", 40)

        raw_title = info.get("title") or "video"
        title = "".join(c for c in raw_title if c.isalnum() or c in " _-").strip()[:60] or "video"

        # Проверяем есть ли DASH формат (отдельные видео + аудио)
        requested = info.get("requested_formats")
        if requested and len(requested) >= 2:
            # DASH: отдельные потоки видео и аудио (YouTube HD и др.)
            vid_url = requested[0].get("url")
            aud_url = requested[1].get("url")
            if vid_url and aud_url:
                return vid_url, aud_url, title

        # Progressive или единый поток
        stream_url = info.get("url")
        if not stream_url:
            raise HTTPException(
                status_code=400,
                detail={"message": "yt-dlp не вернул URL потока.", "url": url},
            )
        return stream_url, None, title

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=408,
            detail={"message": "Timeout: YouTube слишком долго отвечает. Попробуй позже.", "url": url},
        )
    except Exception as exc:
        err_msg = str(exc)[:400]
        raise HTTPException(
            status_code=400,
            detail={"message": f"Ошибка извлечения URL: {err_msg}", "url": url},
        ) from exc
