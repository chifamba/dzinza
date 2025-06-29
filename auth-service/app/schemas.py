import datetime
import uuid
from pydantic import BaseModel, EmailStr, constr, validator, Field
from typing import Optional, List
from .models import UserRole, AuditLogAction # Import enums from models

# Base Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int # seconds
    refresh_token: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None
    iss: Optional[str] = None
    aud: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

class RefreshTokenPayload(TokenPayload):
    jti: str

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    preferred_language: Optional[str] = Field("en", max_length=10)
    timezone: Optional[str] = Field("UTC", max_length=50)

class UserCreate(UserBase):
    password: constr(min_length=8)

    @validator('password')
    def validate_password_strength(cls, v):
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char in '!@#$%^&*()_+-=[]{};\':",./<>?`~' for char in v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserUpdate(UserBase):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    preferred_language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    is_superuser: bool
    role: UserRole
    email_verified: bool
    mfa_enabled: bool
    last_login_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class UserPublicResponse(BaseModel):
    id: uuid.UUID
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True

# Auth Schemas
class LoginRequest(BaseModel): # Changed from OAuth2PasswordRequestForm to Pydantic model
    email: EmailStr # 'username' in OAuth2PasswordRequestForm, mapping to email
    password: str
    mfa_code: Optional[str] = Field(None, min_length=6, max_length=6)

class RegisterRequest(UserCreate):
    pass

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: constr(min_length=8)

    @validator('new_password')
    def validate_new_password_strength(cls, v):
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char in '!@#$%^&*()_+-=[]{};\':",./<>?`~' for char in v):
            raise ValueError('Password must contain at least one special character')
        return v

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: constr(min_length=8)

    @validator('new_password')
    def validate_new_password_strength(cls, v):
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char in '!@#$%^&*()_+-=[]{};\':",./<>?`~' for char in v):
            raise ValueError('Password must contain at least one special character')
        return v

class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationConfirmRequest(BaseModel):
    token: str

# MFA Schemas
class MFAEnableRequest(BaseModel):
    pass

class MFAEnableResponse(BaseModel):
    otp_secret: str
    otp_auth_url: str

class MFAVerifyRequest(BaseModel): # Used for verifying the code during *enablement*
    mfa_code: constr(min_length=6, max_length=6)
    # temp_otp_secret is no longer needed as server retrieves it from pending_mfa_secret

class MFASetupCompleteResponse(BaseModel): # New response model for successful MFA setup
    message: str
    backup_codes: List[str] # Plaintext backup codes, shown ONCE to the user.

class MFADisableRequest(BaseModel):
    password: Optional[str] = None
    mfa_code: Optional[str] = Field(None, min_length=6, max_length=6)


class MFARecoveryCodesResponse(BaseModel):
    recovery_codes: List[str]
    message: str

# Refresh Token Schemas
class RefreshTokenCreate(BaseModel):
    user_id: uuid.UUID
    token_jti: str
    expires_at: datetime.datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: AuditLogAction
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    user_id: Optional[uuid.UUID] = None

class AuditLogResponse(AuditLogBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[EmailStr] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# Generic Message Schema
class MessageResponse(BaseModel):
    message: str

# Social Login Schemas
class SocialLoginRequest(BaseModel):
    provider: str
    token: str

# Admin schemas
class AdminUserUpdateRequest(UserUpdate):
    is_active: Optional[bool] = None
    email_verified: Optional[bool] = None
    mfa_enabled: Optional[bool] = None
    role: Optional[UserRole] = None
    locked_until: Optional[datetime.datetime] = None

class AdminUserCreateRequest(UserCreate):
    email_verified: Optional[bool] = False
    is_active: Optional[bool] = True
    role: Optional[UserRole] = UserRole.USER
    send_welcome_email: Optional[bool] = True
