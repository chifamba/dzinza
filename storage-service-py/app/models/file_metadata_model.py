from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid # For user_id and entity IDs from other services
from datetime import datetime

from app.models.base_model import BaseDocumentModel, PyObjectId

class FileType(str, Enum):
    IMAGE = "image"
    DOCUMENT = "document" # PDF, DOCX, TXT
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive" # ZIP, RAR
    GENEALOGY = "genealogy" # GEDCOM, etc.
    OTHER = "other"

class FileStatus(str, Enum):
    UPLOADING = "uploading" # Initial state, file parts being uploaded
    UPLOADED = "uploaded"   # All parts received, awaiting processing/verification
    PROCESSING = "processing" # e.g., thumbnail generation, virus scan
    AVAILABLE = "available" # Ready for use
    ARCHIVED = "archived"   # Not actively used but kept
    ERROR = "error"         # An error occurred during upload or processing
    DELETED = "deleted"     # Soft delete

class ImageMetadata(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None # e.g., "jpeg", "png"
    has_thumbnail: bool = False
    thumbnail_s3_key: Optional[str] = None # Key for the thumbnail in S3
    # exif_data: Optional[Dict[str, Any]] = None # If extracting EXIF

class VideoMetadata(BaseModel):
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    codec: Optional[str] = None
    # has_preview_thumbnail: bool = False
    # preview_thumbnail_s3_key: Optional[str] = None

class FileMetadataModel(BaseDocumentModel):
    user_id: uuid.UUID = Field(...) # User who uploaded or owns the file

    original_filename: str = Field(..., max_length=255)
    generated_filename: Optional[str] = None # Unique filename used for storage, e.g., UUID based

    file_type: FileType = Field(default=FileType.OTHER)
    mime_type: str = Field(..., max_length=100) # Detected MIME type
    size_bytes: int = Field(...)

    status: FileStatus = Field(default=FileStatus.UPLOADING)

    # Storage details (e.g., S3)
    storage_provider: str = Field(default="s3") # "s3", "local"
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None # Full path/key in the S3 bucket
    s3_version_id: Optional[str] = None # If S3 versioning is used

    # For local storage, if used as primary or fallback
    # local_file_path: Optional[str] = None

    # For linking to other entities in the Dzinza platform
    family_tree_id: Optional[PyObjectId] = None # If file is associated with a family tree
    person_id: Optional[PyObjectId] = None      # If file is associated with a person
    # event_id: Optional[PyObjectId] = None       # If file is associated with an event
    # source_id: Optional[PyObjectId] = None      # If file is a source document

    # User-provided metadata
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = Field(default_factory=list)
    # date_taken: Optional[datetime] = None # If applicable, e.g., for photos

    # Image/Video specific metadata (populated after processing)
    image_meta: Optional[ImageMetadata] = None
    video_meta: Optional[VideoMetadata] = None
    # audio_meta: Optional[AudioMetadata] = None

    # Access control / sharing (simplified for now)
    # is_public: bool = False
    # shared_with_user_ids: List[uuid.UUID] = Field(default_factory=list)

    # For temporary files that might be cleaned up
    is_temporary: bool = False
    expires_at: Optional[datetime] = None # If temporary file has an expiry

    # Checksum for integrity
    checksum_md5: Optional[str] = None
    checksum_sha256: Optional[str] = None

    class Config:
        # collection_name = "file_metadata"
        json_encoders = {
            **BaseDocumentModel.Config.json_encoders,
            FileType: lambda ft: ft.value,
            FileStatus: lambda fs: fs.value,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)
