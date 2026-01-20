"""EXIF data extraction utilities."""

from PIL import Image
from PIL.ExifTags import TAGS
from io import BytesIO

def extract_exif(image_bytes: bytes):
    try:
        image = Image.open(BytesIO(image_bytes))
        exif_data = image._getexif()
        if not exif_data:
            return {}
        return {TAGS.get(tag, tag): value for tag, value in exif_data.items()}
    except Exception:
        return {}
