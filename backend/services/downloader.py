"""
services/downloader.py — Умный загрузчик:
  • YouTube → pytubefix (HD до 1080p, без ботозащиты)
  • HLS (.m3u8), прямые MP4 и другие сайты → ffmpeg
"""

import subprocess
import shutil
from pathlib import Path

from fastapi import HTTPException
from pytubefix import YouTube
from pytubefix.cli import on_progress

from services.task_manager import update_task_progress

# Полный путь к ffmpeg (на macOS через Homebrew не попадает в PATH подпроцессов)
FFMPEG_CMD = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


# ─── Helpers ────────────────────────────────────────────────────────────────

def _is_youtube_url(url: str) -> bool:
    return any(d in url for d in ("youtube.com/", "youtu.be/", "youtube-nocookie.com/"))


def _is_direct_stream(url: str) -> bool:
    """HLS манифесты, mp4/webm прямые ссылки."""
    low = url.lower().split("?")[0]
    return any(low.endswith(ext) for ext in (".m3u8", ".mp4", ".webm", ".avi", ".mkv", ".ts", ".flv"))


def _make_on_progress(task_id: str | None):
    """Callbacks прогресса для pytubefix."""
    def _callback(stream, chunk, bytes_remaining):
        if task_id and stream.filesize:
            pct = int(100 * (1 - bytes_remaining / stream.filesize))
            update_task_progress(task_id, "downloading", pct)
    return _callback if task_id else on_progress


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
    try:
        yt = YouTube(
            url,
            on_progress_callback=_make_on_progress(task_id),
            use_oauth=False,
            allow_oauth_cache=True,
        )

        safe_title = "".join(c for c in yt.title if c.isalnum() or c in " _-")[:60].strip()
        filename = f"{unique_prefix}_{safe_title}.mp4"
        final_output_path = output_dir / filename

        def res_to_int(res_str: str) -> int:
            return int(res_str.replace("p", "")) if res_str else 0

        # Ищем HD поток (adaptive / DASH) до 1080p
        video_streams = yt.streams.filter(adaptive=True, type="video", file_extension="mp4")
        valid_vid = [s for s in video_streams if res_to_int(s.resolution) <= 1080]
        video_stream = sorted(valid_vid, key=lambda s: res_to_int(s.resolution))[-1] if valid_vid else None
        audio_stream = yt.streams.filter(adaptive=True, type="audio").order_by("abr").last()

        if video_stream and audio_stream:
            # Скачиваем HD видео + аудио раздельно, потом сливаем ffmpeg
            vid_path = video_stream.download(output_path=str(output_dir), filename=f"v_{filename}", skip_existing=False)
            aud_path = audio_stream.download(output_path=str(output_dir), filename=f"a_{filename}", skip_existing=False)

            subprocess.run([
                FFMPEG_CMD, "-y",
                "-i", vid_path, "-i", aud_path,
                "-c:v", "copy", "-c:a", "aac",
                str(final_output_path)
            ], capture_output=True, check=True)

            Path(vid_path).unlink(missing_ok=True)
            Path(aud_path).unlink(missing_ok=True)
            result = final_output_path
        else:
            # Fallback на progressive поток
            stream = yt.streams.get_highest_resolution()
            if not stream:
                raise HTTPException(status_code=400, detail={"message": "Нет доступных потоков.", "url": url})
            output_path = stream.download(output_path=str(output_dir), filename=filename, skip_existing=False)
            result = Path(output_path)

        if not result.exists():
            raise HTTPException(status_code=500, detail="YouTube: файл скачан, но не найден на диске.")
        return result

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
