import os
import sys

# Set environment variables BEFORE importing modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test_secret"
os.environ["REDIS_URL"] = "redis://localhost:6379"

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.orm import Session

# Add services/ to PYTHONPATH so absolute imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from auth_service.handlers import verify_email_mfa, router, get_user_by_email
from auth_service.schemas import VerifyEmailMFARequest

@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.email = "test@example.com"
    user.mfa_enabled = False
    return user

@patch("auth_service.handlers.get_user_by_email")
@patch("auth_service.handlers.redis_client")
def test_verify_email_mfa_success(mock_redis, mock_get_user, mock_db_session, mock_user):
    mock_get_user.return_value = mock_user
    mock_redis.get.return_value = "123456"

    payload = VerifyEmailMFARequest(email="test@example.com", code="123456")

    response = verify_email_mfa(payload=payload, db=mock_db_session)

    mock_redis.get.assert_called_once_with("email_mfa:test@example.com")
    assert mock_user.mfa_enabled is True
    mock_db_session.commit.assert_called_once()
    mock_redis.delete.assert_called_once_with("email_mfa:test@example.com")
    assert response == {"message": "Email MFA enabled for test@example.com"}

@patch("auth_service.handlers.get_user_by_email")
@patch("auth_service.handlers.redis_client")
def test_verify_email_mfa_invalid_code(mock_redis, mock_get_user, mock_db_session, mock_user):
    mock_get_user.return_value = mock_user
    mock_redis.get.return_value = "123456"

    payload = VerifyEmailMFARequest(email="test@example.com", code="654321")

    with pytest.raises(HTTPException) as excinfo:
        verify_email_mfa(payload=payload, db=mock_db_session)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Invalid MFA code"
    assert mock_user.mfa_enabled is False
    mock_db_session.commit.assert_not_called()
    mock_redis.delete.assert_not_called()

@patch("auth_service.handlers.get_user_by_email")
@patch("auth_service.handlers.redis_client")
def test_verify_email_mfa_expired_or_missing_code(mock_redis, mock_get_user, mock_db_session, mock_user):
    mock_get_user.return_value = mock_user
    mock_redis.get.return_value = None

    payload = VerifyEmailMFARequest(email="test@example.com", code="123456")

    with pytest.raises(HTTPException) as excinfo:
        verify_email_mfa(payload=payload, db=mock_db_session)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Invalid MFA code"
    assert mock_user.mfa_enabled is False
    mock_db_session.commit.assert_not_called()
    mock_redis.delete.assert_not_called()
