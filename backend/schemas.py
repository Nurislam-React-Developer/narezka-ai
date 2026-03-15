"""
schemas.py — Pydantic-модели запросов.
"""

import re
from pydantic import BaseModel, field_validator


class UrlRequest(BaseModel):
    """Тело запроса для эндпоинта /process-url/."""

    url: str
    segment_duration: int = 60  # Пользователь может указать длину сегмента

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
