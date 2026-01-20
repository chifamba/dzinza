"""Request handlers for media_storage_service."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from minio import Minio
import os
from .metadata import (
    add_tag, get_tags, add_to_album, get_album,
    search_by_tag, add_media_date, get_media_timeline
)
from .exif_utils import extract_exif
from .image_utils import compress_image, generate_thumbnail
import subprocess

router = APIRouter()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "garage1:39000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "media")

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False,
)

@router.post("/upload/")
async def upload_media(file: UploadFile = File(...), folder: str = None):
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
        content = await file.read()
        filename = file.filename
        if folder:
            filename = f"{folder}/{filename}"
        minio_client.put_object(
            MINIO_BUCKET,
            filename,
            content,
            length=len(content),
            content_type=file.content_type,
        )
        return {"filename": filename, "bucket": MINIO_BUCKET}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/bulk/")
async def bulk_upload(files: list[UploadFile] = File(...), folder: str = None):
    results = []
    for file in files:
        try:
            content = await file.read()
            filename = file.filename
            if folder:
                filename = f"{folder}/{filename}"
            minio_client.put_object(
                MINIO_BUCKET,
                filename,
                content,
                length=len(content),
                content_type=file.content_type,
            )
            results.append({"filename": filename, "status": "uploaded"})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "error": str(e)})
    return results

@router.get("/media/{filename}")
def get_media(filename: str, token: str = None, decrypt: bool = False, user: str = None):
    """
    Secure media access placeholder. In production, validate token and permissions.
    """
    # TODO: Validate token and user permissions for secure access
    # Simple ACL check
    acl = _media_acl.get(filename, set())
    if acl and user and user not in acl:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        data = response.read()
        if decrypt:
            # Placeholder for decryption logic
            return b"decrypted-" + data
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Media not found")

_media_acl = {}

@router.post("/media/{filename}/share/")
def share_media(filename: str, user: str):
    acl = _media_acl.setdefault(filename, set())
    acl.add(user)
    return {"filename": filename, "shared_with": list(acl)}

@router.post("/media/{filename}/unshare/")
def unshare_media(filename: str, user: str):
    acl = _media_acl.setdefault(filename, set())
    acl.discard(user)
    return {"filename": filename, "shared_with": list(acl)}

@router.get("/media/{filename}/acl/")
def get_media_acl(filename: str):
    acl = _media_acl.get(filename, set())
    return {"filename": filename, "shared_with": list(acl)}

@router.post("/media/backup/")
def backup_media():
    """
    Placeholder for media backup. In production, implement backup to another bucket or storage.
    """
    return {"status": "backup not implemented"}

@router.get("/media/analytics/")
def media_analytics():
    """
    Basic analytics: count of media files and total storage (approximate).
    """
    objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
    count = 0
    total_size = 0
    for obj in objects:
        count += 1
        total_size += getattr(obj, "size", 0)
    return {"media_count": count, "total_storage_bytes": total_size}

@router.post("/media/{filename}/encrypt/")
def encrypt_media(filename: str):
    """
    Placeholder for media encryption. In production, use a crypto library and key management.
    """
    return {"filename": filename, "status": "encryption not implemented"}

@router.get("/media/{filename}/compressed/")
def get_compressed_image(filename: str, quality: int = 75):
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        image_bytes = response.read()
        compressed = compress_image(image_bytes, quality)
        return compressed
    except Exception as e:
        raise HTTPException(status_code=404, detail="Media not found")

@router.get("/media/{filename}/thumbnail/")
def get_thumbnail(filename: str, size: int = 128):
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        image_bytes = response.read()
        thumb = generate_thumbnail(image_bytes, (size, size))
        return thumb
    except Exception as e:
        raise HTTPException(status_code=404, detail="Media not found")

@router.post("/media/{filename}/transcode/")
def transcode_video(filename: str, target_format: str = "mp4"):
    """
    Placeholder for video transcoding. In production, use ffmpeg or a video processing service.
    """
    # Example: subprocess.run(["ffmpeg", "-i", "input", "output"])
    return {"filename": filename, "target_format": target_format, "status": "transcoding not implemented"}

@router.get("/media/{filename}/stream/")
def adaptive_streaming(filename: str, quality: str = "auto"):
    """
    Placeholder for adaptive streaming. In production, use HLS/DASH and a CDN.
    """
    return {"filename": filename, "quality": quality, "status": "adaptive streaming not implemented"}

@router.post("/media/{filename}/watermark/")
def watermark_media(filename: str, watermark_text: str):
    """
    Placeholder for watermarking. In production, use Pillow or ffmpeg to apply watermark.
    """
    return {"filename": filename, "watermark": watermark_text, "status": "watermarking not implemented"}

@router.get("/media/{filename}/exif/")
def get_exif(filename: str):
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        image_bytes = response.read()
        exif = extract_exif(image_bytes)
        return {"filename": filename, "exif": exif}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Media not found")

@router.post("/media/{filename}/facial_recognition/")
def facial_recognition(filename: str):
    """
    Placeholder for facial recognition. In production, integrate with a facial recognition library or service.
    """
    return {"filename": filename, "faces": [], "status": "facial recognition not implemented"}

@router.post("/media/{filename}/tag/")
def tag_media(filename: str, tag: str):
    add_tag(filename, tag)
    return {"filename": filename, "tag": tag}

@router.get("/media/search/")
def search_media_by_tag(tag: str):
    files = search_by_tag(tag)
    return {"tag": tag, "files": files}

@router.post("/media/{filename}/date/")
def set_media_date(filename: str, date: str):
    add_media_date(filename, date)
    return {"filename": filename, "date": date}

@router.get("/media/timeline/")
def get_timeline(start: int = None, end: int = None):
    files = get_media_timeline(start, end)
    return {"timeline": files}

@router.get("/media/{filename}/tags/")
def list_tags(filename: str):
    return {"filename": filename, "tags": get_tags(filename)}

@router.post("/album/{album}/add/")
def add_media_to_album(album: str, filename: str):
    add_to_album(filename, album)
    return {"album": album, "filename": filename}

@router.get("/album/{album}/")
def list_album(album: str):
    return {"album": album, "files": get_album(album)}
