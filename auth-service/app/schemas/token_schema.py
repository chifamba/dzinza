import uuid
from typing import Optional, List
from pydantic import BaseModel, constr
from datetime import datetime

# Schema for JWT token response
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None # Include refresh token in the response
    token_type: str = "bearer"

# Schema for the data encoded in the JWT (the "sub" field and expiry)
class TokenPayload(BaseModel):
    sub: str  # User ID or email
    exp: Optional[int] = None # Expiry timestamp
    type: Optional[str] = None # "access" or "refresh"
    # Add any other custom claims you might have

# Schema for creating a refresh token in DB (internal)
class RefreshTokenCreate(BaseModel):
    token: str
    user_id: uuid.UUID
    expires_at: datetime

# Schema for refresh token response (if you ever need to return its details)
class RefreshTokenResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    expires_at: datetime
    created_at: datetime
    is_revoked: bool

    class Config:
        from_attributes = True

# Schema for MFA setup response
class MFASetupResponse(BaseModel):
    secret_key: str # The OTP secret key for the user to save
    otp_uri: str    # The otpauth:// URI for QR code generation

# Schema for MFA verification request
class MFAVerifyRequest(BaseModel):
    otp_code: constr(min_length=6, max_length=6) # Standard 6-digit OTP

# Schema for MFA disable request (if OTP is required to disable)
class MFADisableRequest(BaseModel):
    otp_code: constr(min_length=6, max_length=6)

# Schema for generating new backup codes (if implemented)
# class MFABackupCodesResponse(BaseModel):
#     backup_codes: List[str]
