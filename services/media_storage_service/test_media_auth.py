import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
import jwt
from services.media_storage_service.handlers import get_media, _media_acl
from services.media_storage_service.config import JWT_SECRET

@pytest.fixture(autouse=True)
def reset_acl():
    # Clear ACL before each test
    _media_acl.clear()

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_no_acl_success(mock_minio):
    mock_response = MagicMock()
    mock_response.read.return_value = b"test data"
    mock_minio.get_object.return_value = mock_response

    result = get_media("test_file.jpg")
    assert result == b"test data"
    mock_minio.get_object.assert_called_once_with("media", "test_file.jpg")

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_missing_token(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}

    with pytest.raises(HTTPException) as exc_info:
        get_media("test_file.jpg")

    assert exc_info.value.status_code == 401
    assert "Authentication token required" in exc_info.value.detail

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_valid_token_access_granted(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user1"}, JWT_SECRET, algorithm="HS256")

    mock_response = MagicMock()
    mock_response.read.return_value = b"test data"
    mock_minio.get_object.return_value = mock_response

    result = get_media("test_file.jpg", token=token)
    assert result == b"test data"

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_valid_token_access_denied(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user2"}, JWT_SECRET, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        get_media("test_file.jpg", token=token)

    assert exc_info.value.status_code == 403
    assert "Access denied" in exc_info.value.detail

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_invalid_token(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}
    token = "invalid_token_string"

    with pytest.raises(HTTPException) as exc_info:
        get_media("test_file.jpg", token=token)

    assert exc_info.value.status_code == 401
    assert "Invalid token" in exc_info.value.detail

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_valid_token_user_param_mismatch(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user1"}, JWT_SECRET, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        get_media("test_file.jpg", token=token, user="user2")

    assert exc_info.value.status_code == 403
    assert "Access denied" in exc_info.value.detail

@patch('services.media_storage_service.handlers.minio_client')
def test_get_media_with_acl_valid_token_user_param_match(mock_minio):
    _media_acl["test_file.jpg"] = {"user1"}
    token = jwt.encode({"sub": "user1"}, JWT_SECRET, algorithm="HS256")

    mock_response = MagicMock()
    mock_response.read.return_value = b"test data"
    mock_minio.get_object.return_value = mock_response

    result = get_media("test_file.jpg", token=token, user="user1")
    assert result == b"test data"
