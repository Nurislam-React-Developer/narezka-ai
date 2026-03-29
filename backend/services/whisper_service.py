"""
whisper_service.py — Интеграция с faster-whisper для транскрипции аудио.

Использует локальную модель (без API-ключа), распознаёт речь и возвращает SRT.
"""

import asyncio
import os
from pathlib import Path
from datetime import timedelta


# Глобальная переменная для кеша модели (загружаем один раз)
_whisper_model = None
_model_name = os.getenv("WHISPER_MODEL", "base")


def _format_timestamp(seconds: float) -> str:
    """Конвертирует секунды в SRT формат: 00:00:00,000"""
    td = timedelta(seconds=seconds)
    hours = td.seconds // 3600
    minutes = (td.seconds // 60) % 60
    secs = td.seconds % 60
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _get_whisper_model():
    """Ленивая загрузка модели (один раз в процессе)."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError(
                "faster-whisper не установлен. Установите: pip install faster-whisper"
            )
        print(f"[whisper] Загружаю модель '{_model_name}'...")
        _whisper_model = WhisperModel(_model_name, device="cpu", compute_type="int8")
        print(f"[whisper] Модель загружена")
    return _whisper_model


async def transcribe_audio(
    audio_path: str | Path,
    language: str = "auto",
    task=None,  # callback для обновления прогресса
) -> dict:
    """
    Транскрибирует аудиофайл (mp3, wav, m4a и т.д.) в список сегментов с временем.

    Аргументы:
        audio_path: путь к аудиофайлу
        language: код языка ("en", "ru", "auto" для автоопределения)
        task: callback(progress, description) для отчёта о прогрессе

    Возвращает:
        {
            "segments": [
                {"start": 0.5, "end": 3.2, "text": "Привет мир"},
                ...
            ],
            "language": "ru",
            "duration": 120.5
        }
    """
    try:
        if task:
            task(10, "Загружаю модель Whisper...")

        def _run_transcription():
            """Вся транскрипция — в отдельном потоке (не блокирует event loop)."""
            model = _get_whisper_model()
            segments_gen, info = model.transcribe(
                str(audio_path),
                language=None if language == "auto" else language,
                beam_size=5,
            )
            # Материализуем генератор прямо здесь, в потоке
            segments = [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                }
                for seg in segments_gen
            ]
            return segments, info

        if task:
            task(20, "Начинаю транскрипцию...")

        segments, info = await asyncio.to_thread(_run_transcription)

        if task:
            task(90, "Форматирую результат...")

        detected_language = getattr(info, "language", language)

        if task:
            task(100, "Готово!")

        return {
            "segments": segments,
            "language": detected_language,
            "duration": segments[-1]["end"] if segments else 0,
        }

    except Exception as e:
        print(f"[whisper] Ошибка при транскрипции: {e}")
        raise


def srt_from_segments(segments: list[dict], title: str = "Subtitles") -> str:
    """
    Конвертирует список сегментов в SRT формат.

    SRT формат:
        1
        00:00:00,500 --> 00:00:07,000
        At the left we can see...

        2
        00:00:07,000 --> 00:00:11,000
        At the right we can see...
    """
    srt_lines = []
    for idx, segment in enumerate(segments, start=1):
        start = _format_timestamp(segment["start"])
        end = _format_timestamp(segment["end"])
        text = segment["text"]

        srt_lines.append(f"{idx}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(text)
        srt_lines.append("")  # Пустая строка между сегментами

    return "\n".join(srt_lines)


def srt_preview(srt_content: str, lines: int = 5) -> str:
    """Возвращает первые N строк SRT для превью."""
    return "\n".join(srt_content.split("\n")[:lines * 4])  # 4 строки на 1 сегмент
