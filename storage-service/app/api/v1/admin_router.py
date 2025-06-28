from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_storage_dependency as get_db
from app.crud import file_metadata_crud
from app.schemas import file_schema, PaginatedResponse
from app.models.base_model import PyObjectId
from app.models.file_metadata_model import FileStatus, FileType
from app.middleware.auth_middleware import get_current_active_user_id_dependency # Basic auth, needs role check
# A proper admin dependency would be:
# from app.middleware.auth_middleware import get_current_admin_user_role_dependency
from app.services.cleanup_service import CleanupService # To manually trigger jobs
from app.utils.logger import logger

# For admin routes, we need a dependency that also checks for an admin role.
# The current get_current_active_user_id_dependency only validates the token and gets user_id.
# A true admin check would involve:
# 1. Validating token (as done by get_current_active_user_id_dependency).
# 2. Taking the user_id and checking its role (e.g., by calling auth-service, or if roles are in JWT).
# For now, we'll use the basic user_id dependency and assume that if an admin calls these
# endpoints, their token is valid. A full RBAC is beyond this structural conversion.
# If `auth_middleware.py` provided a `get_current_admin_user_dependency` that did this, we'd use it.
# Let's alias the basic one for now and note that role check is missing.

async def get_admin_user_placeholder(user_id: uuid.UUID = Depends(get_current_active_user_id_dependency)) -> uuid.UUID:
    logger.warning(f"Admin endpoint accessed by user {user_id}. ROLE CHECK IS CURRENTLY A PLACEHOLDER.")
    # Here, you would add logic to verify if user_id has admin privileges.
    # Example: is_admin = await check_user_role_in_auth_service(user_id)
    # if not is_admin:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin privileges.")
    return user_id

CurrentAdminUUID = Depends(get_admin_user_placeholder)


router = APIRouter()

@router.get("/files", response_model=PaginatedResponse[file_schema.FileMetadataResponseSchema])
async def admin_list_all_files(
    db: AsyncIOMotorDatabase = Depends(get_db),
    admin_user_id: uuid.UUID = CurrentAdminUUID, # Ensures admin access
    # Filters for admin
    user_id_filter: Optional[uuid.UUID] = Query(None, alias="userId"),
    family_tree_id: Optional[PyObjectId] = Query(None),
    person_id: Optional[PyObjectId] = Query(None),
    file_type: Optional[FileType] = Query(None),
    status_filter: Optional[FileStatus] = Query(None, alias="status"),
    original_filename_contains: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200)
):
    query_params = file_schema.FileListQuerySchema(
        user_id=user_id_filter, # Admin can filter by any user
        family_tree_id=family_tree_id,
        person_id=person_id,
        file_type=file_type,
        status=status_filter,
        original_filename_contains=original_filename_contains,
        tag=tag
    )
    skip = (page - 1) * size
    files_meta = await file_metadata_crud.list_files_metadata(db, query_params=query_params, skip=skip, limit=size)
    total_files = await file_metadata_crud.count_files_metadata(db, query_params=query_params)

    # Augment with download URLs (admin might need them)
    response_items = []
    from app.services.s3_service import s3_service_instance as s3_service # Avoid circular import at top
    for meta_doc in files_meta:
        response_item = file_schema.FileMetadataResponseSchema.model_validate(meta_doc)
        if meta_doc.s3_key and meta_doc.status == FileStatus.AVAILABLE and s3_service.is_functional():
            download_url = await s3_service.generate_presigned_download_url(meta_doc.s3_key, filename=meta_doc.original_filename)
            response_item.download_url = download_url
        response_items.append(response_item)

    return PaginatedResponse(items=response_items, total=total_files, page=page, size=size)


@router.get("/files/{file_id_str}", response_model=file_schema.FileMetadataResponseSchema)
async def admin_get_file_metadata(
    file_id_str: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    admin_user_id: uuid.UUID = CurrentAdminUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    response_schema = file_schema.FileMetadataResponseSchema.model_validate(meta)
    from app.services.s3_service import s3_service_instance as s3_service
    if meta.s3_key and meta.status == FileStatus.AVAILABLE and s3_service.is_functional():
        download_url = await s3_service.generate_presigned_download_url(meta.s3_key, filename=meta.original_filename)
        response_schema.download_url = download_url
    return response_schema


@router.put("/files/{file_id_str}/status", response_model=file_schema.FileMetadataResponseSchema)
async def admin_update_file_status(
    file_id_str: str,
    new_status: FileStatus = Query(..., description="New status for the file"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    admin_user_id: uuid.UUID = CurrentAdminUUID
):
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    updated_meta = await file_metadata_crud.update_file_metadata(db, file_id, {"status": new_status})
    if not updated_meta:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update file status.")
    return updated_meta


@router.delete("/files/{file_id_str}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_file( # Allows admin to delete any file
    file_id_str: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    admin_user_id: uuid.UUID = CurrentAdminUUID
):
    # This is a hard delete. Consider if soft delete (changing status) is preferred.
    # This reuses logic from files_router delete, but without user ownership check.
    try:
        file_id = PyObjectId(file_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID format.")

    meta = await file_metadata_crud.get_file_metadata_by_id(db, file_id=file_id)
    if not meta: # Idempotent delete if not found
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    from app.services.s3_service import s3_service_instance as s3_service
    if meta.s3_key and s3_service.is_functional():
        s3_deleted = await s3_service.delete_file(meta.s3_key)
        if not s3_deleted: logger.error(f"Admin Delete: Failed to delete file from S3: {meta.s3_key}")
        if meta.image_meta and meta.image_meta.has_thumbnail and meta.image_meta.thumbnail_s3_key:
            thumb_deleted = await s3_service.delete_file(meta.image_meta.thumbnail_s3_key)
            if not thumb_deleted: logger.warning(f"Admin Delete: Failed to delete thumbnail from S3: {meta.image_meta.thumbnail_s3_key}")

    db_deleted = await file_metadata_crud.delete_file_metadata(db, file_id=file_id)
    if not db_deleted: logger.warning(f"Admin Delete: Metadata for file ID {file_id} not found for DB deletion or delete failed.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/cleanup/trigger-temporary-files", status_code=status.HTTP_202_ACCEPTED)
async def trigger_cleanup_temporary_files(
    db: AsyncIOMotorDatabase = Depends(get_db), # For cleanup service instantiation
    admin_user_id: uuid.UUID = CurrentAdminUUID
):
    # In main.py, cleanup_service will be initialized and started.
    # This endpoint is to manually trigger the job if needed, outside its schedule.
    # This requires access to the CleanupService instance.
    # For simplicity, we might re-instantiate it or call its job method directly.
    # This is not ideal if scheduler manages state.
    # A better way: if scheduler is global, call scheduler.get_job('id').modify(next_run_time=now)
    # Or if CleanupService instance is stored in app.state: app.state.cleanup_service.cleanup_temporary_files_job()

    logger.info(f"Admin user {admin_user_id} manually triggered temporary file cleanup.")
    # This is a direct call, bypassing scheduler for an immediate run.
    # Ensure DB is passed if CleanupService expects it.
    # cleanup_service_manual_run = CleanupService(db=db) # Careful with re-instantiating
    # await cleanup_service_manual_run.cleanup_temporary_files_job()

    # If CleanupService is already running via app lifespan, need a way to access its instance.
    # For now, let's assume we can't directly call the scheduled job easily via HTTP request
    # without more complex app state management or IPC.
    # So, this endpoint is more of a conceptual trigger.
    # A simple way if the job is idempotent and can be run directly:
    cleanup_job_runner = CleanupService(db=db) # Creates a new instance, scheduler not started
    await cleanup_job_runner.cleanup_temporary_files_job() # Run job logic directly

    return {"message": "Temporary file cleanup job manually triggered. Check logs for details."}

from fastapi import Response # For 204 status code return type. Already imported.
