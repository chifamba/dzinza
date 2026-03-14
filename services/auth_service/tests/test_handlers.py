from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import pytest

from services.auth_service.handlers import router, get_db
from fastapi import FastAPI
from services.auth_service import schemas

app = FastAPI()
app.include_router(router)
client = TestClient(app)

mock_db = MagicMock()

def get_mock_db():
    yield mock_db

app.dependency_overrides[get_db] = get_mock_db

@pytest.fixture(autouse=True)
def setup_teardown():
    mock_db.reset_mock()
    yield

@patch('services.auth_service.handlers.redis_client')
def test_login_rate_limiting(mock_redis):
    # Setup mock to simulate 5 failed attempts
    mock_redis.zcard.return_value = 5

    # Send a login request
    response = client.post(
        "/login",
        json={"email": "test@example.com", "password": "Password1!"}
    )

    assert response.status_code == 429
    assert response.json() == {"detail": "Too many login attempts. Try again later."}

    # Verify redis calls
    attempts_key = "login_attempts:test@example.com"
    mock_redis.zremrangebyscore.assert_called_once()
    mock_redis.zcard.assert_called_once_with(attempts_key)

@patch('services.auth_service.handlers.redis_client')
def test_login_under_rate_limit(mock_redis):
    # Setup mock to simulate 4 failed attempts
    mock_redis.zcard.return_value = 4

    # Setup mock_db to return no user (invalid credentials path)
    mock_db.query.return_value.filter.return_value.first.return_value = None

    # Send a login request with invalid credentials (to fail normally)
    response = client.post(
        "/login",
        json={"email": "test@example.com", "password": "WrongPassword1!"}
    )

    # We should get 401 Unauthorized, not 429 Too Many Requests
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}

    # Verify rate limit increment happened
    mock_redis.zadd.assert_called_once()
    mock_redis.expire.assert_called_once()
