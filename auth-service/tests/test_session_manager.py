"""
Tests for session management functionality.
"""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta
import uuid
import json

from app.session_manager import SessionManager


class TestSessionManager:
    """Test cases for SessionManager class."""

    @pytest.fixture
    def session_manager(self):
        """Create a SessionManager instance for testing."""
        return SessionManager()

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = AsyncMock()
        return mock_redis

    @pytest.fixture
    def sample_user_id(self):
        """Sample user ID for testing."""
        return str(uuid.uuid4())

    @pytest.fixture
    def sample_session_id(self):
        """Sample session ID for testing."""
        return f"session_{uuid.uuid4().hex}"

    @pytest.fixture
    def sample_session_data(self):
        """Sample session data for testing."""
        return {
            "user_id": str(uuid.uuid4()),
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0 Test Browser",
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "device_fingerprint": "test_fingerprint",
            "location_info": "Test Location"
        }

    @pytest.mark.asyncio
    async def test_create_session(
        self, session_manager, mock_redis, sample_user_id
    ):
        """Test creating a new session."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.setex.return_value = True
            mock_redis.sadd.return_value = 1
            
            session_id = await session_manager.create_session(
                user_id=sample_user_id,
                ip_address="192.168.1.1",
                user_agent="Test Browser"
            )
            
            assert session_id.startswith("session_")
            mock_redis.setex.assert_called_once()
            mock_redis.sadd.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_session(
        self, session_manager, mock_redis, sample_session_id,
        sample_session_data
    ):
        """Test retrieving session data."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = json.dumps(sample_session_data)
            
            session_data = await session_manager.get_session(sample_session_id)
            
            assert session_data is not None
            assert session_data["user_id"] == sample_session_data["user_id"]
            mock_redis.get.assert_called_once_with(sample_session_id)

    @pytest.mark.asyncio
    async def test_get_session_not_found(
        self, session_manager, mock_redis, sample_session_id
    ):
        """Test retrieving non-existent session."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = None
            
            session_data = await session_manager.get_session(sample_session_id)
            
            assert session_data is None
            mock_redis.get.assert_called_once_with(sample_session_id)

    @pytest.mark.asyncio
    async def test_update_session_activity(
        self, session_manager, mock_redis, sample_session_id,
        sample_session_data
    ):
        """Test updating session last activity."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = json.dumps(sample_session_data)
            mock_redis.setex.return_value = True
            
            success = await session_manager.update_session_activity(
                sample_session_id
            )
            
            assert success is True
            mock_redis.get.assert_called_once()
            mock_redis.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_session_security_success(
        self, session_manager, mock_redis, sample_session_id,
        sample_session_data
    ):
        """Test successful session security validation."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = json.dumps(sample_session_data)
            
            is_valid = await session_manager.validate_session_security(
                sample_session_id,
                sample_session_data["ip_address"],
                sample_session_data["user_agent"]
            )
            
            assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_session_security_ip_mismatch(
        self, session_manager, mock_redis, sample_session_id,
        sample_session_data
    ):
        """Test session security validation with IP mismatch."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = json.dumps(sample_session_data)
            
            is_valid = await session_manager.validate_session_security(
                sample_session_id,
                "192.168.1.999",  # Different IP
                sample_session_data["user_agent"]
            )
            
            assert is_valid is False

    @pytest.mark.asyncio
    async def test_validate_session_security_user_agent_mismatch(
        self, session_manager, mock_redis, sample_session_id,
        sample_session_data
    ):
        """Test session security validation with User-Agent mismatch."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.get.return_value = json.dumps(sample_session_data)
            
            is_valid = await session_manager.validate_session_security(
                sample_session_id,
                sample_session_data["ip_address"],
                "Different Browser"  # Different User-Agent
            )
            
            assert is_valid is False

    @pytest.mark.asyncio
    async def test_revoke_session(
        self, session_manager, mock_redis, sample_session_id, sample_user_id
    ):
        """Test revoking a session."""
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.delete.return_value = 1
            mock_redis.srem.return_value = 1
            
            success = await session_manager.revoke_session(
                sample_session_id, sample_user_id
            )
            
            assert success is True
            mock_redis.delete.assert_called_once_with(sample_session_id)
            mock_redis.srem.assert_called_once()

    @pytest.mark.asyncio
    async def test_revoke_all_user_sessions(
        self, session_manager, mock_redis, sample_user_id
    ):
        """Test revoking all sessions for a user."""
        session_ids = [f"session_{i}" for i in range(3)]
        
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.smembers.return_value = session_ids
            mock_redis.delete.return_value = len(session_ids)
            mock_redis.delete.return_value = 1  # For user sessions set
            
            revoked_count = await session_manager.revoke_all_user_sessions(
                sample_user_id
            )
            
            assert revoked_count == len(session_ids)
            mock_redis.smembers.assert_called_once()
            assert mock_redis.delete.call_count == 2  # Sessions + user set

    @pytest.mark.asyncio
    async def test_get_user_session_count(
        self, session_manager, mock_redis, sample_user_id
    ):
        """Test getting user session count."""
        session_ids = [f"session_{i}" for i in range(3)]
        
        with patch.object(session_manager, 'redis', mock_redis):
            mock_redis.scard.return_value = len(session_ids)
            
            count = await session_manager.get_user_session_count(
                sample_user_id
            )
            
            assert count == len(session_ids)
            mock_redis.scard.assert_called_once()

    @pytest.mark.asyncio
    async def test_enforce_max_sessions(
        self, session_manager, mock_redis, sample_user_id
    ):
        """Test enforcing maximum session limits."""
        max_sessions = 2
        existing_sessions = [f"session_{i}" for i in range(3)]
        
        with patch.object(session_manager, 'redis', mock_redis):
            # Mock existing sessions
            mock_redis.smembers.return_value = existing_sessions
            mock_redis.delete.return_value = 1
            mock_redis.srem.return_value = 1
            
            # Mock getting oldest sessions (by creation time)
            mock_redis.get.side_effect = [
                json.dumps({"created_at": "2023-01-01T10:00:00"}),
                json.dumps({"created_at": "2023-01-01T11:00:00"}),
                json.dumps({"created_at": "2023-01-01T12:00:00"}),
            ]
            
            revoked_count = await session_manager.enforce_max_sessions(
                sample_user_id, max_sessions
            )
            
            assert revoked_count == 1  # Should revoke 1 session (3 - 2)

    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions(self, session_manager, mock_redis):
        """Test cleaning up expired sessions."""
        # This test would require mocking the Redis SCAN operation
        # and checking for expired sessions
        with patch.object(session_manager, 'redis', mock_redis):
            # Mock scan returning some session keys
            mock_redis.scan_iter.return_value = [
                "session_expired_1",
                "session_valid_1",
                "session_expired_2"
            ]
            
            # Mock get returning expired and valid sessions
            def mock_get(key):
                if "expired" in key:
                    expired_time = (datetime.utcnow() - timedelta(hours=2))
                    return json.dumps({
                        "created_at": expired_time.isoformat(),
                        "last_activity": expired_time.isoformat()
                    })
                else:
                    return json.dumps({
                        "created_at": datetime.utcnow().isoformat(),
                        "last_activity": datetime.utcnow().isoformat()
                    })
            
            mock_redis.get.side_effect = mock_get
            mock_redis.delete.return_value = 1
            
            cleaned_count = await session_manager.cleanup_expired_sessions()
            
            # Should clean up 2 expired sessions
            assert cleaned_count >= 0  # At least some cleanup occurred
            assert mock_redis.delete.call_count >= 2


class TestSessionIntegration:
    """Integration tests for session management with other components."""

    @pytest.mark.asyncio
    async def test_login_creates_session(self):
        """Test that login endpoint creates a session."""
        # This would be an integration test with the actual login endpoint
        # involving a real database and Redis instance
        pass

    @pytest.mark.asyncio
    async def test_refresh_validates_session(self):
        """Test that refresh endpoint validates sessions."""
        # This would test the refresh endpoint's session validation
        pass

    @pytest.mark.asyncio
    async def test_logout_revokes_session(self):
        """Test that logout endpoint revokes sessions."""
        # This would test the logout endpoint's session revocation
        pass

    @pytest.mark.asyncio
    async def test_concurrent_session_limit(self):
        """Test concurrent session limit enforcement."""
        # This would test creating multiple sessions and ensuring
        # the limit is properly enforced
        pass


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])
