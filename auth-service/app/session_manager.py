"""
Redis-based session management with IP and User Agent tracking.
"""
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import structlog
from fastapi import Request
from sqlalchemy.orm import Session

from .config import settings
from config.redis import get_redis
from .database import get_db, SessionLocal
from . import crud, models

logger = structlog.get_logger(__name__)

class SessionManager:
    """
    Manages user sessions using Redis with IP and User Agent tracking.
    """
    
    def __init__(self):
        self.redis = get_redis()
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
        self.active_tokens_prefix = "active_token:"
    
    def _get_db(self) -> Session:
        """Get database session."""
        db = next(get_db())
        try:
            return db
        finally:
            db.close()
    
    def _sync_session_count_to_db(self, user_id: str):
        """Sync Redis session count to database."""
        try:
            from .database import SessionLocal
            import uuid
            db = SessionLocal()
            try:
                # Convert to UUID if it's a string, otherwise use as is
                if isinstance(user_id, str):
                    user_uuid = uuid.UUID(user_id)
                else:
                    user_uuid = user_id
                    
                user = crud.get_user(db, user_id=user_uuid)
                if user:
                    redis_count = self.get_user_session_count(str(user_uuid))
                    crud.update_user_session_count(db, user, redis_count)
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.error("Failed to sync session count to database",
                         user_id=user_id, error=str(e))
            # Don't raise - this is background sync

    def get_user_session_count(self, user_id: str) -> int:
        """Get the number of active sessions for a user from Redis."""
        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            return self.redis.scard(user_sessions_key)
        except Exception as e:
            logger.error("Failed to get user session count",
                         user_id=user_id, error=str(e))
            return 0
    
    def _get_client_info(self, request: Request) -> Dict[str, str]:
        """Extract client IP and User Agent from request."""
        # Try to get real IP from various headers (for load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        real_ip = request.headers.get("x-real-ip")
        
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            ip_address = forwarded_for.split(",")[0].strip()
        elif real_ip:
            ip_address = real_ip
        else:
            ip_address = getattr(request.client, 'host', 'unknown')
            
        user_agent = request.headers.get("user-agent", "unknown")
        
        return {
            "ip_address": ip_address,
            "user_agent": user_agent,
            "forwarded_for": forwarded_for,
            "real_ip": real_ip
        }
    def create_session(self, user: models.User, request: Request,
                       access_token: str, refresh_token: str,
                       refresh_jti: str) -> str:
        """
        Create a new user session with tracking info.
        
        Args:
            user: User object
            request: FastAPI request object
            access_token: JWT access token
            refresh_token: JWT refresh token
            refresh_jti: Refresh token JTI
            
        Returns:
            session_id: Unique session identifier
        """
        session_id = str(uuid.uuid4())
        client_info = self._get_client_info(request)
        
        session_data = {
            "session_id": session_id,
            "user_id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role.value if user.role else "user",
            "ip_address": client_info["ip_address"],
            "user_agent": client_info["user_agent"],
            "forwarded_for": client_info.get("forwarded_for"),
            "real_ip": client_info.get("real_ip"),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "refresh_jti": refresh_jti,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "login_count": 1,
            "mfa_verified": user.mfa_enabled  # Track if MFA was completed
        }
        
        try:
            # Store session data
            session_key = f"{self.session_prefix}{session_id}"
            self.redis.setex(
                session_key,
                int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
                json.dumps(session_data)
            )
            
            # Add session to user's active sessions list
            user_sessions_key = f"{self.user_sessions_prefix}{user.id}"
            self.redis.sadd(user_sessions_key, session_id)
            self.redis.expire(user_sessions_key, int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()))
            
            # Track active refresh token
            token_key = f"{self.active_tokens_prefix}{refresh_jti}"
            self.redis.setex(
                token_key,
                int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
                session_id
            )
            
            # Sync session count to database
            self._sync_session_count_to_db(user.id)
            
            logger.info("Session created", 
                       session_id=session_id, 
                       user_id=str(user.id),
                       ip_address=client_info["ip_address"])
            
            return session_id
            
        except Exception as e:
            logger.error("Failed to create session", 
                        user_id=str(user.id), 
                        error=str(e))
            raise
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data by session ID."""
        try:
            session_key = f"{self.session_prefix}{session_id}"
            session_data = self.redis.get(session_key)
            
            if session_data:
                return json.loads(session_data)
            return None
            
        except Exception as e:
            logger.error("Failed to get session", 
                        session_id=session_id, 
                        error=str(e))
            return None
    
    def get_session_by_token(self, refresh_jti: str) -> Optional[Dict[str, Any]]:
        """Get session data by refresh token JTI."""
        try:
            token_key = f"{self.active_tokens_prefix}{refresh_jti}"
            session_id = self.redis.get(token_key)
            
            if session_id:
                return self.get_session(session_id)
            return None
            
        except Exception as e:
            logger.error("Failed to get session by token", 
                        refresh_jti=refresh_jti, 
                        error=str(e))
            return None
    
    def update_session_activity(self, session_id: str, request: Request = None) -> bool:
        """Update session's last activity timestamp."""
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                return False
            
            session_data["last_activity"] = datetime.utcnow().isoformat()
            
            # Update IP if it changed (for mobile users)
            if request:
                client_info = self._get_client_info(request)
                if client_info["ip_address"] != session_data.get("ip_address"):
                    session_data["previous_ip"] = session_data.get("ip_address")
                    session_data["ip_address"] = client_info["ip_address"]
                    logger.info("IP address changed for session", 
                               session_id=session_id,
                               old_ip=session_data.get("previous_ip"),
                               new_ip=client_info["ip_address"])
            
            session_key = f"{self.session_prefix}{session_id}"
            self.redis.setex(
                session_key,
                int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
                json.dumps(session_data)
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to update session activity", 
                        session_id=session_id, 
                        error=str(e))
            return False
    
    def revoke_session(self, session_id: str) -> bool:
        """Revoke a specific session."""
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                return False
            
            user_id = session_data["user_id"]
            refresh_jti = session_data.get("refresh_jti")
            
            # Remove session data
            session_key = f"{self.session_prefix}{session_id}"
            self.redis.delete(session_key)
            
            # Remove from user's active sessions
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            self.redis.srem(user_sessions_key, session_id)
            
            # Remove token tracking
            if refresh_jti:
                token_key = f"{self.active_tokens_prefix}{refresh_jti}"
                self.redis.delete(token_key)
            
            # Sync session count to database
            self._sync_session_count_to_db(user_id)
            
            logger.info("Session revoked", 
                       session_id=session_id, 
                       user_id=user_id)
            
            return True
            
        except Exception as e:
            logger.error("Failed to revoke session", 
                        session_id=session_id, 
                        error=str(e))
            return False
    
    def revoke_all_user_sessions(self, user_id: str, except_session_id: str = None) -> int:
        """Revoke all sessions for a user, optionally except one."""
        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            session_ids = self.redis.smembers(user_sessions_key)
            
            revoked_count = 0
            for session_id in session_ids:
                if except_session_id and session_id == except_session_id:
                    continue
                    
                if self.revoke_session(session_id):
                    revoked_count += 1
            
            logger.info("Revoked user sessions", 
                       user_id=user_id, 
                       revoked_count=revoked_count,
                       except_session=except_session_id)
            
            return revoked_count
            
        except Exception as e:
            logger.error("Failed to revoke user sessions", 
                        user_id=user_id, 
                        error=str(e))
            return 0
    
    def get_user_active_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        try:
            user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
            session_ids = self.redis.smembers(user_sessions_key)
            
            sessions = []
            for session_id in session_ids:
                session_data = self.get_session(session_id)
                if session_data:
                    # Remove sensitive data before returning
                    safe_session = {
                        "session_id": session_data["session_id"],
                        "ip_address": session_data["ip_address"],
                        "user_agent": session_data["user_agent"],
                        "created_at": session_data["created_at"],
                        "last_activity": session_data["last_activity"],
                        "login_count": session_data.get("login_count", 1)
                    }
                    sessions.append(safe_session)
            
            return sessions
            
        except Exception as e:
            logger.error("Failed to get user sessions", 
                        user_id=user_id, 
                        error=str(e))
            return []
    
    def validate_session_security(self, session_id: str, request: Request) -> Dict[str, Any]:
        """
        Validate session security by checking IP and User Agent.
        Returns validation result with warnings.
        """
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                return {"valid": False, "reason": "session_not_found"}
            
            client_info = self._get_client_info(request)
            current_ip = client_info["ip_address"]
            current_ua = client_info["user_agent"]
            
            session_ip = session_data.get("ip_address")
            session_ua = session_data.get("user_agent")
            
            warnings = []
            
            # Check IP address
            if session_ip and current_ip != session_ip:
                warnings.append({
                    "type": "ip_mismatch",
                    "message": "IP address changed",
                    "session_ip": session_ip,
                    "current_ip": current_ip
                })
            
            # Check User Agent (more lenient, just warn)
            if session_ua and current_ua != session_ua:
                warnings.append({
                    "type": "user_agent_mismatch", 
                    "message": "User agent changed",
                    "session_ua": session_ua[:100],  # Truncate for logging
                    "current_ua": current_ua[:100]
                })
            
            # Check session age
            created_at = datetime.fromisoformat(session_data["created_at"])
            session_age = datetime.utcnow() - created_at
            
            if session_age > timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS):
                return {"valid": False, "reason": "session_expired"}
            
            return {
                "valid": True,
                "warnings": warnings,
                "session_age_hours": session_age.total_seconds() / 3600
            }
            
        except Exception as e:
            logger.error("Failed to validate session security", 
                        session_id=session_id, 
                        error=str(e))
            return {"valid": False, "reason": "validation_error"}
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions (to be run periodically)."""
        try:
            # This is a simple cleanup - in production you might want more sophisticated cleanup
            # For now, Redis TTL handles most of the cleanup automatically
            cleaned = 0
            
            # Could implement more sophisticated cleanup logic here
            # such as checking for sessions older than X days
            
            logger.info("Session cleanup completed", cleaned_count=cleaned)
            return cleaned
            
        except Exception as e:
            logger.error("Session cleanup failed", error=str(e))
            return 0


# Singleton instance
session_manager = SessionManager()


def get_session_manager() -> SessionManager:
    """Dependency to get session manager instance."""
    return session_manager
