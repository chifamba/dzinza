from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional, Annotated
import mimetypes # For guessing mime types if not provided
import secrets # For generating unique filenames

from app.db.database import get_db_storage_dependency as get_db # Renamed for clarity
from app.crud import file_metadata_crud
from app.schemas import file_schema, PaginatedResponse
from app.models.base_model import PyObjectId
from app.models.file_metadata_model import FileMetadataModel, FileStatus, FileType, ImageMetadata
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.services.s3_service import s3_service_instance as s3_service # Use instantiated service
from app.services.image_processor_service import image_processor_instance as image_processor # Use instantiated service
from app.core.config import settings
from app.utils.logger import logger
from datetime import datetime, timezone


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

def generate_s3_key(user_id: uuid.UUID, original_filename: str, file_type: FileType) -> str:
    """Generates a unique S3 key."""
    # Sanitize filename (optional, S3 handles most chars but good practice)
    # safe_filename = "".join(c if c.isalnum() or c in ['.', '-'] else '_' for c in original_filename)
    random_prefix = secrets.token_hex(8)
    # Keep extension if present, or add one based on file_type/mime
    _, ext = os.path.splitext(original_filename)
    if not ext and file_type == FileType.IMAGE: # Example: default to .jpg for images if no ext
        ext = ".jpg" # This should be based on actual processed format

    return f"users/{user_id}/{file_type.value}/{random_prefix}{ext}"


@router.post("/upload/initiate", response_model=file_schema.FileUploadInitiateResponseSchema)
async def initiate_file_upload(
    initiate_request: file_schema.FileUploadInitiateRequestSchema,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    if not s3_service.is_functional():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="S3 storage service not available.")

    # Basic validation for file size (can be enforced by client too, but good to double check)
    if initiate_request.file_type == FileType.IMAGE and initiate_request.size_bytes > settings.IMAGE_MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Image size exceeds limit of {settings.IMAGE_MAX_SIZE_MB}MB.")
    elif initiate_request.size_bytes > settings.FILE_MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File size exceeds limit of {settings.FILE_MAX_SIZE_MB}MB.")

    # Determine FileType if not explicitly provided or to override
    detected_file_type = initiate_request.file_type
    if not detected_file_type or detected_file_type == FileType.OTHER:
        mime_major = initiate_request.mime_type.split('/')[0]
        if mime_major == "image": detected_file_type = FileType.IMAGE
        elif mime_major == "video": detected_file_type = FileType.VIDEO
        elif mime_major == "audio": detected_file_type = FileType.AUDIO
        elif initiate_request.mime_type in ["application/pdf", "application/msword", "text/plain"]:
            detected_file_type = FileType.DOCUMENT
        # Add more specific detections if needed

    s3_object_key = generate_s3_key(current_user_id, initiate_request.original_filename, detected_file_type)

    presigned_upload_url = await s3_service.generate_presigned_upload_url(
        s3_key=s3_object_key,
        content_type=initiate_request.mime_type,
        expires_in=3600 # 1 hour for upload link
    )
    if not presigned_upload_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate S3 upload URL.")

    file_metadata_payload = {
        "user_id": current_user_id,
        "original_filename": initiate_request.original_filename,
        "generated_filename": os.path.basename(s3_object_key), # Store the final part of S3 key
        "file_type": detected_file_type,
        "mime_type": initiate_request.mime_type,
        "size_bytes": initiate_request.size_bytes,
        "status": FileStatus.UPLOADING,
        "storage_provider": "s3",
        "s3_bucket": settings.S3_BUCKET_NAME,
        "s3_key": s3_object_key,
        "family_tree_id": initiate_request.family_tree_id,
        "person_id": initiate_request.person_id,
        "title": initiate_request.title,
        "description": initiate_request.description,
        "tags": initiate_request.tags or [],
        "is_temporary": initiate_request.is_temporary,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=settings.TEMP_FILE_MAX_AGE_HOURS) if initiate_request.is_temporary else None,
    }

    created_meta = await file_metadata_crud.create_file_metadata(db, file_data=file_metadata_payload)
    if not created_meta or not created_meta.id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create file metadata record.")

    return file_schema.FileUploadInitiateResponseSchema(
        file_id=created_meta.id,
        upload_url=presigned_upload_url
    )

@router.post("/upload/complete/{file_id_str}", response_model=file_schema.FileMetadataResponseSchema)
async def complete_file_upload(
    file_id_str: str, # Using string from path, will convert to PyObjectId
    completion_data: file_schema.FileUploadCompleteRequestSchema,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta or meta.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File metadata not found or not authorized.")
    if meta.status != FileStatus.UPLOADING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File is not in UPLOADING state. Current state: {meta.status.value}")

    # Verify file exists in S3 (optional, but good check)
    s3_meta = await s3_service.get_file_metadata(meta.s3_key)
    if not s3_meta or s3_meta["size_bytes"] != meta.size_bytes : # Basic check
        logger.error(f"S3 verification failed for {meta.s3_key}. S3 meta: {s3_meta}, DB meta size: {meta.size_bytes}")
        await file_metadata_crud.update_file_metadata(db, file_id, {"status": FileStatus.ERROR, "description": "S3 verification failed after upload."})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found in S3 or size mismatch after upload.")

    update_payload: Dict[str, Any] = {"status": FileStatus.UPLOADED} # Ready for processing
    if completion_data.checksum_md5: update_payload["checksum_md5"] = completion_data.checksum_md5
    if completion_data.checksum_sha256: update_payload["checksum_sha256"] = completion_data.checksum_sha256
    if completion_data.s3_version_id: update_payload["s3_version_id"] = completion_data.s3_version_id

    # If it's an image, trigger thumbnail generation (can be async task)
    if meta.file_type == FileType.IMAGE:
        update_payload["status"] = FileStatus.PROCESSING # Mark for processing
        # In a real app, this processing would be a background task (e.g., Celery)
        # For now, doing it synchronously for simplicity after marking as UPLOADED.
        # This is not ideal for large images or many requests.
        try:
            logger.info(f"Starting image processing for {meta.s3_key}...")
            image_bytes_io = await s3_service.download_file_obj(meta.s3_key)
            if image_bytes_io:
                image_bytes = image_bytes_io.getvalue()
                img_meta_dict = await image_processor.get_image_metadata(image_bytes)
                if img_meta_dict:
                    update_payload["image_meta"] = ImageMetadata(**img_meta_dict)

                thumb_result = await image_processor.create_thumbnail(image_bytes, meta.original_filename)
                if thumb_result:
                    thumb_io, thumb_mime, thumb_ext = thumb_result
                    thumb_s3_key = f"{os.path.splitext(meta.s3_key)[0]}_thumb.{thumb_ext}"
                    thumb_uploaded = await s3_service.upload_file_obj(thumb_io, thumb_s3_key, content_type=thumb_mime)
                    if thumb_uploaded and "image_meta" in update_payload and update_payload["image_meta"]:
                        update_payload["image_meta"].has_thumbnail = True
                        update_payload["image_meta"].thumbnail_s3_key = thumb_s3_key
                    else:
                        logger.error(f"Failed to upload thumbnail for {meta.s3_key}")
                update_payload["status"] = FileStatus.AVAILABLE # Processing done
            else:
                logger.error(f"Could not download {meta.s3_key} for image processing.")
                update_payload["status"] = FileStatus.ERROR
                update_payload["description"] = "Failed to download for image processing."

        except Exception as e:
            logger.error(f"Error during image processing for {meta.s3_key}: {e}", exc_info=True)
            update_payload["status"] = FileStatus.ERROR
            update_payload["description"] = f"Image processing failed: {str(e)[:100]}"
    else: # Not an image, or no specific processing for now
        update_payload["status"] = FileStatus.AVAILABLE

    updated_meta = await file_metadata_crud.update_file_metadata(db, file_id, update_payload)
    if not updated_meta:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to finalize file metadata.")

    # Generate download URL for response
    download_url = await s3_service.generate_presigned_download_url(updated_meta.s3_key, filename=updated_meta.original_filename)
    response_schema = file_schema.FileMetadataResponseSchema.model_validate(updated_meta)
    response_schema.download_url = download_url
    return response_schema


@router.get("/{file_id_str}", response_model=file_schema.FileMetadataResponseSchema)
async def get_file_metadata(
    file_id_str: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta or meta.user_id != current_user_id: # Basic auth check
        # TODO: Check if file is public or shared with current_user_id
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or not authorized.")

    response_schema = file_schema.FileMetadataResponseSchema.model_validate(meta) # Pydantic v2
    # response_schema = file_schema.FileMetadataResponseSchema.from_orm(meta) # Pydantic v1

    if meta.s3_key and meta.status == FileStatus.AVAILABLE:
        download_url = await s3_service.generate_presigned_download_url(meta.s3_key, filename=meta.original_filename)
        response_schema.download_url = download_url

        # Also generate thumbnail URL if applicable
        if meta.image_meta and meta.image_meta.has_thumbnail and meta.image_meta.thumbnail_s3_key:
            # This part is tricky if thumbnail URL needs to be part of image_meta schema
            # For now, let's assume client constructs it or it's a separate endpoint
            pass

    return response_schema


@router.get("/{file_id_str}/download-url", response_model=file_schema.PresignedUrlResponseSchema)
async def get_file_download_url(
    file_id_str: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    # This is essentially same as part of get_file_metadata, but as a dedicated endpoint
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta or meta.user_id != current_user_id: # Basic auth
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or not authorized.")

    if meta.status != FileStatus.AVAILABLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File is not available for download (status: {meta.status.value}).")

    if not meta.s3_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File storage key not found.")

    download_url = await s3_service.generate_presigned_download_url(meta.s3_key, filename=meta.original_filename)
    if not download_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate download URL.")

    return file_schema.PresignedUrlResponseSchema(
        url=download_url,
        method="GET",
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.S3_PRESIGNED_URL_EXPIRY_SECONDS),
        file_id=meta.id
    )


@router.put("/{file_id_str}", response_model=file_schema.FileMetadataResponseSchema)
async def update_file_metadata_details(
    file_id_str: str,
    update_in: file_schema.FileUpdateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta or meta.user_id != current_user_id: # Basic auth
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or not authorized.")

    updated_meta = await file_metadata_crud.update_file_metadata(db, file_id, update_in)
    if not updated_meta:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update file metadata.")

    response_schema = file_schema.FileMetadataResponseSchema.model_validate(updated_meta)
    if updated_meta.s3_key and updated_meta.status == FileStatus.AVAILABLE:
        download_url = await s3_service.generate_presigned_download_url(updated_meta.s3_key, filename=updated_meta.original_filename)
        response_schema.download_url = download_url
    return response_schema


@router.delete("/{file_id_str}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file_and_metadata(
    file_id_str: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta or meta.user_id != current_user_id: # Basic auth
        # To make delete idempotent, could return 204 even if not found for this user.
        # For stricter, raise 404. Let's be strict for now.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or not authorized for deletion.")

    # Delete from S3
    if meta.s3_key and s3_service.is_functional():
        s3_deleted = await s3_service.delete_file(meta.s3_key)
        if not s3_deleted:
            logger.error(f"Failed to delete file from S3: {meta.s3_key}, but proceeding to delete metadata.")
            # Depending on policy, might raise error here or just log.
            # If S3 delete fails, keeping metadata might be desired for retry/audit.
            # For now, we proceed to delete metadata.

        # Delete thumbnail if it exists
        if meta.image_meta and meta.image_meta.has_thumbnail and meta.image_meta.thumbnail_s3_key:
            thumb_deleted = await s3_service.delete_file(meta.image_meta.thumbnail_s3_key)
            if not thumb_deleted:
                 logger.warning(f"Failed to delete thumbnail from S3: {meta.image_meta.thumbnail_s3_key}")

    # Delete metadata from DB
    db_deleted = await file_metadata_crud.delete_file_metadata(db, file_id=file_id)
    if not db_deleted:
        # This could happen if already deleted by another request between fetch and delete.
        # Or a more serious DB issue.
        logger.warning(f"Metadata for file ID {file_id} not found for DB deletion, or delete failed.")
        # If S3 was deleted but DB failed, this is an orphaned S3 object situation.

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/", response_model=PaginatedResponse[file_schema.FileMetadataResponseSchema])
async def list_my_files(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: uuid.UUID = CurrentUserUUID,
    family_tree_id: Optional[PyObjectId] = Query(None),
    person_id: Optional[PyObjectId] = Query(None),
    file_type: Optional[FileType] = Query(None),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    query_params = file_schema.FileListQuerySchema(
        user_id=current_user_id, # Filter by current user's files
        family_tree_id=family_tree_id,
        person_id=person_id,
        file_type=file_type,
        tag=tag,
        status=FileStatus.AVAILABLE # Typically list only available files
    )
    skip = (page - 1) * size
    files_meta = await file_metadata_crud.list_files_metadata(db, query_params=query_params, skip=skip, limit=size)
    total_files = await file_metadata_crud.count_files_metadata(db, query_params=query_params)

    # Augment with download URLs
    response_items = []
    for meta_doc in files_meta:
        response_item = file_schema.FileMetadataResponseSchema.model_validate(meta_doc)
        if meta_doc.s3_key and meta_doc.status == FileStatus.AVAILABLE:
            download_url = await s3_service.generate_presigned_download_url(meta_doc.s3_key, filename=meta_doc.original_filename)
            response_item.download_url = download_url
        response_items.append(response_item)

    return PaginatedResponse(items=response_items, total=total_files, page=page, size=size)

import os # for path.splitext in generate_s3_key, path.basename
from datetime import timedelta # for temporary file expiry
from fastapi import Response # For 204 status code return type. Already imported.
