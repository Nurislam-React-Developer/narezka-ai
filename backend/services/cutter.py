"""
services/cutter.py — Основная логика нарезки видео и сохранения метаданных.
"""

import json
from pathlib import Path

from fastapi import HTTPException

from config import BASE_DIR, OUTPUTS_DIR
from services.ffmpeg import run_ffmpeg, collect_clips


def _safe_rel(path: Path, base: Path) -> str:
    """Возвращает путь относительно base, или абсолютный строкой если path вне base."""
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def cut_and_save_metadata(
    input_path: Path,
    base_name: str,
    source_label: str,
    original_label: str,
    segment_duration: int = 60,
) -> dict:
    """
    Запускает ffmpeg-нарезку и сохраняет/обновляет metadata.json.
    segment_duration — пользовательская длина сегмента в секундах.
    """
    output_template = OUTPUTS_DIR / f"{base_name}_clip_%03d.mp4"

    # Запускаем нарезку с указанной длительностью
    run_ffmpeg(input_path, output_template, segment_duration)

    clips = collect_clips(OUTPUTS_DIR, base_name, OUTPUTS_DIR.parent)
    if not clips:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg завершился успешно, но ни одного клипа не создано.",
        )

    # Обновляем metadata.json
    metadata = {
        "source_file": source_label,
        "original_filename": original_label,
        "segment_duration_seconds": segment_duration,
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

    # Генерация отчета
    report_path = OUTPUTS_DIR / "report.md"
    report_content = f"""# Отчет о нарезке
- Исходник: {original_label}
- Создано клипов: {len(clips)}
- Длительность сегмента: {segment_duration}с
- Статус: Успешно

"""
    with report_path.open("a", encoding="utf-8") as fh:
        fh.write(report_content)

    # УДАЛЕНИЕ ИСХОДНОГО ВИДЕО!
    # Чтобы не забивать диск (папку inputs), удаляем исходник после успешной нарезки.
    try:
        if input_path.exists():
            input_path.unlink()
            print(f"✅ Локальный исходник удален для экономии места: {input_path}")
    except Exception as e:
        print(f"⚠️ Ошибка при удалении исходника {input_path}: {e}")

    return {
        "status": "success",
        "total_clips": len(clips),
        "segment_duration_seconds": segment_duration,
        # relative_to падает если OUTPUTS_DIR за пределами BASE_DIR (Google Drive и т.п.)
        "metadata_path": _safe_rel(metadata_path, BASE_DIR),
        "clips": clips,
    }

