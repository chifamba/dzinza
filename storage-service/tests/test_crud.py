import pytest
import pytest_asyncio # Required for async fixtures
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app import crud
from app.models import FileRecord

# Fixture for a mock database object
@pytest_asyncio.fixture
async def mock_db():
    db = AsyncMock()
    db.client = AsyncMock() # if your crud/db setup uses db.client explicitly
    # If get_file_collection is used:
    # db[crud.FILES_COLLECTION] = AsyncMock() # This is what get_file_collection(db) would return
    # Or mock get_file_collection itself if preferred
    return db

# Fixture for a sample FileRecord data
@pytest.fixture
def sample_file_id() -> uuid.UUID:
    return uuid.uuid4()

@pytest.fixture
def sample_user_id() -> str:
    return "test-user-123"

@pytest.fixture
def sample_file_record_data(sample_file_id, sample_user_id) -> dict:
    now = datetime.utcnow()
    return {
        "_id": sample_file_id, # MongoDB uses _id
        "id": sample_file_id,  # Pydantic model might use id
        "user_id": sample_user_id,
        "original_name": "test_image.jpg",
        "filename": f"{sample_file_id}_test_image.jpg",
        "s3_key": f"users/{sample_user_id}/{sample_file_id}_test_image.jpg",
        "url": f"https://s3.example.com/bucket/users/{sample_user_id}/{sample_file_id}_test_image.jpg",
        "size_bytes": 1024 * 100, # 100KB
        "mime_type": "image/jpeg",
        "category": "photo",
        "privacy": "private",
        "description": "A test image.",
        "tags": ["test", "image"],
        "metadata": {}, # Simplified for this test
        "thumbnails": [],
        "related_persons": [],
        "related_events": [],
        "is_deleted": False,
        "deleted_at": None,
        "uploaded_at": now - timedelta(days=1),
        "updated_at": now - timedelta(days=1),
    }

@pytest.mark.asyncio
@patch('app.crud.get_file_collection') # Patch where it's used
async def test_soft_delete_file_record_success(mock_get_collection, mock_db, sample_file_id, sample_user_id):
    """Test successful soft delete of a file record."""
    mock_collection = AsyncMock()
    mock_get_collection.return_value = mock_collection

    # Simulate that update_one found and modified 1 document
    mock_update_result = AsyncMock()
    mock_update_result.modified_count = 1
    mock_collection.update_one.return_value = mock_update_result

    result = await crud.soft_delete_file_record(mock_db, file_id=sample_file_id, user_id=sample_user_id)

    assert result is True
    mock_collection.update_one.assert_called_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[0] == {"_id": sample_file_id, "user_id": sample_user_id, "is_deleted": False}
    assert call_args[1]["$set"]["is_deleted"] is True
    assert "deleted_at" in call_args[1]["$set"]
    assert "updated_at" in call_args[1]["$set"]

@pytest.mark.asyncio
@patch('app.crud.get_file_collection')
async def test_soft_delete_file_record_not_found_or_already_deleted(mock_get_collection, mock_db, sample_file_id, sample_user_id):
    """Test soft delete when file is not found, not owned, or already soft-deleted."""
    mock_collection = AsyncMock()
    mock_get_collection.return_value = mock_collection

    # Simulate that update_one found 0 documents to modify
    mock_update_result = AsyncMock()
    mock_update_result.modified_count = 0
    mock_collection.update_one.return_value = mock_update_result

    result = await crud.soft_delete_file_record(mock_db, file_id=sample_file_id, user_id=sample_user_id)

    assert result is False
    mock_collection.update_one.assert_called_once_with(
        {"_id": sample_file_id, "user_id": sample_user_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": pytest.approx(datetime.utcnow(), abs=timedelta(seconds=1)), "updated_at": pytest.approx(datetime.utcnow(), abs=timedelta(seconds=1))}}
    )

@pytest.mark.asyncio
@patch('app.crud.get_file_collection')
async def test_check_file_exists_true(mock_get_collection, mock_db, sample_file_id, sample_user_id):
    """Test check_file_exists when a file exists for the user."""
    mock_collection = AsyncMock()
    mock_get_collection.return_value = mock_collection

    # Simulate count_documents finding 1 document
    mock_collection.count_documents.return_value = 1

    result = await crud.check_file_exists(mock_db, file_id=sample_file_id, user_id=sample_user_id)

    assert result is True
    mock_collection.count_documents.assert_called_once_with({"_id": sample_file_id, "user_id": sample_user_id})

@pytest.mark.asyncio
@patch('app.crud.get_file_collection')
async def test_check_file_exists_false(mock_get_collection, mock_db, sample_file_id, sample_user_id):
    """Test check_file_exists when a file does not exist for the user."""
    mock_collection = AsyncMock()
    mock_get_collection.return_value = mock_collection

    # Simulate count_documents finding 0 documents
    mock_collection.count_documents.return_value = 0

    result = await crud.check_file_exists(mock_db, file_id=sample_file_id, user_id=sample_user_id)

    assert result is False
    mock_collection.count_documents.assert_called_once_with({"_id": sample_file_id, "user_id": sample_user_id})

@pytest.mark.asyncio
@patch('app.crud.get_file_collection')
async def test_check_file_exists_no_user_id(mock_get_collection, mock_db, sample_file_id):
    """Test check_file_exists without user_id (e.g., system check)."""
    mock_collection = AsyncMock()
    mock_get_collection.return_value = mock_collection
    mock_collection.count_documents.return_value = 1 # Assume it exists

    result = await crud.check_file_exists(mock_db, file_id=sample_file_id, user_id=None)

    assert result is True
    mock_collection.count_documents.assert_called_once_with({"_id": sample_file_id})

# TODO: Add tests for other CRUD functions like create_file_record, get_file_record_by_id, etc.
# For those returning FileRecord instances, you'd mock find_one to return a dict
# and then assert the Pydantic model is correctly instantiated.
# Example:
# @pytest.mark.asyncio
# @patch('app.crud.get_file_collection')
# async def test_get_file_record_by_id_found(mock_get_collection, mock_db, sample_file_record_data, sample_file_id, sample_user_id):
#     mock_collection = AsyncMock()
#     mock_get_collection.return_value = mock_collection
#     mock_collection.find_one.return_value = sample_file_record_data

#     record = await crud.get_file_record_by_id(mock_db, file_id=sample_file_id, user_id=sample_user_id)

#     assert record is not None
#     assert record.id == sample_file_id
#     assert record.user_id == sample_user_id
#     mock_collection.find_one.assert_called_once_with({"_id": sample_file_id, "user_id": sample_user_id, "is_deleted": False})

# @pytest.mark.asyncio
# @patch('app.crud.get_file_collection')
# async def test_get_file_record_by_id_not_found(mock_get_collection, mock_db, sample_file_id, sample_user_id):
#     mock_collection = AsyncMock()
#     mock_get_collection.return_value = mock_collection
#     mock_collection.find_one.return_value = None # Simulate not found

#     record = await crud.get_file_record_by_id(mock_db, file_id=sample_file_id, user_id=sample_user_id)

#     assert record is None
#     mock_collection.find_one.assert_called_once_with({"_id": sample_file_id, "user_id": sample_user_id, "is_deleted": False})

# Note on pytest.approx for datetime:
# When checking timestamps set to `datetime.utcnow()`, use `pytest.approx`
# e.g., `assert call_args[1]["$set"]["deleted_at"] == pytest.approx(datetime.utcnow(), abs=timedelta(seconds=1))`
# This accounts for minor time differences during test execution.
# The current test_soft_delete_file_record_not_found_or_already_deleted uses this.Tool output for `create_file_with_block`:
