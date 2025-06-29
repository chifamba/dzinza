import datetime
import uuid
from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, List, Dict, Any, Union

class Thumbnail(BaseModel):
    size_name: str # e.g., "small", "medium", "large", "thumb_100x100"
    width: Optional[int] = None
    height: Optional[int] = None
    s3_key: str
    url: HttpUrl

class FileMetadata(BaseModel): # For custom metadata attached by user or extracted
    # Common fields
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    creation_date: Optional[datetime.datetime] = None # Date the original content was created
    location_taken: Optional[str] = None # For photos/videos

    # Image specific (can be from EXIF)
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

    # Document specific
    page_count: Optional[int] = None
    word_count: Optional[int] = None

    # S3 specific (populated by S3Service)
    s3_version_id: Optional[str] = None
    s3_etag: Optional[str] = None

    # Allow other arbitrary key-value pairs
    # extra_metadata: Dict[str, Any] = Field(default_factory=dict) # Or handle this via model_extra='allow'

    class Config:
        extra = "allow" # Allow arbitrary key-value pairs not explicitly defined


class FileRecord(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id") # MongoDB uses _id
    user_id: str # ID of the user who uploaded/owns the file
    family_tree_id: Optional[str] = None # Optional: if file is associated with a specific tree

    original_name: str # Original filename from upload
    filename: str # Sanitized name or generated name used for storage (often part of s3_key)
    s3_key: str # Full S3 object key
    url: HttpUrl # Presigned or public S3 URL (depending on privacy)

    size_bytes: int
    mime_type: str

    category: str = Field(default="other", pattern="^(photo|document|audio|video|other)$")
    privacy: str = Field(default="private", pattern="^(public|private|family)$") # family might mean shared with tree members

    # User-defined metadata
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    # System-generated metadata & associations
    metadata: FileMetadata = Field(default_factory=FileMetadata) # Holds EXIF, S3 ETag, custom fields etc.
    thumbnails: List[Thumbnail] = Field(default_factory=list)

    related_persons: List[str] = Field(default_factory=list) # List of Person IDs
    related_events: List[str] = Field(default_factory=list)   # List of Event IDs

    is_deleted: bool = False # For soft delete
    deleted_at: Optional[datetime.datetime] = None

    uploaded_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    class Config:
        populate_by_name = True # Allows using "_id" from MongoDB and "id" in Pydantic
        json_encoders = {
            datetime.datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u)
        }
        # If you need to allow arbitrary fields on FileRecord itself (less common than on metadata)
        # extra = "allow"

    @validator('updated_at', pre=True, always=True)
    def set_updated_at_on_update(cls, v, values):
        # This validator is tricky for setting on update with Pydantic v2 models.
        # It's better to handle updated_at timestamp logic in the CRUD/service layer
        # when an update operation occurs, rather than relying on a Pydantic validator for it.
        # Pydantic validators are primarily for input validation.
        # For now, this will set it on creation. Updates need explicit setting in CRUD.
        return v or datetime.datetime.utcnow()

# Schemas for API requests/responses can be derived from FileRecord or defined separately
# For example, for file upload response:
class FileUploadResponse(BaseModel):
    id: uuid.UUID
    original_name: str
    url: HttpUrl
    size_bytes: int
    mime_type: str
    category: str
    uploaded_at: datetime.datetime
    thumbnails: Optional[List[Thumbnail]] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime.datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u)
        }

class FileUploadListResponse(BaseModel): # New model for list responses
    data: List[FileUploadResponse]
    total_success: int
    total_failed: int
    # errors: List[Dict[str, Any]] # Optional: to provide details on per-file failures

class FileListResponse(BaseModel): # For GET /files endpoint
    data: List[FileRecord] # Returning full FileRecord for list view
    page: int
    limit: int
    total_records: int
    total_pages: int


class FileUpdateSchema(BaseModel):
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy: Optional[str] = Field(None, pattern="^(public|private|family)$")
    family_tree_id: Optional[str] = None # Allow changing association
    related_persons: Optional[List[str]] = None
    related_events: Optional[List[str]] = None
    # Add other updatable metadata fields if necessary, e.g., under a 'metadata' sub-object
    # metadata_title: Optional[str] = Field(None, alias="metadata.title") # Example for updating nested

    # Ensure no critical fields like s3_key, user_id, etc., are updatable here.
    class Config:
        extra = "forbid" # Prevent arbitrary fields in update payload
        # If using alias for metadata.title, ensure your CRUD handles nested updates.
        # populate_by_name = True # if aliases are used like 'metadata.title' to map to nested structure.

class FileDownloadLinkResponse(BaseModel):
    download_url: HttpUrl
    expires_at: datetime.datetime
    filename: str # Original filename for content-disposition suggestion

class MessageResponse(BaseModel): # Added for generic messages
    message: str

# This model represents the data structure. CRUD functions will interact with MongoDB
# using Motor and these Pydantic models for validation and serialization.
# The `id` field is aliased to `_id` to match MongoDB's default primary key field name.
# `default_factory=uuid.uuid4` ensures a new UUID is generated if no ID is provided (e.g., on creation).
# `populate_by_name = True` in Config allows Pydantic to use field aliases during model instantiation.
# For example, if data from MongoDB has `_id`, Pydantic can map it to the `id` field.
# When inserting, Pydantic model `model_dump(by_alias=True)` would produce `{"_id": ...}`.
# Motor operations will typically use dictionaries, so `file_record.model_dump(by_alias=True)` will be useful.
