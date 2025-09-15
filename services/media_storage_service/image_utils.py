"""Image compression and thumbnail utilities."""

from PIL import Image
from io import BytesIO

def compress_image(image_bytes: bytes, quality: int = 75) -> bytes:
    image = Image.open(BytesIO(image_bytes))
    buf = BytesIO()
    image.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()

def generate_thumbnail(image_bytes: bytes, size=(128, 128)) -> bytes:
    image = Image.open(BytesIO(image_bytes))
    image.thumbnail(size)
    buf = BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()
