import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock # AsyncMock for async functions
import uuid

# Import your FastAPI app
from app.main import app
from app.dependencies import AuthenticatedUser # To mock the user
from app.dependencies import get_current_active_user # Import the actual dependency function

client = TestClient(app)

# Sample data
SAMPLE_FILE_ID = uuid.uuid4()
MOCK_USER_ID = "test-user-api-123"

# Mock AuthenticatedUser for dependency override
mock_auth_user_instance = AuthenticatedUser(id=MOCK_USER_ID, email=f"{MOCK_USER_ID}@example.com", roles=["user"])

# Override the get_current_active_user dependency for all tests in this module
def override_get_current_active_user_dependency():
    return mock_auth_user_instance

app.dependency_overrides[get_current_active_user] = override_get_current_active_user_dependency


@pytest.mark.asyncio
@patch('app.crud.soft_delete_file_record', new_callable=AsyncMock)
@patch('app.crud.check_file_exists', new_callable=AsyncMock) # Also mock check_file_exists
async def test_delete_file_success(mock_check_exists, mock_soft_delete):
    """Test successful soft delete of a file."""
    mock_soft_delete.return_value = True # Simulate successful soft delete (modified_count > 0)

    response = client.delete(f"/api/v1/files/{SAMPLE_FILE_ID}")

    assert response.status_code == 204
    # The first argument to soft_delete_file_record is the db session, we use pytest.ANY for it.
    mock_soft_delete.assert_called_once_with(pytest.ANY, file_id=SAMPLE_FILE_ID, user_id=MOCK_USER_ID)
    mock_check_exists.assert_not_called() # Should not be called if soft_delete returns True

@pytest.mark.asyncio
@patch('app.crud.soft_delete_file_record', new_callable=AsyncMock)
@patch('app.crud.check_file_exists', new_callable=AsyncMock)
async def test_delete_file_already_soft_deleted(mock_check_exists, mock_soft_delete):
    """Test deleting a file that was already soft-deleted (idempotent 204)."""
    mock_soft_delete.return_value = False # Simulate soft_delete finding nothing to modify (modified_count = 0)
    mock_check_exists.return_value = True # Simulate that the file does exist when checked without is_deleted flag

    response = client.delete(f"/api/v1/files/{SAMPLE_FILE_ID}")

    assert response.status_code == 204
    mock_soft_delete.assert_called_once_with(pytest.ANY, file_id=SAMPLE_FILE_ID, user_id=MOCK_USER_ID)
    mock_check_exists.assert_called_once_with(pytest.ANY, file_id=SAMPLE_FILE_ID, user_id=MOCK_USER_ID)

@pytest.mark.asyncio
@patch('app.crud.soft_delete_file_record', new_callable=AsyncMock)
@patch('app.crud.check_file_exists', new_callable=AsyncMock)
async def test_delete_file_not_found(mock_check_exists, mock_soft_delete):
    """Test deleting a file that is not found or not owned by the user."""
    mock_soft_delete.return_value = False # Simulate soft_delete finding nothing to modify
    mock_check_exists.return_value = False # Simulate that the file does not exist even without is_deleted flag

    response = client.delete(f"/api/v1/files/{SAMPLE_FILE_ID}")

    assert response.status_code == 404
    assert response.json() == {"detail": "File not found or access denied."}
    mock_soft_delete.assert_called_once_with(pytest.ANY, file_id=SAMPLE_FILE_ID, user_id=MOCK_USER_ID)
    mock_check_exists.assert_called_once_with(pytest.ANY, file_id=SAMPLE_FILE_ID, user_id=MOCK_USER_ID)

@pytest.mark.asyncio
@patch('app.crud.soft_delete_file_record', new_callable=AsyncMock)
async def test_delete_file_crud_soft_delete_exception(mock_soft_delete):
    """Test scenario where soft_delete_file_record raises an unexpected exception."""
    mock_soft_delete.side_effect = Exception("CRUD layer error")

    response = client.delete(f"/api/v1/files/{SAMPLE_FILE_ID}")

    # Expecting the global exception handler to catch this and return a 500
    assert response.status_code == 500
    # The exact error message might vary based on your global exception handler for Exception
    # This checks if the detail contains "internal server error" case-insensitively.
    detail = response.json().get("detail", "")
    assert "internal server error" in detail.lower()
    mock_soft_delete.assert_called_once()


# Clean up dependency overrides after tests if needed.
# This can be done globally or using pytest fixtures with finalizers.
# For a simple module like this, if TestClient(app) is module-scoped,
# the override persists for the module. If client is function-scoped, it's cleaner.
# Explicitly clearing after all tests in the module:
def teardown_module(module):
    app.dependency_overrides.clear()
