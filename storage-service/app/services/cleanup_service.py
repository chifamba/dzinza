from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.utils.logger import logger
from app.crud import file_metadata_crud
# from app.services.s3_service import S3Service # Assuming s3_service_instance is available globally or passed
from app.services import s3_service_instance # Use the instantiated service

class CleanupService:
    def __init__(self, db: AsyncIOMotorDatabase): # Pass DB dependency
        self.db = db
        self.s3_service = s3_service_instance # Use the global instance for now
        self.scheduler = AsyncIOScheduler(timezone="UTC")
        self._add_jobs()

    def _add_jobs(self):
        try:
            # Schedule cleanup of temporary files
            self.scheduler.add_job(
                self.cleanup_temporary_files_job,
                trigger=CronTrigger.from_crontab(settings.CLEANUP_SCHEDULE_CRON),
                id="cleanup_temporary_files",
                name="Cleanup Temporary Uploaded Files",
                replace_existing=True,
            )
            logger.info(f"Scheduled temporary file cleanup job with cron: {settings.CLEANUP_SCHEDULE_CRON}")

            # Add other cleanup jobs here if needed
            # e.g., cleanup_orphaned_s3_objects_job, cleanup_old_file_versions_job

        except Exception as e:
            logger.error(f"Error scheduling cleanup jobs: {e}", exc_info=True)

    async def cleanup_temporary_files_job(self):
        logger.info("Running scheduled job: cleanup_temporary_files_job")

        if not self.s3_service.is_functional() and settings.S3_ACCESS_KEY_ID: # Only if S3 was intended to be used
            logger.warning("S3Service is not functional, skipping S3 cleanup part of temporary files job.")
            # Still might proceed with DB cleanup if that's separate

        max_age = timedelta(hours=settings.TEMP_FILE_MAX_AGE_HOURS)
        cutoff_datetime = datetime.now(timezone.utc) - max_age

        logger.info(f"Looking for temporary files older than {cutoff_datetime.isoformat()}...")

        try:
            temp_files_to_delete = await file_metadata_crud.get_temporary_files_for_cleanup(self.db, cutoff_datetime)

            if not temp_files_to_delete:
                logger.info("No old temporary files found for cleanup.")
                return

            logger.info(f"Found {len(temp_files_to_delete)} temporary file(s) to cleanup.")

            deleted_s3_count = 0
            deleted_db_count = 0

            for file_meta in temp_files_to_delete:
                logger.info(f"Processing temporary file for deletion: ID={file_meta.id}, S3_Key={file_meta.s3_key or 'N/A'}")

                # 1. Delete from S3 if s3_key exists and S3 is functional
                if file_meta.s3_key and self.s3_service.is_functional():
                    s3_deleted = await self.s3_service.delete_file(file_meta.s3_key)
                    if s3_deleted:
                        logger.info(f"Successfully deleted temporary file from S3: {file_meta.s3_key}")
                        deleted_s3_count += 1
                    else:
                        logger.error(f"Failed to delete temporary file from S3: {file_meta.s3_key}. Will not delete DB record yet.")
                        continue # Skip DB deletion if S3 deletion failed, to retry later or investigate

                # 2. Delete metadata from DB
                # Only delete DB record if S3 deletion was successful or not applicable (no s3_key)
                if (file_meta.s3_key and s3_deleted) or not file_meta.s3_key:
                    db_deleted = await file_metadata_crud.delete_file_metadata(self.db, file_id=file_meta.id)
                    if db_deleted:
                        logger.info(f"Successfully deleted temporary file metadata from DB: ID={file_meta.id}")
                        deleted_db_count += 1
                    else:
                        logger.error(f"Failed to delete temporary file metadata from DB: ID={file_meta.id}")

            logger.info(f"Temporary file cleanup finished. S3 files deleted: {deleted_s3_count}. DB records deleted: {deleted_db_count}.")

        except Exception as e:
            logger.error(f"Error during cleanup_temporary_files_job: {e}", exc_info=True)


    # --- Other potential cleanup jobs ---
    # async def cleanup_orphaned_s3_objects_job(self):
    #     """
    #     Scans S3 bucket and compares against DB metadata to find orphaned S3 objects.
    #     This is a more complex and potentially costly operation.
    #     """
    #     logger.info("Running scheduled job: cleanup_orphaned_s3_objects_job (Placeholder)")
    #     # 1. List all objects in S3 bucket (or a specific prefix).
    #     # 2. For each S3 object, check if a corresponding FileMetadataModel exists in DB.
    #     # 3. If no DB record, the S3 object is orphaned and can be deleted.
    #     # Be very careful with this to avoid accidental data loss.

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("CleanupService scheduler started.")
        else:
            logger.info("CleanupService scheduler already running.")

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False) # wait=False for async, or True if you need to ensure jobs complete
            logger.info("CleanupService scheduler shut down.")

# Global instance (or manage its lifecycle in main.py lifespan)
# cleanup_service: Optional[CleanupService] = None

# def initialize_cleanup_service(db: AsyncIOMotorDatabase):
#     global cleanup_service
#     if cleanup_service is None:
#         cleanup_service = CleanupService(db=db)
#         cleanup_service.start()
#     return cleanup_service

# def shutdown_cleanup_service():
#     global cleanup_service
#     if cleanup_service:
#         cleanup_service.shutdown()
#         cleanup_service = None
