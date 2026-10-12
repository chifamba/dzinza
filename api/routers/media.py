"""Private media storage: photos, scans, documents.

Files are stored under MEDIA_DIR (default /app/media, a Docker volume) as
`{uuid4hex}{ext}` — the uuid is the file_id, so user input never touches a
path and path traversal is impossible. A `{uuid4hex}.json` sidecar keeps the
original filename, content type, and size.

Every route requires auth: these are private family documents.
"""

import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from ..auth import require_auth

router = APIRouter(prefix="/api/media", tags=["media"])

MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", "/app/media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

MAX_BYTES = 25 * 1024 * 1024  # 25 MB per file
_CHUNK = 1024 * 1024  # 1 MB streaming chunks

# content_type -> extension. Anything else is rejected with 422.
_ALLOWED: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/csv": ".csv",
}


def _resolve(file_id: uuid.UUID) -> tuple[Path, dict] | tuple[None, None]:
    """Find the stored file + its sidecar metadata for a file_id.

    The id must be a valid UUID and we only ever glob inside MEDIA_DIR,
    so there is no path traversal.
    """
    matches = [
        p
        for p in MEDIA_DIR.glob(f"{file_id.hex}.*")
        if p.suffix != ".json" and p.is_file()
    ]
    if not matches:
        return None, None
    meta_path = MEDIA_DIR / f"{file_id.hex}.json"
    meta: dict = {}
    if meta_path.is_file():
        try:
            meta = json.loads(meta_path.read_text())
        except (json.JSONDecodeError, OSError):
            meta = {}
    return matches[0], meta


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...), _: None = Depends(require_auth)
):
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    ext = _ALLOWED.get(content_type)
    if not ext:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unsupported file type: {file.content_type or 'unknown'}. "
            "Allowed: images (jpg/png/webp/gif), PDF, Word docs, txt, csv.",
        )

    file_id = uuid.uuid4()
    dest = MEDIA_DIR / f"{file_id.hex}{ext}"
    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(_CHUNK)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_BYTES:
                    raise _TooLarge()
                out.write(chunk)
    except _TooLarge:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"File too large (max {MAX_BYTES // (1024 * 1024)} MB)",
        )
    finally:
        await file.close()

    if size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Uploaded file is empty"
        )

    # Original filename is metadata only — never used in a path.
    original = Path(file.filename or "upload").name[:200]
    (MEDIA_DIR / f"{file_id.hex}.json").write_text(
        json.dumps(
            {"filename": original, "content_type": content_type, "size": size}
        )
    )
    return {
        "file_id": str(file_id),
        "filename": original,
        "content_type": content_type,
        "size": size,
    }


class _TooLarge(Exception):
    """Internal: raised when the streamed upload exceeds MAX_BYTES."""


@router.get("/{file_id}")
def get_media(file_id: uuid.UUID, _: None = Depends(require_auth)):
    path, meta = _resolve(file_id)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return FileResponse(
        path,
        media_type=meta.get("content_type", "application/octet-stream"),
        filename=meta.get("filename", path.name),
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(file_id: uuid.UUID, _: None = Depends(require_auth)):
    path, _ = _resolve(file_id)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    path.unlink(missing_ok=True)
    (MEDIA_DIR / f"{file_id.hex}.json").unlink(missing_ok=True)
    return None
