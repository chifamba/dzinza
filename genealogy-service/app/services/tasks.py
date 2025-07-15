import uuid
from celery.utils.log import get_task_logger # Celery's own logger
from motor.motor_asyncio import AsyncIOMotorDatabase # For direct DB access in task
import asyncio # For running async CRUD operations from sync Celery task

from app.services.celery_app import celery_app
from app.models_main import Person, PersonName
from app.schemas.merge_suggestion import MergeSuggestionCreate
from app.core.config import settings # For DB connection details
from app.db.base import PERSONS_COLLECTION, MERGE_SUGGESTIONS_COLLECTION  # Add collection constants
# Note: Directly using CRUD functions from within Celery tasks can be tricky if they depend on FastAPI's
# request scope or specific dependency injection patterns not available in a Celery worker context.
# For this reason, tasks often re-establish their own DB connections or use a shared, globally accessible DB client.

# Let's assume we can get a DB instance for the task.
# A more robust way is to initialize DB client when worker starts, or pass connection details.
# For now, we'll try to create a new client instance per task or use a simplified get_db.

# Celery's logger
logger = get_task_logger(__name__)

# --- Duplicate Detection Logic (Simplified) ---
def calculate_name_similarity(name1_obj: PersonName, name2_obj: PersonName) -> float:
    """Calculates a simple name similarity score (0.0 to 1.0)."""
    score = 0.0
    max_score = 0.0

    # Given Name
    if name1_obj.given_name and name2_obj.given_name:
        max_score += 1.0
        if name1_obj.given_name.lower() == name2_obj.given_name.lower():
            score += 1.0
        # Could add Levenshtein distance for partial matches
    elif name1_obj.given_name or name2_obj.given_name: # One has it, other doesn't
        max_score += 1.0 # Still counts towards max possible score

    # Surname
    if name1_obj.surname and name2_obj.surname:
        max_score += 1.0
        if name1_obj.surname.lower() == name2_obj.surname.lower():
            score += 1.0
    elif name1_obj.surname or name2_obj.surname:
        max_score += 1.0

    # Nickname (optional, less weight)
    if name1_obj.nickname and name2_obj.nickname:
        max_score += 0.5
        if name1_obj.nickname.lower() == name2_obj.nickname.lower():
            score += 0.5
    elif name1_obj.nickname or name2_obj.nickname:
        max_score += 0.5

    return score / max_score if max_score > 0 else 0.0


async def _async_find_duplicate_persons(db: AsyncIOMotorDatabase, target_person: Person):
    """The async part of the duplicate finding logic."""
    from app.crud import crud_person, crud_merge_suggestion # Import CRUD here to avoid circular deps at module level

    logger.info(f"Task: Starting duplicate check for person ID: {target_person.id}")

    # Simplified search: Look for persons with similar names in the same trees
    # A more advanced search might look globally or use more sophisticated matching.

    potential_duplicates_found = []

    for tree_id in target_person.tree_ids:
        # Query persons in the same tree (excluding the target person itself)
        # This is a very broad query; a real system would use more targeted queries.
        # For example, query by surname first, then filter.

        # Using a simplified name query (could be part of crud_person)
        persons_in_tree_cursor = db[crud_person.PERSONS_COLLECTION].find({
            "tree_ids": tree_id,
            "_id": {"$ne": target_person.id}, # Exclude self
            # Basic name matching (surname is often a good first filter)
            "primary_name.surname": target_person.primary_name.surname
        })

        async for p_doc in persons_in_tree_cursor:
            candidate_person = Person(**p_doc)

            name_similarity = calculate_name_similarity(target_person.primary_name, candidate_person.primary_name)

            # Date similarity (very basic)
            date_similarity = 0.0
            if target_person.birth_date_exact and candidate_person.birth_date_exact:
                if target_person.birth_date_exact == candidate_person.birth_date_exact:
                    date_similarity += 0.5
            # Could add more for death dates, approximate date string matching, place matching etc.

            # Combine scores (weights can be adjusted)
            combined_score = (name_similarity * 0.7) + (date_similarity * 0.3)

            logger.debug(f"Comparing {target_person.id} with {candidate_person.id}: NameSim={name_similarity:.2f}, DateSim={date_similarity:.2f}, Combined={combined_score:.2f}, Threshold={settings.DUPLICATE_DETECTION_THRESHOLD}")

            if combined_score >= settings.DUPLICATE_DETECTION_THRESHOLD:
                # Ensure consistent ordering for new_person_id and existing_person_id to avoid duplicate suggestions (A-B vs B-A)
                # For example, always put the smaller UUID as new_person_id
                p1_id_str, p2_id_str = sorted([str(target_person.id), str(candidate_person.id)])

                suggestion_data = MergeSuggestionCreate(
                    new_person_id=uuid.UUID(p1_id_str),
                    existing_person_id=uuid.UUID(p2_id_str),
                    confidence=combined_score
                )
                try:
                    # Pass db instance to CRUD function
                    await crud_merge_suggestion.create_merge_suggestion(
                        db, suggestion_in=suggestion_data, created_by_system=True
                    )
                    potential_duplicates_found.append(candidate_person.id)
                    logger.info(f"Created merge suggestion between {target_person.id} and {candidate_person.id} with confidence {combined_score:.2f}")
                except ValueError as ve: # Catch if suggestion already exists
                     logger.info(f"Merge suggestion between {target_person.id} and {candidate_person.id} likely already exists: {ve}")
                except Exception as e:
                    logger.error(f"Failed to create merge suggestion for {target_person.id} and {candidate_person.id}: {e}", exc_info=True)

    logger.info(f"Duplicate check for person {target_person.id} completed. Found {len(potential_duplicates_found)} potential duplicates.")
    return len(potential_duplicates_found)


# --- Celery Task Definition ---
@celery_app.task(
    name="app.services.tasks.find_duplicate_persons_task", 
    bind=True, 
    max_retries=3, 
    default_retry_delay=60,
    task_time_limit=300,  # 5 minutes hard timeout
    task_soft_time_limit=240  # 4 minutes soft timeout
)
def find_duplicate_persons_task(self, person_id_str: str): # `self` is the task instance when bind=True
    """
    Celery task to find and suggest merges for duplicate persons.
    person_id_str: The string representation of the Person's UUID.
    Includes timeout handling to prevent hanging tasks.
    """
    logger.info(f"Received task: find_duplicate_persons_task for person_id: {person_id_str}")

    person_id = uuid.UUID(person_id_str)

    # This task needs to run async database operations.
    # Celery tasks are typically synchronous. To call async code from a sync Celery task,
    # you need to run an event loop.

    # Option 1: asyncio.run (simple for single async call chain)
    # Option 2: If worker is gevent/eventlet based, they might handle async code differently or provide utilities.
    # For now, using asyncio.run.

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Access db instance from celery_app_state (initialized by worker_process_init)
    # Ensure celery_app_state is imported or celery_app is accessible
    from app.services.celery_app import celery_app_state
    db_instance = celery_app_state.db

    if db_instance is None:
        logger.error("Task: Database instance not available in celery_app_state. Worker init might have failed.")
        # Optionally retry if it's a transient issue, but likely a config/startup problem.
        # For now, failing the task.
        # self.retry(exc=RuntimeError("DB not initialized for Celery worker"), countdown=60)
        return "Task failed: DB not initialized for worker."

    try:
        # Add timeout handling to the async operations
        async def run_with_timeout():
            # Fetch the target person
            target_person_doc = await asyncio.wait_for(
                db_instance[PERSONS_COLLECTION].find_one({"_id": person_id}),
                timeout=30  # 30 second timeout for single DB operation
            )

            if not target_person_doc:
                logger.warning(f"Task: Person with ID {person_id} not found. Cannot perform duplicate check.")
                return f"Person {person_id} not found."

            target_person = Person(**target_person_doc)

            # Run duplicate detection with timeout
            num_suggestions_processed = await asyncio.wait_for(
                _async_duplicate_detection_logic(db_instance, target_person),
                timeout=200  # 200 second timeout for duplicate detection logic
            )
            return f"Duplicate check for {person_id} processed {num_suggestions_processed} suggestions."

        # Run the async operations with overall timeout
        result = loop.run_until_complete(run_with_timeout())
        return result

    except asyncio.TimeoutError:
        logger.error(f"Task timeout: find_duplicate_persons_task for {person_id} exceeded timeout limits")
        return f"Task timed out for {person_id}"
    except Exception as e:
        logger.error(f"Task Error: find_duplicate_persons_task for {person_id} failed: {e}", exc_info=True)
        try:
            logger.info(f"Retrying task, attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=e, countdown=int(self.default_retry_delay * (2 ** self.request.retries)))
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for task on person_id {person_id}.")
            return f"Task failed permanently for {person_id} after max retries."
        except Exception as retry_exc:
            logger.error(f"Failed to retry task for person_id {person_id}: {retry_exc}")
            return f"Task failed for {person_id}, retry mechanism failed."
    finally:
        # The DB client is managed by worker signals now, no need to close it here per task.
        loop.close()
        logger.info(f"Celery Task: Finished find_duplicate_persons_task for person_id: {person_id_str}")

# To trigger this task from your FastAPI app (e.g., after creating/updating a person):
# from app.services.tasks import find_duplicate_persons_task
# find_duplicate_persons_task.delay(str(person.id)) # .delay() is a shortcut for .send_task()

# Note: The following block was mistakenly left as a docstring or comment, but without a comment symbol it causes a SyntaxError.
# The way `_db_client` and `_db` are defined as globals in `tasks.py` means they would be shared across all tasks executed by a single Celery worker process if not handled carefully.
# The `_close_task_db()` call in the `finally` block of the task is intended to clean up, but if multiple tasks run concurrently within the same worker process and event loop, this global state could be problematic.
#
# A better pattern for managing resources like DB connections in Celery tasks, especially with `asyncio`, involves:
# 1.  **Worker Process Initialization:** Create the `AsyncIOMotorClient` when the Celery worker process starts (`@worker_process_init.connect`) and store it, for example, on the `celery_app` instance or a process-local context.
# 2.  **Task Access:** Tasks can then access this pre-initialized client.
# 3.  **Worker Process Shutdown:** Close the client when the worker process shuts down (`@worker_process_shutdown.connect`).
#
# However, for simplicity in this step, the current approach of creating/closing a client per task invocation (or reusing if the global `_db` is already populated by a previous task in the same worker and loop) is used. This is less efficient but avoids more complex Celery signal handling for now. The `asyncio.new_event_loop()` and `set_event_loop()` per task call is also a simplification to ensure an event loop is available for `asyncio.run` or `loop.run_until_complete`.
#
# I will proceed with this simplified DB connection management within the task for now and make a note to potentially refine it later if performance becomes an issue or if more complex async interactions are needed within tasks.
