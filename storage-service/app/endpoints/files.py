from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File as FastAPIFile,  # Alias to avoid conflict with Pydantic model name
    Form,
    Query,  # Import Query
    Response  # Import Response
)
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional # Added Dict, Any
import magic
import uuid
import structlog # Import structlog
import datetime # Import datetime

from app import crud, models, schemas
from app.database import get_database
from app.config import settings
from app.services.s3_service import S3Client
from app.services.image_processor_service import ImageProcessor
from app.dependencies import get_current_active_user, AuthenticatedUser # Import real dependency

logger = structlog.get_logger(__name__) # Changed to structlog


router = APIRouter()

# Removed MockUser and get_current_active_user_mock

@router.post("/upload", response_model=schemas.FileUploadListResponse, status_code=status.HTTP_201_CREATED)
async def upload_files(
    files: List[UploadFile] = FastAPIFile(...),
    family_tree_id: Optional[str] = Form(None),
    category: Optional[str] = Form("other"),
    privacy: Optional[str] = Form("private"),
    tags: Optional[str] = Form(None), # Comma-separated string
    description: Optional[str] = Form(None),
    generate_thumbnails: bool = Form(True),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Upload one or more files.
    Stores file in S3 and metadata in MongoDB.
    """
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files sent.")

    successful_uploads: List[schemas.FileUploadResponse] = []
    failed_uploads_count = 0
    # Optional: Store detailed errors per file if needed for the response
    # file_errors_details: List[Dict[str, Any]] = []

    for file_upload_obj in files:
        try:
            if file_upload_obj.size is None or file_upload_obj.size > settings.MAX_FILE_SIZE_BYTES:
                logger.warning(f"User {current_user.id} file skipped: {file_upload_obj.filename}, size: {file_upload_obj.size or 'unknown'}. Exceeds limit or size unknown.")
                failed_uploads_count += 1
                # file_errors_details.append({"filename": file_upload_obj.filename, "error": "File too large or size unknown"})
                continue

            contents = await file_upload_obj.read()

            actual_mime_type = file_upload_obj.content_type
            try:
                detected_mime = magic.from_buffer(contents, mime=True)
                if detected_mime and detected_mime != "application/octet-stream": # Prioritize detected if more specific
                    actual_mime_type = detected_mime
            except Exception as e:
                logger.warning(f"python-magic could not determine mime type for {file_upload_obj.filename}: {e}. Falling back to header provided mime type: {actual_mime_type}")

            file_uuid_name = f"{uuid.uuid4()}_{file_upload_obj.filename}"
            s3_object_name_parts = ["users", current_user.id]
            if family_tree_id:
                s3_object_name_parts.append(family_tree_id)
            else:
                s3_object_name_parts.append("general") # Or a default folder for files not tied to a tree
            s3_object_name_parts.append(file_uuid_name)
            s3_key = "/".join(s3_object_name_parts)

            s3_upload_metadata = {
                "original_filename": str(file_upload_obj.filename), # Ensure it's a string
                "uploader_user_id": current_user.id,
                "content_type": str(actual_mime_type), # Ensure it's a string
            }
            if description:
                 s3_upload_metadata["description"] = description
            if category: # category is already string or None
                s3_upload_metadata["category"] = category

            s3_result = await S3Client.upload_file(
                file_buffer=contents,
                object_name=s3_key,
                content_type=actual_mime_type, # Pass the determined MIME type
                metadata=s3_upload_metadata
            )

            thumbnails_list = []
            processed_image_metadata_dict = {}

            if actual_mime_type and actual_mime_type.startswith("image/") and generate_thumbnails: # Check actual_mime_type exists
                logger.info(f"Processing image for thumbnails: {file_upload_obj.filename}")
                processed_result = await ImageProcessor.process_image(
                    image_buffer=contents,
                    original_filename=str(file_upload_obj.filename) # Ensure filename is string
                )
                if processed_result:
                    processed_image_metadata_dict = processed_result["original_metadata"]
                    for thumb_data in processed_result["thumbnails"]:
                        # Construct unique S3 key for thumbnail
                        # users/<user_id>/thumbnails/<optional_tree_id>/<size_name>/<uuid_filename>
                        thumb_s3_key_parts = ["users", current_user.id, "thumbnails"]
                        if family_tree_id:
                            thumb_s3_key_parts.append(family_tree_id)
                        else:
                            thumb_s3_key_parts.append("general")
                        thumb_s3_key_parts.append(thumb_data['size_name']) # Add size_name to path
                        thumb_s3_key_parts.append(file_uuid_name)

                        final_thumb_s3_key = "/".join(thumb_s3_key_parts)

                        try:
                            thumb_s3_result = await S3Client.upload_file(
                                file_buffer=thumb_data['buffer'].getvalue(),
                                object_name=final_thumb_s3_key,
                                content_type=thumb_data['mime_type'],
                                metadata={
                                    "original_s3_key": s3_key,
                                    "thumbnail_size": thumb_data['size_name'],
                                    "uploader_user_id": current_user.id, # Good to have uploader ID here too
                                }
                            )
                            thumbnails_list.append(models.Thumbnail(
                                size_name=thumb_data['size_name'],
                                width=thumb_data['width'],
                                height=thumb_data['height'],
                                s3_key=thumb_s3_result["s3_key"],
                                url=thumb_s3_result["url"]
                            ))
                        except Exception as e_thumb_upload:
                            logger.error(f"Failed to upload thumbnail {thumb_data['size_name']} for {file_upload_obj.filename}: {e_thumb_upload}", exc_info=True)
                else:
                    logger.warning(f"Image processing failed for {file_upload_obj.filename}, no thumbnails generated.")

            # Combine S3 upload metadata with any metadata from image processing
            # The s3_upload_metadata contains form fields like description, category.
            # The processed_image_metadata_dict contains image-specifics like width, height, exif.
            # FileMetadata model will structure this.
            combined_metadata_for_db_model = {
                **s3_upload_metadata, # original_filename, uploader_user_id, content_type, description, category
                                      # These are more like top-level attributes or direct metadata
                **processed_image_metadata_dict # image_width, height, format, exif etc.
            }
            # Ensure field names match FileMetadata Pydantic model
            # e.g. s3_upload_metadata['original_filename'] vs FileMetadata.title if that was the mapping
            # For now, FileMetadata takes many of these directly or via "extra"

            file_metadata_for_db = models.FileMetadata(**combined_metadata_for_db_model)


            file_record_data = models.FileRecord(
                user_id=current_user.id,
                family_tree_id=family_tree_id,
                original_name=str(file_upload_obj.filename),
                filename=file_uuid_name,
                s3_key=s3_result["s3_key"],
                url=s3_result["url"],
                size_bytes=file_upload_obj.size,
                mime_type=str(actual_mime_type),
                category=str(category) if category else "other",
                privacy=str(privacy) if privacy else "private",
                description=description, # description is also in s3_upload_metadata, ensure consistency
                tags=tags.split(",") if tags else [],
                metadata=file_metadata_for_db, # Use the combined and structured metadata
                thumbnails=thumbnails_list,
            )

            created_record = await crud.create_file_record(db, file_data=file_record_data)

            response_data = schemas.FileUploadResponse(
                id=created_record.id,
                original_name=created_record.original_name,
                url=created_record.url,
                size_bytes=created_record.size_bytes,
                mime_type=created_record.mime_type,
                category=created_record.category,
                uploaded_at=created_record.uploaded_at,
                thumbnails=created_record.thumbnails
            )
            successful_uploads.append(response_data)

        except HTTPException as http_exc: # Re-raise HTTPExceptions from S3 or other services
            logger.error(f"HTTPException for file {file_upload_obj.filename}: {http_exc.detail}")
            failed_uploads_count += 1
            # file_errors_details.append({"filename": file_upload_obj.filename, "error": http_exc.detail, "status_code": http_exc.status_code})
            # If one file causes an HTTP error (like S3 issue), decide whether to continue or fail batch.
            # For now, we continue and report counts.
        except Exception as e:
            logger.error(f"Generic error processing file {file_upload_obj.filename}: {e}", exc_info=True)
            failed_uploads_count += 1
            # file_errors_details.append({"filename": file_upload_obj.filename, "error": "Internal server error during processing"})


    if not successful_uploads and failed_uploads_count > 0 and failed_uploads_count == len(files):
        # If all files failed.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All file uploads failed.")

    # If some files succeeded and some failed, it's a partial success, so HTTP 207 Multi-Status could be used,
    # or 201 Created with details in the body. FastAPI default is 200 OK for success if not specified.
    # We specified 201 for this route.

    return schemas.FileUploadListResponse(
        data=successful_uploads,
        total_success=len(successful_uploads),
        total_failed=failed_uploads_count,
        # errors=file_errors_details # If you want to include detailed errors
    )

# TODO: Add other endpoints:
# GET / : List files (with pagination, filtering, sorting)
@router.get("/", response_model=schemas.FileListResponse)
async def list_files(
    family_tree_id: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None, # Comma-separated string
    search: Optional[str] = None, # Search query
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("uploaded_at", enum=["uploaded_at", "original_name", "size_bytes"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    List files for the authenticated user, with filtering, pagination, and sorting.
    """
    # Ensure Query is imported if not already: from fastapi import Query
    parsed_tags = tags.split(',') if tags else None
    skip = (page - 1) * limit
    db_sort_order = 1 if sort_order == "asc" else -1

    file_records = await crud.get_file_records(
        db,
        user_id=current_user.id,
        family_tree_id=family_tree_id,
        category=category,
        tags=parsed_tags,
        search_query=search,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=db_sort_order
    )

    total_records = await crud.count_file_records(
        db,
        user_id=current_user.id,
        family_tree_id=family_tree_id,
        category=category,
        tags=parsed_tags,
        search_query=search
    )

    total_pages = (total_records + limit - 1) // limit if limit > 0 else 0 # Ceiling division

    return schemas.FileListResponse(
        data=file_records,
        page=page,
        limit=limit,
        total_records=total_records,
        total_pages=total_pages
    )

@router.get("/{file_id}", response_model=schemas.FileRecord)
async def get_file_details(
    file_id: uuid.UUID, # Path parameter, FastAPI will validate if it's a UUID
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get metadata for a specific file owned by the authenticated user.
    """
    file_record = await crud.get_file_record_by_id(db, file_id=file_id, user_id=current_user.id)
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied.")
    return file_record

@router.get("/{file_id}/download", response_model=schemas.FileDownloadLinkResponse)
async def get_file_download_link(
    file_id: uuid.UUID,
    thumbnail_size_name: Optional[str] = Query(None, description="Specify thumbnail size e.g., 'small', 'medium_150x150'"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a presigned S3 URL to download the file or a specific thumbnail.
    """
    file_record = await crud.get_file_record_by_id(db, file_id=file_id, user_id=current_user.id)
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied.")

    s3_key_to_download = file_record.s3_key
    download_filename = file_record.original_name

    if thumbnail_size_name:
        found_thumbnail = None
        for thumb in file_record.thumbnails:
            if thumb.size_name == thumbnail_size_name:
                found_thumbnail = thumb
                break
        if not found_thumbnail:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Thumbnail size '{thumbnail_size_name}' not found for this file.")
        s3_key_to_download = found_thumbnail.s3_key
        # Adjust filename for thumbnail download if desired, e.g.
        # download_filename = f"{thumbnail_size_name}_{file_record.original_name}"
        # For now, use original name for simplicity in Content-Disposition

    # Generate presigned URL with Content-Disposition for direct download with original name
    presigned_url_params = {
        'ResponseContentDisposition': f'attachment; filename="{download_filename}"'
    }

    download_url = await S3Client.get_presigned_url(
        object_name=s3_key_to_download,
        operation_name='get_object',
        params=presigned_url_params
        # expires_in is handled by S3Client using settings.S3_PRESIGNED_URL_EXPIRATION
    )

    if not download_url:
        logger.error(f"Failed to generate presigned URL for S3 key: {s3_key_to_download} for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate download link.")

    expires_at_datetime = datetime.datetime.utcnow() + datetime.timedelta(seconds=settings.S3_PRESIGNED_URL_EXPIRATION)

    return schemas.FileDownloadLinkResponse(
        download_url=download_url,
        expires_at=expires_at_datetime,
        filename=download_filename
    )

@router.put("/{file_id}", response_model=schemas.FileRecord)
async def update_file_metadata_endpoint( # Added "endpoint" to avoid conflict with any potential 'update_file_metadata' in crud
    file_id: uuid.UUID,
    file_update_payload: schemas.FileUpdateSchema,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Update metadata for a specific file owned by the authenticated user.
    """
    # Ensure at least one field is being updated
    if not file_update_payload.model_dump(exclude_unset=True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    updated_file_record = await crud.update_file_record(
        db,
        file_id=file_id,
        user_id=current_user.id,
        update_data=file_update_payload
    )

    if not updated_file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied.")

    return updated_file_record

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file_endpoint( # Added "endpoint" to avoid conflict
    file_id: uuid.UUID,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Soft delete a specific file owned by the authenticated user.
    Marks the file record as deleted and sets deleted_at timestamp.
    Actual S3 object deletion is handled by a scheduled cleanup task.
    Returns 204 No Content on success (including if already soft-deleted).
    Returns 404 Not Found if the file does not exist or is not owned by the user.
    """
    was_modified = await crud.soft_delete_file_record(db, file_id=file_id, user_id=current_user.id)

    if was_modified:
        logger.info(f"File record {file_id} successfully soft-deleted by user {current_user.id}.")
    else:
        # If not modified, check if it exists (and is owned by user) to determine if it was already soft-deleted or never existed.
        # crud.check_file_exists looks for the file, ignoring its is_deleted status.
        exists = await crud.check_file_exists(db, file_id=file_id, user_id=current_user.id)
        if exists:
            logger.info(f"File record {file_id} was already soft-deleted for user {current_user.id}. Operation is idempotent.")
        else:
            logger.warning(f"Attempt to soft-delete non-existent or non-owned file ID: {file_id} by user {current_user.id}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or access denied.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Internal association endpoints for events/persons.

# For these internal endpoints, we might use a different auth mechanism, like an API key,
# or trust internal network calls. For now, using the same mock user for simplicity.
# In a real scenario, `get_internal_service_principal` or similar would be used.

class EventAssociationRequest(schemas.BaseModel): # Using schemas.BaseModel from auth service (needs import) or define BaseModel here
    event_id: str

class PersonAssociationRequest(schemas.BaseModel):
    person_id: str


@router.put("/{file_id}/associate-event", response_model=schemas.FileRecord, tags=["Internal File Association"])
async def associate_event_to_file_endpoint(
    file_id: uuid.UUID,
    association_request: EventAssociationRequest, # Request body with event_id
    db: AsyncIOMotorDatabase = Depends(get_database),
    # current_service: ServicePrincipal = Depends(get_internal_service_principal) # Example service auth
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Associate an event with a file. (Usually for internal service calls)
    """
    updated_file = await crud.associate_event_with_file(db, file_id=file_id, event_id=association_request.event_id)
    if not updated_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    return updated_file

@router.put("/{file_id}/disassociate-event", response_model=schemas.FileRecord, tags=["Internal File Association"])
async def disassociate_event_from_file_endpoint(
    file_id: uuid.UUID,
    association_request: EventAssociationRequest, # Request body with event_id
    db: AsyncIOMotorDatabase = Depends(get_database),
    # current_service: ServicePrincipal = Depends(get_internal_service_principal)
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Disassociate an event from a file. (Usually for internal service calls)
    """
    updated_file = await crud.disassociate_event_from_file(db, file_id=file_id, event_id=association_request.event_id)
    if not updated_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or event not associated.")
    return updated_file

@router.put("/{file_id}/associate-person", response_model=schemas.FileRecord, tags=["Internal File Association"])
async def associate_person_to_file_endpoint(
    file_id: uuid.UUID,
    association_request: PersonAssociationRequest, # Request body with person_id
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Associate a person with a file. (Usually for internal service calls)
    """
    updated_file = await crud.associate_person_with_file(db, file_id=file_id, person_id=association_request.person_id)
    if not updated_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    return updated_file

@router.put("/{file_id}/disassociate-person", response_model=schemas.FileRecord, tags=["Internal File Association"])
async def disassociate_person_from_file_endpoint(
    file_id: uuid.UUID,
    association_request: PersonAssociationRequest, # Request body with person_id
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Disassociate a person from a file. (Usually for internal service calls)
    """
    updated_file = await crud.disassociate_person_from_file(db, file_id=file_id, person_id=association_request.person_id)
    if not updated_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or person not associated.")
    return updated_file
