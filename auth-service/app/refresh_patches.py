"""
This module contains patches for the token refresh functionality.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any

from app import models, schemas, utils
from app.config import settings

# Store the original function reference before patching
_original_create_refresh_token = None

def create_refresh_token_with_jti(subject: Dict[str, Any], jti: Optional[str] = None, 
                                 expires_delta: Optional[timedelta] = None) -> Tuple[str, str]:
    """
    Create a refresh token with JTI.
    
    Args:
        subject: The subject claims for the token
        jti: JWT ID (optional, will generate if not provided)
        expires_delta: Optional expiration time delta
        
    Returns:
        Tuple of (refresh_token, jti)
    """
    if jti is None:
        jti = str(uuid.uuid4())
        
    # Use the original create_refresh_token function from utils
    if _original_create_refresh_token:
        token = _original_create_refresh_token(subject, jti, expires_delta)
    else:
        # Fallback to the current implementation in utils
        from jose import jwt
        
        if expires_delta:
            expire = datetime.now() + expires_delta
        else:
            expire = datetime.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode = {
            "exp": expire,
            "sub": str(subject.get("user_id", subject)), 
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "jti": jti,
            "type": "refresh"
        }
        if isinstance(subject, dict) and "user_id" in subject:
            to_encode["user_id"] = str(subject["user_id"])

        token = jwt.encode(to_encode, settings.ASSEMBLED_JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    return token, jti

def decode_refresh_token(token: str) -> Optional[schemas.TokenPayload]:
    """
    Decode and validate a refresh token.
    
    Args:
        token: The refresh token to decode
        
    Returns:
        TokenPayload if valid, None otherwise
    """
    return utils.decode_token(token, settings.ASSEMBLED_JWT_REFRESH_SECRET)

def apply_refresh_token_patches():
    """Apply the patches to fix refresh token functionality"""
    global _original_create_refresh_token
    # Store the original function reference
    _original_create_refresh_token = utils.create_refresh_token
    
    # Replace the original functions with our patched versions
    utils.create_refresh_token = create_refresh_token_with_jti
    utils.decode_refresh_token = decode_refresh_token
