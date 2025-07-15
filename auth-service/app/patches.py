"""
This module contains patches to fix issues with the refresh token functionality in the auth service.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import UserRole
import uuid
import datetime


class TokenPayload(BaseModel):
    """
    Modified TokenPayload class that includes the jti field for all tokens.
    This ensures compatibility with the refresh token functionality.
    """
    sub: str
    exp: Optional[int] = None
    iss: Optional[str] = None
    aud: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    jti: Optional[str] = None  # Added to fix missing jti attribute error
    type: Optional[str] = None  # Added for token type information


class TokenRefreshPatch:
    """
    This class contains methods to patch the token refresh functionality.
    """
    @staticmethod
    def create_refresh_token_fix(
        db, user_id, token_jti, expires_at, ip_address=None, user_agent=None,
        token=None, session_id=None
    ):
        """
        Modified version of create_refresh_token that handles both token
        and token_jti fields, and includes session_id for session management.
        """
        from app.models import RefreshToken
        
        # If token is not provided, generate a placeholder to satisfy
        # the NOT NULL constraint
        if token is None:
            token = f"token-{token_jti}"
        
        db_refresh_token = RefreshToken(
            user_id=user_id,
            token=token,
            token_jti=token_jti,
            expires_at=expires_at,
            created_at=datetime.datetime.utcnow(),
            revoked_at=None,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        db.add(db_refresh_token)
        db.commit()
        db.refresh(db_refresh_token)
        return db_refresh_token


def generate_jti():
    """
    Generate a unique JWT ID (jti) for token tracking.
    """
    return str(uuid.uuid4())
