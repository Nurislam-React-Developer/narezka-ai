"""
routes/compress.py

/compress-image/  — сжать изображение с параметрами quality, width, height, format.
"""

import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

router = APIRouter(tags=["Compress"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 20 * 1024 * 1024  # 20 МБ

MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "webp": "image/webp",
    "png": "image/png",
}


@router.post("/compress-image/", summary="Сжать изображение")
async def compress_image(
    file: UploadFile = File(...),
    quality: int = Form(default=80),
    width: int = Form(default=0),
    height: int = Form(default=0),
    format: str = Form(default="webp"),
):
    # ── Валидация ─────────────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail="Допустимые форматы: JPG, PNG, WebP, GIF.",
        )

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Файл превышает 20 МБ.")

    quality = max(1, min(100, quality))
    if format not in MEDIA_TYPES:
        format = "webp"

    # ── Обработка ─────────────────────────────────────────────────────────────
    try:
        img = Image.open(BytesIO(data))
    except Exception:
        raise HTTPException(status_code=400, detail="Не удалось открыть изображение.")

    # RGBA → RGB для JPEG (JPEG не поддерживает альфа-канал)
    if format == "jpg" and img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    # Ресайз с сохранением пропорций
    if width > 0 or height > 0:
        orig_w, orig_h = img.size
        if width > 0 and height > 0:
            new_size = (width, height)
        elif width > 0:
            ratio = width / orig_w
            new_size = (width, round(orig_h * ratio))
        else:
            ratio = height / orig_h
            new_size = (round(orig_w * ratio), height)
        img = img.resize(new_size, Image.LANCZOS)

    # ── Сохранение в буфер ────────────────────────────────────────────────────
    buf = BytesIO()
    save_format = {"jpg": "JPEG", "webp": "WEBP", "png": "PNG"}[format]

    save_kwargs = {"format": save_format}
    if save_format in ("JPEG", "WEBP"):
        save_kwargs["quality"] = quality
    if save_format == "WEBP":
        save_kwargs["method"] = 4

    img.save(buf, **save_kwargs)
    buf.seek(0)

    ext = "jpg" if format == "jpg" else format
    filename = f"compressed_{uuid.uuid4().hex[:8]}.{ext}"

    return StreamingResponse(
        buf,
        media_type=MEDIA_TYPES[format],
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Original-Size": str(len(data)),
            "X-Compressed-Size": str(buf.getbuffer().nbytes),
        },
    )
