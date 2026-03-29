"""
routes/watermark.py

/download-clean/  — скачать видео без водяного знака (TikTok, Instagram, VK…)
                    TikTok имеет отдельный поток download_addr без знака.
/remove-watermark/ — вырезать знак из уже готового файла (blur / pixelate / delogo)
"""

import asyncio
import glob as glob_module
import subprocess
import uuid
from pathlib import Path

import yt_dlp
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import INPUTS_DIR
from services.ffmpeg import FFMPEG_CMD

router = APIRouter(tags=["Watermark"])

ENCODE_ARGS = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy"]


# ─── Скачать без водяного знака ─────────────────────────────────────────────

class CleanDownloadRequest(BaseModel):
    url: str


@router.post("/download-clean/", summary="Скачать видео без водяного знака по URL")
async def download_clean(body: CleanDownloadRequest, background_tasks: BackgroundTasks) -> FileResponse:
    """
    Скачивает видео через yt-dlp.
    Для TikTok использует формат download_addr — официальный поток без знака.
    Для Instagram, VK, YouTube — чистый оригинал без оверлеев.
    """
    uid = uuid.uuid4().hex
    output_template = str(INPUTS_DIR / f"dl_{uid}.%(ext)s")

    ydl_opts = {
        # download_addr-0  → TikTok без водяного знака (официальный download URL)
        # Fallback цепочка для других платформ
        "format": (
            "download_addr-0"
            "/bestvideo[ext=mp4][vcodec!*=av01]+bestaudio[ext=m4a]"
            "/bestvideo[ext=mp4]+bestaudio[ext=m4a]"
            "/bestvideo+bestaudio"
            "/best[ext=mp4]"
            "/best"
        ),
        "outtmpl": output_template,
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }

    def _do_download():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(body.url, download=True)
            return ydl.prepare_filename(info), info

    try:
        filename, info = await asyncio.to_thread(_do_download)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка скачивания: {str(e)[:500]}")

    # Ищем файл — после merge расширение может смениться на .mp4
    output_path = Path(filename)
    if not output_path.exists():
        output_path = output_path.with_suffix(".mp4")
    if not output_path.exists():
        found = sorted(glob_module.glob(str(INPUTS_DIR / f"dl_{uid}.*")))
        if not found:
            raise HTTPException(status_code=500, detail="Файл не найден после скачивания.")
        output_path = Path(found[0])

    if output_path.stat().st_size == 0:
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Скачан пустой файл.")

    raw_title = (info.get("title") or "video")[:60]
    safe_title = "".join(c for c in raw_title if c.isalnum() or c in " _-").strip() or "video"
    dl_name = f"{safe_title}.mp4"

    background_tasks.add_task(output_path.unlink, True)

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=dl_name,
        headers={"Content-Disposition": f'attachment; filename="{dl_name}"'},
    )


# ─── Удалить знак из файла (blur / pixelate / delogo) ───────────────────────

def _build_cmd(input_path: Path, output_path: Path, x: int, y: int, w: int, h: int, method: str) -> list[str]:
    base = [FFMPEG_CMD, "-y", "-i", str(input_path)]

    if method == "blur":
        fc = (
            f"[0:v]split[main][src];"
            f"[src]crop={w}:{h}:{x}:{y},gblur=sigma=40[blurred];"
            f"[main][blurred]overlay={x}:{y}[out]"
        )
        return base + ["-filter_complex", fc, "-map", "[out]", "-map", "0:a?"] + ENCODE_ARGS + [str(output_path)]

    if method == "pixelate":
        sc_w = max(1, w // 12)
        sc_h = max(1, h // 12)
        fc = (
            f"[0:v]split[main][src];"
            f"[src]crop={w}:{h}:{x}:{y},scale={sc_w}:{sc_h},scale={w}:{h}:flags=neighbor[px];"
            f"[main][px]overlay={x}:{y}[out]"
        )
        return base + ["-filter_complex", fc, "-map", "[out]", "-map", "0:a?"] + ENCODE_ARGS + [str(output_path)]

    # delogo
    return base + [
        "-vf", f"delogo=x={x}:y={y}:w={w}:h={h}:show=0",
        "-map", "0:v", "-map", "0:a?",
    ] + ENCODE_ARGS + [str(output_path)]


@router.post("/remove-watermark/", summary="Удалить водяной знак из видеофайла")
async def remove_watermark(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    w: int = Form(...),
    h: int = Form(...),
    method: str = Form(default="blur"),
) -> FileResponse:
    if w < 2 or h < 2:
        raise HTTPException(status_code=400, detail="Область слишком маленькая.")
    if method not in ("blur", "pixelate", "delogo"):
        method = "blur"

    ext = Path(file.filename or "video.mp4").suffix.lower() or ".mp4"
    uid = uuid.uuid4().hex
    input_path = INPUTS_DIR / f"wm_in_{uid}{ext}"
    output_path = INPUTS_DIR / f"wm_out_{uid}.mp4"

    try:
        with input_path.open("wb") as f_out:
            f_out.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {e}")

    cmd = _build_cmd(input_path, output_path, x, y, w, h, method)

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=600)
    except subprocess.TimeoutExpired:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Обработка превысила 10 минут.")
    except FileNotFoundError:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="FFmpeg не найден в PATH.")
    finally:
        input_path.unlink(missing_ok=True)

    if result.returncode != 0:
        output_path.unlink(missing_ok=True)
        stderr = result.stderr.decode(errors="replace")[-1500:]
        raise HTTPException(status_code=500, detail=f"FFmpeg ошибка: {stderr}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="Выходной файл пуст.")

    background_tasks.add_task(output_path.unlink, True)

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename="watermark_removed.mp4",
        headers={"Content-Disposition": "attachment; filename=watermark_removed.mp4"},
    )
