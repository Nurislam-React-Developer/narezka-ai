"""
services/cutter.py — Нарезка видео и сохранение метаданных.

Работает как с локальными файлами (upload), так и с URL напрямую
(YouTube, HLS, прямые ссылки) — без промежуточного сохранения на диск.
"""

import json
from pathlib import Path

from fastapi import HTTPException

from config import BASE_DIR, OUTPUTS_DIR
from services.ffmpeg import run_ffmpeg, collect_clips, get_video_duration


def _safe_rel(path: Path, base: Path) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def cut_and_save_metadata(
    input_src: "Path | str",
    base_name: str,
    source_label: str,
    original_label: str,
    segment_duration: int = 60,
    task_id: "str | None" = None,
    audio_url: "str | None" = None,
    start_time: "float | None" = None,
    end_time: "float | None" = None,
) -> dict:
    """
    Запускает ffmpeg-нарезку и сохраняет/обновляет metadata.json.

    input_src  — путь к локальному файлу (upload) ИЛИ URL потока.
    audio_url  — второй поток для DASH (YouTube HD).
    start_time — начало диапазона (сек), None = с начала.
    end_time   — конец диапазона (сек), None = до конца.
    """
    output_template = OUTPUTS_DIR / f"{base_name}_clip_%03d.mp4"

    full_duration = get_video_duration(input_src)
    # Вычисляем фактическую длительность обрабатываемого диапазона для прогресс-бара
    effective_start = start_time or 0
    effective_end = end_time if end_time is not None else full_duration
    total_duration = max(0.0, effective_end - effective_start) if full_duration > 0 else 0.0

    run_ffmpeg(
        input_src,
        output_template,
        segment_duration,
        task_id=task_id,
        total_duration=total_duration,
        audio_url=audio_url,
        start_time=start_time,
        end_time=end_time,
    )

    clips = collect_clips(OUTPUTS_DIR, base_name, OUTPUTS_DIR.parent)
    if not clips:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg завершился успешно, но ни одного клипа не создано.",
        )

    metadata = {
        "source_file": source_label,
        "original_filename": original_label,
        "segment_duration_seconds": segment_duration,
        "start_time": start_time,
        "end_time": end_time,
        "total_clips": len(clips),
        "clips": clips,
    }

    metadata_path = OUTPUTS_DIR / "metadata.json"
    existing: list[dict] = []
    if metadata_path.exists():
        try:
            with metadata_path.open("r", encoding="utf-8") as fh:
                existing = json.load(fh)
                if not isinstance(existing, list):
                    existing = [existing]
        except (json.JSONDecodeError, OSError):
            existing = []

    existing.append(metadata)
    with metadata_path.open("w", encoding="utf-8") as fh:
        json.dump(existing, fh, ensure_ascii=False, indent=2)

    # Отчёт
    report_path = OUTPUTS_DIR / "report.md"
    with report_path.open("a", encoding="utf-8") as fh:
        fh.write(
            f"# Отчет о нарезке\n"
            f"- Исходник: {original_label}\n"
            f"- Создано клипов: {len(clips)}\n"
            f"- Длительность сегмента: {segment_duration}с\n"
            f"- Статус: Успешно\n\n"
        )

    # Удаляем локальный файл если это был загруженный файл (не URL)
    if isinstance(input_src, Path) and input_src.exists():
        try:
            input_src.unlink()
        except Exception as e:
            print(f"⚠️ Не удалось удалить исходник {input_src}: {e}")

    return {
        "status": "success",
        "total_clips": len(clips),
        "segment_duration_seconds": segment_duration,
        "metadata_path": _safe_rel(metadata_path, BASE_DIR),
        "clips": clips,
    }
