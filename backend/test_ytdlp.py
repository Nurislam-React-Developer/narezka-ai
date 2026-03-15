from pathlib import Path
import sys
_PYTHON_BIN_DIR = Path(sys.executable).parent
_YTDLP_BIN = _PYTHON_BIN_DIR / "yt-dlp"
YTDLP_CMD = str(_YTDLP_BIN) if _YTDLP_BIN.exists() else "yt-dlp"
print(YTDLP_CMD)
