from PIL import Image, ImageOps, ExifTags
import io
from typing import List, Tuple, Dict, Optional, TypedDict, Any
import logging

from app.config import settings

logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logging.basicConfig(level=logging.INFO)

class ThumbnailData(TypedDict):
    size_name: str
    buffer: io.BytesIO
    width: int
    height: int
    mime_type: str

class ProcessedImageResult(TypedDict):
    original_metadata: Dict[str, Any]
    thumbnails: List[ThumbnailData]


class ImageProcessorServiceClass:
    def __init__(self):
        self.thumbnail_sizes: List[Tuple[int, int]] = settings.THUMBNAIL_SIZES
        self.default_format: str = settings.THUMBNAIL_DEFAULT_FORMAT.upper()
        self._initialized = False

    async def initialize(self):
        logger.info("ImageProcessorService initializing...")
        logger.info(f"Configured thumbnail sizes: {self.thumbnail_sizes}")
        logger.info(f"Configured thumbnail format: {self.default_format}")
        self._initialized = True
        logger.info("ImageProcessorService initialized successfully.")


    def is_ready(self) -> bool:
        return self._initialized

    def _extract_exif_data(self, pil_image: Image.Image) -> Dict[str, Any]:
        exif_data = {}
        try:
            exif = pil_image._getexif() # This is a protected member, but commonly used.
            if exif:
                for tag_id, value in exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                    # Decode bytes if possible
                    if isinstance(value, bytes):
                        try:
                            exif_data[str(tag_name)] = value.decode('utf-8', errors='replace')
                        except UnicodeDecodeError:
                            exif_data[str(tag_name)] = repr(value) # Store as repr if not decodable
                    else:
                        exif_data[str(tag_name)] = value
        except Exception as e:
            logger.warning(f"Could not extract EXIF data: {e}")
        return exif_data

    async def process_image(
        self,
        image_buffer: bytes,
        original_filename: str
    ) -> Optional[ProcessedImageResult]:
        if not self._initialized:
            logger.error("ImageProcessorService not initialized. Cannot process image.")
            return None

        try:
            img = Image.open(io.BytesIO(image_buffer))

            # Try to preserve original format unless it's something exotic or needs conversion
            img_format_original = img.format or "JPEG" # Default if format is None

            # Handle image mode for saving (e.g., RGBA to RGB for JPEG)
            if img_format_original.upper() == "JPEG" and img.mode == "RGBA":
                img = img.convert("RGB")
            elif img_format_original.upper() == "WEBP" and img.mode == "RGBA": # WebP supports RGBA
                 pass # Keep as RGBA for WebP if that's the target
            elif img.mode not in ("RGB", "L", "RGBA", "LA", "CMYK", "YCbCr", "I", "F"): # Grayscale 'L' is fine for JPEG/PNG
                 logger.warning(f"Image {original_filename} has unusual mode {img.mode}, attempting conversion to RGB.")
                 try:
                    img = img.convert("RGB")
                 except Exception as conv_err:
                    logger.error(f"Failed to convert image {original_filename} from mode {img.mode} to RGB: {conv_err}")
                    return None # Cannot process further

            exif_metadata = self._extract_exif_data(img)

            original_metadata = {
                "width": img.width,
                "height": img.height,
                "format": img_format_original,
                "mode": img.mode,
                "exif": exif_metadata
            }

            generated_thumbnails: List[ThumbnailData] = []

            for target_width, target_height in self.thumbnail_sizes:
                try:
                    thumb_img = img.copy()

                    # Resize while maintaining aspect ratio, fitting within target_width x target_height
                    thumb_img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)

                    thumb_buffer = io.BytesIO()

                    # Determine save format for thumbnail (e.g., always JPEG or WEBP for thumbs)
                    save_format_thumb = self.default_format # e.g., "JPEG" or "WEBP"
                    thumb_mime_type = f"image/{save_format_thumb.lower()}"

                    save_options = {}
                    if save_format_thumb == "JPEG":
                        save_options = {'quality': 85, 'optimize': True}
                        if thumb_img.mode == "RGBA" or thumb_img.mode == "LA": # JPEG doesn't support alpha
                            thumb_img_to_save = thumb_img.convert("RGB")
                        else:
                            thumb_img_to_save = thumb_img
                    elif save_format_thumb == "WEBP":
                        save_options = {'quality': 80, 'lossless': False} # Adjust as needed
                        thumb_img_to_save = thumb_img # WEBP handles RGBA
                    elif save_format_thumb == "PNG":
                         save_options = {'optimize': True}
                         thumb_img_to_save = thumb_img # PNG handles RGBA
                    else: # Fallback or other formats
                        thumb_img_to_save = thumb_img

                    thumb_img_to_save.save(thumb_buffer, format=save_format_thumb, **save_options)
                    thumb_buffer.seek(0)

                    size_name = f"{target_width}x{target_height}" # Or more descriptive e.g. "thumb_small"

                    generated_thumbnails.append({
                        "size_name": size_name,
                        "buffer": thumb_buffer, # This is io.BytesIO containing the image bytes
                        "width": thumb_img.width, # Actual width after thumbnail()
                        "height": thumb_img.height, # Actual height after thumbnail()
                        "mime_type": thumb_mime_type
                    })
                except Exception as e_thumb:
                    logger.error(f"Failed to generate thumbnail of size {target_width}x{target_height} for {original_filename}: {e_thumb}", exc_info=True)

            return ProcessedImageResult(
                original_metadata=original_metadata,
                thumbnails=generated_thumbnails
            )

        except Exception as e:
            logger.error(f"Failed to process image {original_filename}: {e}", exc_info=True)
            return None

ImageProcessor = ImageProcessorServiceClass()

async def startup_image_processor():
    await ImageProcessor.initialize()

# No explicit shutdown needed for Pillow based service usually
# async def shutdown_image_processor():
#     pass
