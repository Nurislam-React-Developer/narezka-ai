"""
config.py — Конфигурация проекта.
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
# Позволяем задать путь через переменную окружения для Google Drive и др. облаков
_ENV_INPUTS = os.getenv("INPUTS_DIR")
if _ENV_INPUTS:
    INPUTS_DIR = Path(_ENV_INPUTS)
else:
    INPUTS_DIR = BASE_DIR / "inputs"

_ENV_OUTPUTS = os.getenv("OUTPUTS_DIR")

if _ENV_OUTPUTS:
    OUTPUTS_DIR = Path(_ENV_OUTPUTS) / "clips"
else:
    OUTPUTS_DIR = BASE_DIR / "outputs" / "clips"

DEFAULT_SEGMENT_DURATION = 60  # Длина одного сегмента в секундах (по умолчанию)

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".ts"}
