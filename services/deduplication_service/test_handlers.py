import sys
from unittest.mock import MagicMock
import pytest

# --- Mocking Infrastructure ---

# Create a mock for fastapi
mock_fastapi = MagicMock()

# Mock APIRouter to return a mock router
mock_router = MagicMock()
mock_fastapi.APIRouter.return_value = mock_router

# Mock the decorator methods (post, get, etc.) to return a decorator
# that returns the function unchanged.
def mock_decorator(*args, **kwargs):
    def decorator(f):
        return f
    return decorator

mock_router.post.side_effect = mock_decorator
mock_router.get.side_effect = mock_decorator
mock_router.put.side_effect = mock_decorator
mock_router.delete.side_effect = mock_decorator

# Mock fastapi before importing handlers to avoid ModuleNotFoundError
# and ensure decorators don't interfere with function testing.
sys.modules["fastapi"] = mock_fastapi

# Now we can safely import the handler from the service directory.
# This assumes the 'services' directory is in PYTHONPATH.
try:
    from deduplication_service.handlers import user_merge_approval
    from deduplication_service import handlers
    from deduplication_service.handlers import deduplicate_address
except ImportError:
    # Fallback for different environments if necessary,
    # though the PYTHONPATH export in the test command is the primary method.
    from services.deduplication_service.handlers import user_merge_approval
    from services.deduplication_service import handlers
    from services.deduplication_service.handlers import deduplicate_address

# --- Tests ---

def test_user_merge_approval_approved():
    """
    Test user_merge_approval with approved=True.
    Verifies that the function returns the correct status for a positive approval.
    """
    user_id = "user123"
    merge_id = "merge456"
    approved = True
    result = user_merge_approval(user_id, merge_id, approved)
    assert result == {
        "user_id": user_id,
        "merge_id": merge_id,
        "approved": approved
    }

def test_user_merge_approval_rejected():
    """
    Test user_merge_approval with approved=False.
    Verifies that the function correctly processes a merge rejection.
    """
    user_id = "user789"
    merge_id = "merge012"
    approved = False
    result = user_merge_approval(user_id, merge_id, approved)
    assert result == {
        "user_id": user_id,
        "merge_id": merge_id,
        "approved": approved
    }

def test_user_merge_approval_empty_strings():
    """
    Test user_merge_approval with empty strings for identifiers.
    Ensures the function handles unexpected but technically valid string inputs.
    """
    user_id = ""
    merge_id = ""
    approved = True
    result = user_merge_approval(user_id, merge_id, approved)
    assert result == {
        "user_id": user_id,
        "merge_id": merge_id,
        "approved": approved
    }


@pytest.fixture(autouse=True)
def clear_profiles():
    # Clear the global profiles list before each test
    handlers.profiles.clear()
    yield
    handlers.profiles.clear()

def test_deduplicate_address_no_duplicates():
    """
    Test deduplicate_address with no duplicates.
    Verifies that the function returns an empty duplicates list when all addresses are unique.
    """
    handlers.profiles.extend([
        {"id": "1", "address": "123 Main St"},
        {"id": "2", "address": "456 Oak Ave"}
    ])
    result = deduplicate_address()
    assert result == {"duplicates": []}

def test_deduplicate_address_with_duplicates():
    """
    Test deduplicate_address with duplicates.
    Verifies that the function accurately identifies duplicates, ignoring case sensitivity.
    """
    handlers.profiles.extend([
        {"id": "1", "address": "123 Main St"},
        {"id": "2", "address": "123 MAIN ST"},
        {"id": "3", "address": "456 Oak Ave"}
    ])
    result = deduplicate_address()
    assert len(result["duplicates"]) == 1
    assert result["duplicates"][0] == {"id": "2", "address": "123 MAIN ST"}

def test_deduplicate_address_missing_address():
    """
    Test deduplicate_address with missing or empty addresses.
    Verifies that the function properly handles missing or empty address fields without crashing or false positives.
    """
    handlers.profiles.extend([
        {"id": "1"}, # Missing address
        {"id": "2", "address": ""}, # Empty address
        {"id": "3", "address": "123 Main St"},
        {"id": "4", "address": "123 Main St"}
    ])
    result = deduplicate_address()
    assert len(result["duplicates"]) == 1
    assert result["duplicates"][0] == {"id": "4", "address": "123 Main St"}
