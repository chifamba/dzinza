import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
import sys
import os
from datetime import datetime, timedelta, timezone

# Set environment variables required for loading modules
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['JWT_SECRET'] = 'test-secret-that-needs-to-be-at-least-thirty-two-bytes-long'
os.environ['GOOGLE_CLIENT_ID'] = 'test-client-id'

# Mock redis so we don't need it running
sys.modules['redis'] = MagicMock()

# Setup paths so absolute imports within auth_service work
sys.path.insert(0, os.path.abspath('services/auth_service'))

from services.auth_service.handlers import refresh_token
from services.auth_service.config import JWT_SECRET
import jwt

def test_refresh_token_blacklisted():
    # Setup mock db session
    mock_db = MagicMock()

    # Setup query to return a blacklisted token
    mock_query = MagicMock()
    mock_filter = MagicMock()
    # It returns a truthy value for .first() indicating it is blacklisted
    mock_filter.first.return_value = MagicMock()
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    with pytest.raises(HTTPException) as exc_info:
        refresh_token(token="some_token", db=mock_db)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token blacklisted"

def test_refresh_token_malformed_string():
    # Setup mock db session
    mock_db = MagicMock()

    # Setup query to return no blacklisted token
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = None
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    # Test with malformed string
    with pytest.raises(HTTPException) as exc_info:
        refresh_token(token="invalid_token_string", db=mock_db)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid refresh token"

def test_refresh_token_missing_sub():
    # Setup mock db session
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = None
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    # Test with valid JWT but missing 'sub'
    valid_jwt_no_sub = jwt.encode({"some_other_claim": "value"}, JWT_SECRET, algorithm="HS256")
    with pytest.raises(HTTPException) as exc_info:
        refresh_token(token=valid_jwt_no_sub, db=mock_db)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid refresh token"

def test_refresh_token_expired():
    # Setup mock db session
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = None
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    # Test with expired JWT
    expired_jwt = jwt.encode({"sub": "test_user", "exp": datetime.now(timezone.utc) - timedelta(days=1)}, JWT_SECRET, algorithm="HS256")
    with pytest.raises(HTTPException) as exc_info:
        refresh_token(token=expired_jwt, db=mock_db)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid refresh token"
