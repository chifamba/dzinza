import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from fastapi import FastAPI
import sys
import os

# Mock config to avoid loading database URL issues
sys.modules['services.auth_service.config'] = MagicMock()
sys.modules['services.auth_service.config'].DATABASE_URL = "sqlite:///:memory:"
sys.modules['services.auth_service.config'].REDIS_URL = "redis://localhost:6379/0"
sys.modules['services.auth_service.config'].JWT_SECRET = "secret"
sys.modules['services.auth_service.config'].GOOGLE_CLIENT_ID = "client"

# Mock redis module early
sys.modules['redis'] = MagicMock()

from services.auth_service.handlers import router, get_db

app = FastAPI()
app.include_router(router)

def override_get_db():
    yield MagicMock()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

class TestEnableEmailMFA:
    """Tests for the enable_email_mfa endpoint in auth_service."""

    @patch('services.auth_service.handlers.redis_client')
    @patch('services.auth_service.handlers.get_user_by_email')
    @patch('random.randint')
    def test_enable_email_mfa_success(self, mock_randint, mock_get_user, mock_redis):
        """Test successful generation and storage of MFA code."""
        # Setup mocks
        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_get_user.return_value = mock_user
        mock_randint.return_value = 123456

        # Execute request
        response = client.post("/enable_email_mfa", json={"email": "test@example.com"})

        # Assertions
        assert response.status_code == 200
        assert response.json() == {"message": "MFA code sent to test@example.com"}

        # Verify random was called correctly to generate a 6-digit code
        mock_randint.assert_called_once_with(100000, 999999)

        # Verify redis was called to store the code with a 10-minute expiration
        mock_redis.setex.assert_called_once_with("email_mfa:test@example.com", 600, "123456")

    @patch('services.auth_service.handlers.get_user_by_email')
    def test_enable_email_mfa_user_not_found(self, mock_get_user):
        """Test enabling MFA for a non-existent user."""
        # Setup mocks
        mock_get_user.side_effect = HTTPException(status_code=404, detail="User not found")

        # Execute request
        response = client.post("/enable_email_mfa", json={"email": "nonexistent@example.com"})

        # Assertions
        assert response.status_code == 404
        assert response.json() == {"detail": "User not found"}

    def test_enable_email_mfa_invalid_payload(self):
        """Test with invalid email format payload."""
        # Execute request with invalid email format
        response = client.post("/enable_email_mfa", json={"email": "not-an-email"})

        # Assertions
        assert response.status_code == 422 # Unprocessable Entity

    def test_enable_email_mfa_missing_payload(self):
        """Test with missing email payload."""
        # Execute request without payload
        response = client.post("/enable_email_mfa", json={})

        # Assertions
        assert response.status_code == 422 # Unprocessable Entity
