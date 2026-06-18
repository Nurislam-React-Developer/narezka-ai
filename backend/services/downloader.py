"""
services/downloader.py — Умный загрузчик:
  • YouTube → yt-dlp (HD до 1080p, обходит ботозащиту на серверах)
  • HLS (.m3u8), прямые MP4 и другие сайты → ffmpeg
"""

import os
import subprocess
import shutil
from pathlib import Path

from fastapi import HTTPException

from services.task_manager import update_task_progress

# Полный путь к ffmpeg (на macOS через Homebrew не попадает в PATH подпроцессов)
FFMPEG_CMD = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"

# Путь к файлу cookies для обхода ботозащиты YouTube (опционально, через env)
YT_COOKIES_FILE = os.getenv("YT_COOKIES_FILE")


# ─── Helpers ────────────────────────────────────────────────────────────────

def _is_youtube_url(url: str) -> bool:
    return any(d in url for d in ("youtube.com/", "youtu.be/", "youtube-nocookie.com/"))


def _is_direct_stream(url: str) -> bool:
    """HLS манифесты, mp4/webm прямые ссылки."""
    low = url.lower().split("?")[0]
    return any(low.endswith(ext) for ext in (".m3u8", ".mp4", ".webm", ".avi", ".mkv", ".ts", ".flv"))


# ─── Public API ─────────────────────────────────────────────────────────────

async def download_video(url: str, output_dir: Path, unique_prefix: str, task_id: str = None) -> Path:
    import asyncio
    return await asyncio.to_thread(_download_sync, url, output_dir, unique_prefix, task_id)


# ─── Private ────────────────────────────────────────────────────────────────

def _download_sync(url: str, output_dir: Path, unique_prefix: str, task_id: str | None) -> Path:
    if _is_youtube_url(url):
        return _download_youtube(url, output_dir, unique_prefix, task_id)
    else:
        # HLS / прямые ссылки → ffmpeg
        return _download_ffmpeg(url, output_dir, unique_prefix, task_id)


def _download_youtube(url: str, output_dir: Path, unique_prefix: str, task_id: str | None) -> Path:
    """Скачивает YouTube-видео (HD до 1080p) через yt-dlp.

    yt-dlp устойчивее к ботозащите, чем pytubefix, и умеет работать с cookies
    (через переменную окружения YT_COOKIES_FILE) для серверов в дата-центрах.
    """
    filename = f"{unique_prefix}_video.mp4"
    output_path = output_dir / filename

    if task_id:
        update_task_progress(task_id, "downloading", 10)

    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
        "--merge-output-format", "mp4",
        "--no-playlist",
        "--no-warnings",
        "--ffmpeg-location", FFMPEG_CMD,
        # Клиенты, которые чаще обходят ботозащиту YouTube на серверах
        "--extractor-args", "youtube:player_client=android,web_safari,tv",
        "-o", str(output_path),
    ]

    # Если заданы cookies — используем их (самый надёжный обход блокировки)
    if YT_COOKIES_FILE and Path(YT_COOKIES_FILE).exists():
        cmd += ["--cookies", YT_COOKIES_FILE]

    cmd.append(url)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600,  # 1 час на скачивание
        )

        if task_id:
            update_task_progress(task_id, "downloading", 90)

        if result.returncode != 0:
            err = (result.stderr or "Unknown error").strip()
            # Распознаём типичную ботозащиту, чтобы дать понятную подсказку
            if "Sign in to confirm" in err or "bot" in err.lower():
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "YouTube заблокировал скачивание с сервера (ботозащита). "
                                   "Нужны cookies — см. инструкцию.",
                        "url": url,
                    },
                )
            raise HTTPException(
                status_code=400,
                detail={"message": f"Ошибка YouTube: {err[-300:]}", "url": url},
            )

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="YouTube: файл скачан, но пуст или не найден.")

        return output_path

    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=500, detail="Превышено время скачивания YouTube (1 час).") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"message": f"Ошибка YouTube: {str(exc)[:300]}", "url": url}) from exc


def _download_ffmpeg(url: str, output_dir: Path, unique_prefix: str, task_id: str | None) -> Path:
    """
    Скачивает HLS (.m3u8), прямые MP4/WebM и другие потоки через ffmpeg.
    Работает с Кинопоиском, cinemap, KinoGo и другими сайтами.
    """
    filename = f"{unique_prefix}_video.mp4"
    output_path = output_dir / filename

    if task_id:
        update_task_progress(task_id, "downloading", 10)

    cmd = [
        FFMPEG_CMD, "-y",
        "-i", url,
        "-c", "copy",           # Без перекодировки — максимальная скорость
        "-bsf:a", "aac_adtstoasc",  # Фикс для HLS аудио
        "-movflags", "+faststart",
        str(output_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=7200,  # 2 часа — для длинных фильмов
        )

        if task_id:
            update_task_progress(task_id, "downloading", 90)

        if result.returncode != 0:
            err = result.stderr[-1000:] if result.stderr else "Unknown error"
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"ffmpeg не смог скачать поток: {err}",
                    "url": url,
                },
            )

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="ffmpeg завершился, но файл пуст или не найден.")

        return output_path

    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=500, detail="Превышено время скачивания (2 часа).") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"message": f"Ошибка скачивания: {str(exc)[:300]}", "url": url}) from exc
