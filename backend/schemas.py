"""
schemas.py — Pydantic-модели запросов.
"""

import re
from pydantic import BaseModel, field_validator, model_validator


class UrlRequest(BaseModel):
    """Тело запроса для эндпоинта /process-url/."""

    url: str
    segment_duration: int = 60       # Пользователь может указать длину сегмента
    start_time: float | None = None  # Начало диапазона нарезки (сек), None = с начала
    end_time: float | None = None    # Конец диапазона нарезки (сек), None = до конца
    clip_prefix: str | None = None   # Кастомный префикс имён клипов, напр. "Лекция_1"

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^https?://", v, re.IGNORECASE):
            raise ValueError("URL должен начинаться с http:// или https://")
        if len(v) > 2048:
            raise ValueError("URL слишком длинный (максимум 2048 символов)")
        return v

    @field_validator("segment_duration")
    @classmethod
    def validate_segment_duration(cls, v: int) -> int:
        if v < 5:
            raise ValueError("Минимальная длительность сегмента — 5 секунд")
        if v > 600:
            raise ValueError("Максимальная длительность сегмента — 600 секунд (10 минут)")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Время не может быть отрицательным")
        return v

    @field_validator("clip_prefix")
    @classmethod
    def validate_clip_prefix(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        # Оставляем только буквы, цифры, пробелы, дефис и подчёркивание
        v = re.sub(r"[^\w\s\-]", "", v)
        v = re.sub(r"\s+", "_", v)
        return v[:50] if v else None
