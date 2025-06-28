from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
import uuid # For user_id and entity IDs
from datetime import datetime

from app.models.base_model import PyObjectId
from app.models.file_metadata_model import FileType, FileStatus, ImageMetadata, VideoMetadata

# Re-exporting or redefining sub-models for schema clarity if they differ from storage model
class ImageMetadataSchema(ImageMetadata): # Inherit from model
    pass

class VideoMetadataSchema(VideoMetadata): # Inherit from model
    pass


# Request to initiate a file upload (e.g., to get a presigned URL for S3)
class FileUploadInitiateRequestSchema(BaseModel):
    original_filename: str = Field(..., max_length=255)
    mime_type: str = Field(..., max_length=100)
    size_bytes: int = Field(..., gt=0) # Must be greater than 0
    file_type: Optional[FileType] = FileType.OTHER # Client can suggest, server can verify/override

    # Optional: context for the file
    family_tree_id: Optional[PyObjectId] = None
    person_id: Optional[PyObjectId] = None
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    is_temporary: bool = False # For temporary uploads

# Response after initiating an upload
class FileUploadInitiateResponseSchema(BaseModel):
    file_id: PyObjectId # The ID of the FileMetadata document created
    upload_url: Optional[HttpUrl] = None # Presigned URL for direct S3 upload (PUT)
    # For chunked uploads, might include upload_id and part_urls
    # fields: Optional[Dict[str, str]] = None # For presigned POST, fields to include in the form
    message: str = "Upload initiated successfully."

# Request to mark an upload as complete (after client uploads to S3)
class FileUploadCompleteRequestSchema(BaseModel):
    # file_id: PyObjectId # Usually part of path parameter
    s3_key: Optional[str] = None # If client knows the final key (e.g. from presigned POST response)
    s3_version_id: Optional[str] = None # If S3 versioning is used
    checksum_md5: Optional[str] = None # Client-calculated MD5, server can verify
    checksum_sha256: Optional[str] = None
    # For chunked uploads, might include etags of parts
    # parts: Optional[List[Dict[str, Any]]] = None # e.g. [{"ETag": "...", "PartNumber": ...}]

# Schema for file metadata response
class FileMetadataResponseSchema(BaseModel):
    id: PyObjectId = Field(alias="_id")
    user_id: uuid.UUID
    original_filename: str
    generated_filename: Optional[str] = None
    file_type: FileType
    mime_type: str
    size_bytes: int
    status: FileStatus

    storage_provider: str
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None

    family_tree_id: Optional[PyObjectId] = None
    person_id: Optional[PyObjectId] = None

    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []

    image_meta: Optional[ImageMetadataSchema] = None
    video_meta: Optional[VideoMetadataSchema] = None

    is_temporary: bool
    expires_at: Optional[datetime] = None

    download_url: Optional[HttpUrl] = None # Dynamically generated presigned URL for downloads

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
            FileType: lambda ft: ft.value if ft else None,
            FileStatus: lambda fs: fs.value if fs else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)

# Schema for updating file metadata
class FileUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    # Context linking (careful with allowing changes that might orphan files or mis-link)
    family_tree_id: Optional[PyObjectId] = None
    person_id: Optional[PyObjectId] = None
    # is_temporary: Optional[bool] = None # Usually system controlled or on creation
    # status: Optional[FileStatus] = None # Usually system controlled

# Schema for querying a list of files
class FileListQuerySchema(BaseModel):
    user_id: Optional[uuid.UUID] = None # Filter by user (admin use)
    family_tree_id: Optional[PyObjectId] = None
    person_id: Optional[PyObjectId] = None
    file_type: Optional[FileType] = None
    status: Optional[FileStatus] = None
    original_filename_contains: Optional[str] = None
    tag: Optional[str] = None # Filter by a single tag
    # Add date range filters if needed

# Schema for presigned URL response (can be for upload or download)
class PresignedUrlResponseSchema(BaseModel):
    url: HttpUrl
    method: str # e.g., "PUT" for upload, "GET" for download
    expires_at: datetime # When the presigned URL expires
    # fields: Optional[Dict[str, str]] = None # For presigned POST (S3)
    file_id: Optional[PyObjectId] = None # If related to a specific file metadata entry
