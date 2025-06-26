from .s3_service import S3Service
from .image_processor_service import ImageProcessorService
from .cleanup_service import CleanupService

# Instantiate services if they are to be used as singletons
# Or provide factory functions if they need request-specific context or configuration.

s3_service_instance = S3Service()
image_processor_instance = ImageProcessorService()
# CleanupService might be managed differently, e.g., by a scheduler in main.py
# cleanup_service_instance = CleanupService()
