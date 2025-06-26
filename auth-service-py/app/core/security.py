from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union

from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import ValidationError

from app.core.config import settings
# Placeholder for a potential TokenPayload schema, will define in schemas/token_schema.py
# from app.schemas.token_schema import TokenPayload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_REFRESH_SECRET_KEY = settings.JWT_REFRESH_SECRET_KEY


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, JWT_REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_token(token: str, secret_key: str) -> Optional[dict]:
    """
    Verifies a JWT token.
    Returns the payload if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        return payload
        # We might want to validate payload structure here using TokenPayload Pydantic model
        # token_data = TokenPayload(**payload) -> This validates structure
    except JWTError as e: # Catches expired signature, invalid signature, etc.
        # Log the error e.g. logger.error(f"JWT Error: {e}")
        return None
    except ValidationError: # If using Pydantic model validation for payload
        # Log the error
        return None
    return payload


# Placeholder for OTP generation and verification if needed for MFA
# For example, using pyotp
# import pyotp
# def generate_otp_secret():
#     return pyotp.random_base32()

# def generate_otp(secret: str) -> str:
#     totp = pyotp.TOTP(secret)
#     return totp.now()

# def verify_otp(secret: str, otp_code: str) -> bool:
#     totp = pyotp.TOTP(secret)
#     return totp.verify(otp_code)

# Placeholder for social token verification (e.g., Google, Facebook)
# These typically involve making an HTTP request to the provider's tokeninfo endpoint
# async def verify_google_token(token: str):
#     # Make request to Google's tokeninfo endpoint
#     pass

# async def verify_facebook_token(token: str):
#     # Make request to Facebook's debug_token endpoint
#     pass
