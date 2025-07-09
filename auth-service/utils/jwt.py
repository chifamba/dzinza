import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import jwt

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def generate_access_token(data: Dict[str, str]) -> str:
    """
    Generate an access token for the given data.
    
    Args:
        data: Dictionary containing user data to encode in the token.
    
    Returns:
        Encoded JWT access token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = str(uuid.uuid4())  # Generate a unique token ID
    to_encode.update({"exp": expire, "type": "access", "jti": jti})
    encoded_jwt = jwt.encode(
        to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM
    )
    return encoded_jwt


def generate_refresh_token(data: Dict[str, str]) -> Tuple[str, str]:
    """
    Generate a refresh token for the given data.
    
    Args:
        data: Dictionary containing user data to encode in the token.
    
    Returns:
        Tuple of (encoded JWT refresh token, token JTI).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())  # Generate a unique token ID
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
    encoded_jwt = jwt.encode(
        to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM
    )
    return encoded_jwt, jti


def verify_token(token: str) -> Optional[Dict[str, str]]:
    """
    Verify a JWT token and return the decoded data if valid.
    
    Args:
        token: JWT token to verify.
    
    Returns:
        Decoded token data if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
