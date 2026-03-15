"""
services/ffmpeg.py — Логика работы с ffmpeg (нарезка, получение длительности).
"""

import shutil
import subprocess
from pathlib import Path

from fastapi import HTTPException

# Полный путь к ffmpeg
FFMPEG_CMD = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


def get_video_duration(file_path: Path) -> float:
    """Получает длительность видео в секундах через ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return float(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        return 0.0


def build_ffmpeg_command(
    input_path: Path,
    output_template: Path,
    segment_duration: int,
) -> list[str]:
    """
    Формирует команду ffmpeg для нарезки видео на сегменты.
    Параметр segment_duration задаёт длину каждого клипа в секундах.
    Перекодирование аудио + видео для полной совместимости.
    """
    return [
        FFMPEG_CMD,
        "-y",
        "-i", str(input_path),
        "-c", "copy",            # Без перекодировки — разрезает за секунды
        "-f", "segment",
        "-segment_format", "mp4",
        "-segment_time", str(segment_duration),
        "-reset_timestamps", "1",
        "-segment_format_options", "movflags=+faststart",
        str(output_template),
    ]


def run_ffmpeg(input_path: Path, output_template: Path, segment_duration: int) -> None:
    """
    Запускает ffmpeg для нарезки видео.
    Бросает HTTPException при ошибке.
    """
    ffmpeg_cmd = build_ffmpeg_command(input_path, output_template, segment_duration)

    try:
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "ffmpeg завершился с ошибкой.",
                    "ffmpeg_stderr": result.stderr[-2000:],
                },
            )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg не найден. Убедитесь, что ffmpeg установлен и доступен в PATH.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=500,
            detail="Обработка видео превысила допустимое время (10 минут).",
        ) from exc


def collect_clips(output_dir: Path, base_name: str, base_dir: Path) -> list[dict]:
    """Собирает информацию обо всех нарезанных клипах."""
    pattern = f"{base_name}_clip_*.mp4"
    clip_files = sorted(output_dir.glob(pattern))

    clips_metadata = []
    for idx, clip_path in enumerate(clip_files, start=1):
        duration = get_video_duration(clip_path)
        # Используем просто имя файла + папку outputs/clips, чтобы не зависеть от BASE_DIR
        # (когда outputs на Google Drive, relative_to(BASE_DIR) ломается)
        try:
            rel_path = str(clip_path.relative_to(base_dir))
        except ValueError:
            # Клипы на внешнем хранилище (Google Drive и т.п.) — отдаём абсолютный путь
            rel_path = str(clip_path)

        clips_metadata.append(
            {
                "id": idx,
                "filename": clip_path.name,
                "path": rel_path,
                "duration": round(duration, 3),
                "status": "success" if clip_path.stat().st_size > 0 else "empty",
            }
        )

    return clips_metadata
