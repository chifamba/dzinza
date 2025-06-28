from PIL import Image, ExifTags
from io import BytesIO
import os
from typing import Optional, Tuple, Dict, Any

from app.core.config import settings
from app.utils.logger import logger

class ImageProcessorService:
    def __init__(self):
        self.thumbnail_size = (settings.IMAGE_THUMBNAIL_SIZE_PX, settings.IMAGE_THUMBNAIL_SIZE_PX)
        self.allowed_extensions = [ext.lower() for ext in settings.IMAGE_ALLOWED_EXTENSIONS]

    def _get_image_format(self, image: Image.Image, original_filename: Optional[str] = None) -> str:
        """Determines the image format, preferring original if known and valid, else from Pillow."""
        pil_format = image.format
        if pil_format:
            pil_format_lower = pil_format.lower()
            if pil_format_lower in ["jpg", "jpeg"] and "jpeg" in self.allowed_extensions: return "jpeg"
            if pil_format_lower in self.allowed_extensions: return pil_format_lower

        # Fallback if Pillow format is None or not directly allowed (e.g. from BytesIO)
        if original_filename:
            ext = original_filename.split('.')[-1].lower()
            if ext in self.allowed_extensions:
                return ext

        # Default to jpeg if unsure and it's allowed
        return "jpeg" if "jpeg" in self.allowed_extensions else "png"


    async def create_thumbnail(self, image_bytes: bytes, original_filename: Optional[str] = None) -> Optional[Tuple[BytesIO, str, str]]:
        """
        Creates a thumbnail from image bytes.
        Returns a tuple of (thumbnail_bytes_io, thumbnail_mime_type, thumbnail_format_extension) or None on error.
        """
        try:
            img = Image.open(BytesIO(image_bytes))

            # Preserve orientation if EXIF data exists
            try:
                for orientation in ExifTags.TAGS.keys():
                    if ExifTags.TAGS[orientation] == 'Orientation':
                        break
                exif = dict(img._getexif().items())

                if exif[orientation] == 3:
                    img = img.rotate(180, expand=True)
                elif exif[orientation] == 6:
                    img = img.rotate(270, expand=True)
                elif exif[orientation] == 8:
                    img = img.rotate(90, expand=True)
            except (AttributeError, KeyError, IndexError):
                # Cases: image doesn't have getexif or an Orientation tag, or EXIF data is missing/corrupt
                pass # No EXIF orientation info, proceed as is

            # Ensure image is in RGB or RGBA mode for saving as JPEG/PNG
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGBA') # Convert to RGBA to handle transparency for PNG

            img.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS) # High quality downsampling

            thumb_io = BytesIO()

            # Determine format - prefer original if PNG for transparency, else JPEG for size
            # For simplicity, let's try to save as PNG if original was PNG and transparency might be present.
            # Otherwise, JPEG is usually smaller for thumbnails.
            # The `_get_image_format` helps decide.

            thumb_format_ext = self._get_image_format(img, original_filename)
            save_format_pil = thumb_format_ext.upper()
            if save_format_pil == "JPG": save_format_pil = "JPEG" # Pillow uses JPEG

            if save_format_pil == "PNG" and img.mode != 'RGBA':
                img = img.convert('RGBA') # Ensure alpha channel for PNG
            elif save_format_pil == "JPEG" and img.mode == 'RGBA':
                 # JPEGs don't support alpha. Create white background.
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3]) # 3 is the alpha channel
                img = bg
            elif img.mode == 'P': # Palette mode, convert to RGB/RGBA
                 img = img.convert('RGBA' if save_format_pil == "PNG" else 'RGB')


            img.save(thumb_io, format=save_format_pil, quality=85, optimize=True if save_format_pil=="JPEG" else False)
            thumb_io.seek(0)

            thumbnail_mime_type = Image.MIME.get(save_format_pil, "image/jpeg") # Default mime if somehow format is odd

            logger.info(f"Thumbnail created successfully. Format: {save_format_pil}, MIME: {thumbnail_mime_type}")
            return thumb_io, thumbnail_mime_type, thumb_format_ext.lower()

        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}", exc_info=True)
            return None

    async def get_image_metadata(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Extracts metadata (width, height, format) from image bytes.
        """
        try:
            img = Image.open(BytesIO(image_bytes))
            metadata = {
                "width": img.width,
                "height": img.height,
                "format": img.format.lower() if img.format else None,
                # "exif_data": dict(img._getexif()) if hasattr(img, '_getexif') and img._getexif() else None
            }
            # Basic EXIF parsing (can be expanded)
            # exif_data = {}
            # if hasattr(img, '_getexif'):
            #     exif = img._getexif()
            #     if exif:
            #         for tag, value in exif.items():
            #             decoded = ExifTags.TAGS.get(tag, tag)
            #             if isinstance(decoded, str): # Only store named tags
            #                 exif_data[decoded] = str(value) if isinstance(value, bytes) else value
            # metadata["exif_data"] = exif_data if exif_data else None

            return metadata
        except Exception as e:
            logger.error(f"Error getting image metadata: {e}", exc_info=True)
            return None

    def is_allowed_extension(self, filename: str) -> bool:
        if not filename or '.' not in filename:
            return False
        ext = filename.rsplit('.', 1)[1].lower()
        return ext in self.allowed_extensions

# Note: All Pillow operations are CPU-bound and synchronous.
# In an async FastAPI app, these should be run in a thread pool to avoid blocking the event loop.
# Example:
# import asyncio
# loop = asyncio.get_running_loop()
# result = await loop.run_in_executor(None, self.create_thumbnail_sync, image_bytes)
# where create_thumbnail_sync is the synchronous version of the method.
# For this conversion, I'm keeping them as async methods that call sync Pillow code directly.
# This implies they will block if not handled with threading by the caller or a decorator.
