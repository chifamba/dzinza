import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException
import sys
import os

# Mock the config early on to prevent environment requirements
import services.auth_service.config as config
config.DATABASE_URL = "sqlite:///:memory:"

# Mock redis module which handlers imports
import sys
sys.modules['redis'] = MagicMock()

# Avoid create_engine error in database
with patch('sqlalchemy.create_engine'):
    import services.auth_service.handlers as handlers

def test_assign_role_success_existing_role():
    mock_db = MagicMock(spec=Session)
    mock_user = MagicMock()
    mock_user.roles = []

    mock_role = MagicMock()
    mock_role.name = "admin"

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_user, # First call for User
        mock_role, # Second call for Role
    ]

    result = handlers.assign_role("test@example.com", "admin", mock_db)

    assert result == {"message": "Role admin assigned to test@example.com"}
    assert mock_role in mock_user.roles
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()

def test_assign_role_creates_new_role():
    mock_db = MagicMock(spec=Session)
    mock_user = MagicMock()
    mock_user.roles = []

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_user, # First call for User
        None,      # Second call for Role (not found)
    ]

    result = handlers.assign_role("test@example.com", "admin", mock_db)

    assert result == {"message": "Role admin assigned to test@example.com"}
    assert len(mock_user.roles) == 1
    assert mock_user.roles[0].name == "admin"
    mock_db.add.assert_called_once_with(mock_user.roles[0])
    mock_db.commit.assert_called_once()

def test_assign_role_already_assigned():
    mock_db = MagicMock(spec=Session)
    mock_user = MagicMock()

    mock_role = MagicMock()
    mock_role.name = "admin"
    mock_user.roles = [mock_role]

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_user, # First call for User
        mock_role, # Second call for Role
    ]

    result = handlers.assign_role("test@example.com", "admin", mock_db)

    assert result == {"message": "Role admin assigned to test@example.com"}
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()

def test_assign_role_user_not_found():
    mock_db = MagicMock(spec=Session)
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        handlers.assign_role("test@example.com", "admin", mock_db)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"
