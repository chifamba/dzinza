from .file_schema import (
    FileUploadInitiateRequestSchema,
    FileUploadInitiateResponseSchema,
    FileUploadCompleteRequestSchema,
    FileMetadataResponseSchema,
    FileUpdateSchema,
    FileListQuerySchema,
    PresignedUrlResponseSchema,
    ImageMetadataSchema, # Re-export for clarity if needed
    VideoMetadataSchema, # Re-export for clarity if needed
)

# Base response for pagination if needed (can be shared from another service or defined here)
from pydantic import BaseModel
from typing import List, TypeVar, Generic

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
