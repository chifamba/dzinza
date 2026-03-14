import sys
from unittest.mock import MagicMock
import jwt

sys.modules['minio'] = MagicMock()
sys.modules['redis'] = MagicMock()
sys.modules['PIL'] = MagicMock()
sys.modules['PIL.ExifTags'] = MagicMock()

from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.media_storage_service.handlers import router, _media_acl, minio_client
import services.media_storage_service.config

# Mock JWT_SECRET for tests
services.media_storage_service.config.JWT_SECRET = "testsecret"
JWT_SECRET = services.media_storage_service.config.JWT_SECRET

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def setup_function():
    _media_acl.clear()

def test_get_media_no_acl():
    mock_response = MagicMock()
    mock_response.read.return_value = b"data"
    minio_client.get_object.return_value = mock_response

    response = client.get("/media/public.jpg")
    assert response.status_code == 200

def test_get_media_acl_no_token():
    _media_acl["secured.jpg"] = {"user1"}
    response = client.get("/media/secured.jpg")
    assert response.status_code == 401
    assert "token required" in response.json()["detail"].lower()

def test_get_media_acl_invalid_token():
    _media_acl["secured.jpg"] = {"user1"}
    response = client.get("/media/secured.jpg?token=invalid_token")
    assert response.status_code == 401
    assert "invalid or expired token" in response.json()["detail"].lower()

def test_get_media_acl_valid_token_not_in_acl():
    _media_acl["secured.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user2"}, JWT_SECRET, algorithm="HS256")
    response = client.get(f"/media/secured.jpg?token={token}")
    assert response.status_code == 403
    assert "access denied" in response.json()["detail"].lower()

def test_get_media_acl_valid_token_in_acl():
    _media_acl["secured.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user1"}, JWT_SECRET, algorithm="HS256")

    mock_response = MagicMock()
    mock_response.read.return_value = b"data"
    minio_client.get_object.return_value = mock_response

    response = client.get(f"/media/secured.jpg?token={token}")
    assert response.status_code == 200

def test_get_media_acl_mismatched_user_param():
    _media_acl["secured.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user1"}, JWT_SECRET, algorithm="HS256")
    response = client.get(f"/media/secured.jpg?token={token}&user=user2")
    assert response.status_code == 403
    assert "does not match token" in response.json()["detail"].lower()

def test_get_media_acl_no_sub_in_token():
    _media_acl["secured.jpg"] = {"user1"}
    token = jwt.encode({"not_sub": "user1"}, JWT_SECRET, algorithm="HS256")
    response = client.get(f"/media/secured.jpg?token={token}")
    assert response.status_code == 401
    assert "invalid token payload" in response.json()["detail"].lower()
