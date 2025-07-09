from datetime import datetime, timedelta
import structlog  # Changed from logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # For async scheduling
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.services.s3_service import S3Client  # For S3 operations
from app import crud, models  # For soft-deleted records/model validation
from app.database import AsyncIOMotorDatabase  # For type hinting
from fastapi import HTTPException


logger = structlog.get_logger(__name__)


class CleanupServiceClass:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._initialized = False

    async def initialize(self):
        if self._initialized:
            logger.info("CleanupService already initialized.")
            return

        logger.info("Initializing CleanupService...")
        if settings.CLEANUP_SCHEDULE_CRON:
            try:
                self.scheduler.add_job(
                    self.run_cleanup_tasks,
                    trigger=CronTrigger.from_crontab(
                        settings.CLEANUP_SCHEDULE_CRON
                    ),
                    id="daily_cleanup_job",
                    name="Daily S3 and DB Cleanup",
                    replace_existing=True,
                )
                self.scheduler.start()
                logger.info(
                    f"Cleanup job scheduled with cron: {settings.CLEANUP_SCHEDULE_CRON}"
                )
                self._initialized = True
            except Exception as e:
                logger.error(
                    f"Failed to schedule cleanup job: {e}", exc_info=True
                )
        else:
            logger.warning(
                "CLEANUP_SCHEDULE_CRON not defined. Cleanup job not scheduled."
            )
            # Mark as initialized even if not scheduled to prevent re-attempts if cron is simply not set
            self._initialized = True

    async def run_cleanup_tasks(self):
        logger.info("Starting scheduled cleanup tasks...")

        # For this task, we need a database session.
        # How get_database() is designed for background tasks matters.
        # If it yields a session, we need to handle that context.
        # For a simple script, we might create a new client/session.
        # Let's assume get_database() provides a usable db instance for Motor.

        db = None
        try:
            # This is tricky as get_database is a FastAPI dependency.
            # For background tasks, we might need a direct way to get a db session.
            # Let's simulate getting a db instance if possible, or this part needs refactoring
            # for how background tasks access the DB with Motor.

            # Simplification: Assume we can get a DB instance here.
            # In a real app, `connect_to_mongo` might make DataStorage.db available globally,
            # or we pass the app's db instance if scheduler is part of app.
            from app.database import DataStorage # Accessing the global DB storage
            if DataStorage.db is None:
                logger.error("Cleanup task: Database is not available.")
                # Potentially try to connect here if appropriate for a standalone task
                # from app.database import connect_to_mongo
                # await connect_to_mongo() # This would re-initialize if not careful
                # if DataStorage.db is None: return
                return
            db = DataStorage.db

            # Task 1: Clean up S3 files for soft-deleted records older than retention period
            await self._cleanup_soft_deleted_s3_files(db)

            # Task 2: Clean up very old temporary files from S3 (if any specific prefix is used)
            # await self._cleanup_old_temp_s3_uploads()

            # Task 3: Clean up orphaned FileRecords in DB (records pointing to non-existent S3 files)
            # This is more complex: list S3, compare with DB. Or rely on S3 events. Skipped for now.

            logger.info("Cleanup tasks completed.")
        except Exception as e:
            logger.error(f"Error during cleanup tasks: {e}", exc_info=True)
        finally:
            # If db session was managed here, close it. Motor client is usually managed globally.
            pass

    async def _cleanup_soft_deleted_s3_files(self, db: AsyncIOMotorDatabase):
        """
        Finds FileRecords in MongoDB that are soft-deleted and older than a retention period,
        then deletes their corresponding files from S3 and finally hard-deletes the DB record.
        """
        # Default retention: 30 days. Configurable if needed.
        retention_days = getattr(settings, 'SOFT_DELETE_RETENTION_DAYS', 30)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        logger.info(f"Cleaning up S3 files for soft-deleted records older than {cutoff_date.isoformat()} (retention: {retention_days} days).")

        # Find soft-deleted records older than the cutoff
        # This requires FileRecord to have `is_deleted: True` and `deleted_at` fields.
        # The `crud.get_soft_deleted_files_for_cleanup` would implement this query.

        # For now, let's assume a direct query:
        collection = db[crud.FILES_COLLECTION]
        soft_deleted_files_cursor = collection.find({
            "is_deleted": True,
            "deleted_at": {"$lt": cutoff_date}
        })

        count_processed = 0
        count_s3_deleted = 0
        count_db_hard_deleted = 0

        async for file_doc_dict in soft_deleted_files_cursor:
            file_record = models.FileRecord(**file_doc_dict) # Validate with Pydantic
            count_processed += 1
            logger.info(f"Processing soft-deleted file for S3 cleanup: ID {file_record.id}, S3 Key {file_record.s3_key}")

            try:
                # Delete main S3 object
                await S3Client.delete_file(file_record.s3_key)
                logger.info(f"Successfully deleted main S3 object: {file_record.s3_key}")

                # Delete thumbnails from S3
                for thumb in file_record.thumbnails:
                    try:
                        await S3Client.delete_file(thumb.s3_key)
                        logger.info(f"Successfully deleted S3 thumbnail: {thumb.s3_key}")
                    except Exception as e_thumb:
                        logger.error(f"Failed to delete S3 thumbnail {thumb.s3_key} for file ID {file_record.id}: {e_thumb}", exc_info=True)
                        # Continue even if a thumbnail fails to delete, but log it.

                # After successful S3 deletion (main file at least), hard-delete from DB
                # Using user_id="system_cleanup" or similar if hard_delete_file_record requires it.
                # For now, assuming hard_delete_file_record can be called without user_id if it's an admin/system task.
                # Or, adapt hard_delete_file_record to accept an optional system flag.
                # Let's assume a direct delete by ID for system cleanup.
                delete_result = await collection.delete_one({"_id": file_record.id})
                if delete_result.deleted_count > 0:
                    logger.info(f"Successfully hard-deleted DB record for file ID: {file_record.id}")
                    count_db_hard_deleted +=1
                else:
                    logger.warning(f"DB record for file ID {file_record.id} not found for hard deletion, or already deleted.")

                count_s3_deleted +=1 # Count if main S3 object deletion was attempted (success logged above)

            except HTTPException as http_exc: # From S3Client if it raises HTTPException
                 logger.error(f"HTTPException during S3 cleanup for file ID {file_record.id}, S3 key {file_record.s3_key}: {http_exc.detail}", exc_info=True)
            except Exception as e:
                logger.error(f"General error during S3 cleanup for file ID {file_record.id}, S3 key {file_record.s3_key}: {e}", exc_info=True)

        logger.info(f"Soft-deleted S3 files cleanup finished. Processed: {count_processed}, S3 Objects Attempted Delete: {count_s3_deleted}, DB Records Hard-Deleted: {count_db_hard_deleted}.")

    async def shutdown(self):
        if self.scheduler.running:
            logger.info("Shutting down CleanupService scheduler.")
            self.scheduler.shutdown(wait=False) # wait=False for async, or handle await if needed.
            self._initialized = False


CleanupService = CleanupServiceClass()

# Functions to be called from main.py startup/shutdown
async def startup_cleanup_service():
    await CleanupService.initialize()

async def shutdown_cleanup_service():
    await CleanupService.shutdown()
