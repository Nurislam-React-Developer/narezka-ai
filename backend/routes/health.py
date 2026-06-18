"""
routes/health.py — Health-check эндпоинт.
"""

import subprocess

from fastapi import APIRouter

from config import INPUTS_DIR, OUTPUTS_DIR

router = APIRouter(tags=["System"])


@router.get("/health", summary="Проверка работоспособности сервиса")
async def health_check() -> dict:
    """Возвращает статус сервиса, версию ffmpeg и yt-dlp."""

    def check_tool(cmd: list[str]) -> tuple[bool, str]:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if r.returncode == 0:
                return True, r.stdout.split("\n")[0].strip()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return False, "не найден"

    ffmpeg_ok, ffmpeg_ver = check_tool(["ffmpeg", "-version"])
    ytdlp_ok, ytdlp_ver = check_tool(["yt-dlp", "--version"])

    return {
        "status": "ok",
        "ffmpeg_available": ffmpeg_ok,
        "ffmpeg_version": ffmpeg_ver,
        "downloader": "yt-dlp",
        "ytdlp_available": ytdlp_ok,
        "ytdlp_version": ytdlp_ver,
        "inputs_dir": str(INPUTS_DIR),
        "outputs_dir": str(OUTPUTS_DIR),
    }
