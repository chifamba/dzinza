"""
This module contains JWT encoding and decoding functions.
"""

import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union
import uuid

from app.config import settings


def encode_jwt(payload: Dict[str, Any], secret: str) -> str:
    """
    Encode a payload into a JWT token.
    
    Args:
        payload: The payload to encode
        secret: The secret key to use for encoding
        
    Returns:
        Encoded JWT token
    """
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str, secret: str) -> Dict[str, Any]:
    """
    Decode a JWT token.
    
    Args:
        token: The token to decode
        secret: The secret key used for encoding
        
    Returns:
        Decoded token payload
    """
    return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])


def generate_jti() -> str:
    """
    Generate a unique JWT ID (jti) for token tracking.
    
    Returns:
        A unique JTI string
    """
    return str(uuid.uuid4())
