"""
services/ffmpeg.py — Логика работы с ffmpeg (нарезка, получение длительности).
"""

import shutil
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import HTTPException

# Полный путь к ffmpeg
FFMPEG_CMD = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


def get_video_duration(input_src: "Path | str") -> float:
    """Получает длительность видео в секундах через ffprobe.
    Принимает как путь к файлу, так и HTTP/HLS URL."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(input_src),
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return float(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        return 0.0


def generate_thumbnail(clip_path: Path) -> Path | None:
    """Генерирует JPEG-превью первого кадра клипа (480px широкий)."""
    thumb_path = clip_path.with_suffix(".jpg")
    try:
        result = subprocess.run(
            [
                FFMPEG_CMD, "-y",
                "-i", str(clip_path),
                "-vframes", "1",
                "-vf", "scale=480:-2",
                "-q:v", "5",
                str(thumb_path),
            ],
            capture_output=True,
            timeout=15,
        )
        return thumb_path if result.returncode == 0 and thumb_path.exists() else None
    except Exception:
        return None


def build_ffmpeg_command(
    input_src: "Path | str",
    output_template: Path,
    segment_duration: int,
    with_progress: bool = False,
    audio_url: "str | None" = None,
    start_time: "float | None" = None,
    end_time: "float | None" = None,
) -> list[str]:
    """
    Формирует команду ffmpeg для нарезки видео на сегменты.
    input_src  — путь к файлу ИЛИ HTTP/HLS URL (FFmpeg читает напрямую).
    audio_url  — второй поток для DASH (YouTube HD): отдельное аудио.
    start_time — начало диапазона в секундах (-ss перед -i для быстрого seek).
    end_time   — конец диапазона в секундах (ограничивает длительность через -t).
    with_progress=True добавляет -progress pipe:1 для отслеживания прогресса.
    """
    cmd = [FFMPEG_CMD, "-y"]

    # Быстрый seek: -ss перед -i (keyframe accuracy достаточна для нарезки)
    if start_time is not None and start_time > 0:
        cmd += ["-ss", str(start_time)]

    cmd += ["-i", str(input_src)]

    if audio_url:
        # DASH: видео + аудио — два входа, мержим на лету
        if start_time is not None and start_time > 0:
            cmd += ["-ss", str(start_time)]
        cmd += ["-i", audio_url, "-map", "0:v:0", "-map", "1:a:0"]
        cmd += ["-c:v", "copy", "-c:a", "aac"]
    else:
        cmd += ["-c", "copy"]

    # Ограничиваем длительность если задан end_time
    if end_time is not None:
        duration = end_time - (start_time or 0)
        if duration > 0:
            cmd += ["-t", str(duration)]

    cmd += [
        "-f", "segment",
        "-segment_format", "mp4",
        "-segment_time", str(segment_duration),
        "-reset_timestamps", "1",
        "-segment_format_options", "movflags=+faststart",
    ]
    if with_progress:
        cmd += ["-progress", "pipe:1", "-nostats"]
    cmd.append(str(output_template))
    return cmd


def run_ffmpeg(
    input_src: "Path | str",
    output_template: Path,
    segment_duration: int,
    task_id: "str | None" = None,
    total_duration: float = 0,
    audio_url: "str | None" = None,
    start_time: "float | None" = None,
    end_time: "float | None" = None,
) -> None:
    """
    Запускает ffmpeg для нарезки видео.
    input_src  — путь к файлу или URL (стриминг без скачивания).
    start_time — начало диапазона (сек), None = с начала.
    end_time   — конец диапазона (сек), None = до конца.
    Если переданы task_id и total_duration — обновляет прогресс в реальном времени.
    """
    use_progress = bool(task_id and total_duration > 0)
    ffmpeg_cmd = build_ffmpeg_command(
        input_src, output_template, segment_duration,
        with_progress=use_progress, audio_url=audio_url,
        start_time=start_time, end_time=end_time,
    )

    try:
        if use_progress:
            _run_ffmpeg_with_progress(ffmpeg_cmd, task_id, total_duration)
        else:
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=1200)  # 20 мин
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail={"message": "ffmpeg завершился с ошибкой.", "ffmpeg_stderr": result.stderr[-2000:]},
                )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="ffmpeg не найден в PATH.") from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=500, detail="Обработка видео превысила 20 минут.") from exc


def _run_ffmpeg_with_progress(cmd: list[str], task_id: str, total_duration: float) -> None:
    """Запускает ffmpeg и читает -progress pipe:1 для обновления прогресса задачи."""
    from services.task_manager import update_task_progress

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    stderr_buf: list[str] = []

    def _read_stderr():
        try:
            stderr_buf.append(process.stderr.read())
        except Exception as e:
            stderr_buf.append(f"Error reading stderr: {e}")

    t = threading.Thread(target=_read_stderr, daemon=True)
    t.start()

    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    out_ms = int(line.split("=")[1])
                    pct = min(98, int(out_ms / 1000 / total_duration * 100))
                    update_task_progress(task_id, "cutting", pct)
                except (ValueError, ZeroDivisionError):
                    pass

        process.wait(timeout=1200)  # 20 мин timeout
    except subprocess.TimeoutExpired:
        process.kill()
        raise HTTPException(
            status_code=500,
            detail={"message": "Обработка видео превысила 20 минут. Проверь качество интернета."},
        )

    t.join(timeout=5)

    # Прогресс сразу же скачок на 99% после FFmpeg (metadata идёт быстро)
    update_task_progress(task_id, "cutting", 99)

    if process.returncode != 0:
        stderr = stderr_buf[0] if stderr_buf else "Unknown error"
        print(f"❌ FFmpeg error for task {task_id}: {stderr[-500:]}")  # Логирование
        raise HTTPException(
            status_code=500,
            detail={"message": "ffmpeg завершился с ошибкой. Проверь формат видео.", "ffmpeg_stderr": stderr[-1000:]},
        )


def collect_clips(output_dir: Path, base_name: str, base_dir: Path) -> list[dict]:
    """Собирает информацию обо всех нарезанных клипах (ffprobe запускается параллельно).
    Thumbnails генерируются в отдельном фоновом потоке чтобы не блокировать результаты."""
    pattern = f"{base_name}_clip_*.mp4"
    clip_files = sorted(output_dir.glob(pattern))

    if not clip_files:
        return []

    def _clip_info(args: tuple) -> dict:
        idx, clip_path = args
        duration = get_video_duration(clip_path)
        # Не блокируем сбор метаданных на генерации превью — делаем это в background
        # generate_thumbnail(clip_path) — убрали отсюда
        try:
            rel_path = str(clip_path.relative_to(base_dir))
            thumb_rel = str(clip_path.with_suffix(".jpg").relative_to(base_dir))
        except ValueError:
            rel_path = str(clip_path)
            thumb_rel = str(clip_path.with_suffix(".jpg"))
        return {
            "id": idx,
            "filename": clip_path.name,
            "path": rel_path,
            "thumbnail": thumb_rel,
            "duration": round(duration, 3),
            "status": "success" if clip_path.stat().st_size > 0 else "empty",
        }

    max_workers = min(8, len(clip_files))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        clips_metadata = list(executor.map(_clip_info, enumerate(clip_files, start=1)))

    # Генерируем thumbnails в фоне (в отдельном потоке) чтобы не задерживать ответ
    def _gen_thumbs():
        for clip_path in clip_files:
            if not clip_path.with_suffix(".jpg").exists():
                generate_thumbnail(clip_path)

    threading.Thread(target=_gen_thumbs, daemon=True).start()

    return clips_metadata
