"""Pydantic schemas for auth_service service."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID, uuid4

class User(BaseModel):
    id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    roles: Optional[List[str]] = []
    mfa_enabled: bool = False
    linked_accounts: Optional[List[dict]] = []

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GoogleLoginRequest(BaseModel):
    id_token: str

class FacebookLoginRequest(BaseModel):
    access_token: str

class AppleLoginRequest(BaseModel):
    id_token: str

class LinkedInLoginRequest(BaseModel):
    access_token: str

class SocialAccountLinkRequest(BaseModel):
    user_email: EmailStr
    provider: str  # e.g. "google", "facebook", "apple", "linkedin"
    provider_id: str  # unique id from the provider
    access_token: str

class Role(BaseModel):
    name: str
    permissions: list[str] = []

class EnableEmailMFARequest(BaseModel):
    email: EmailStr

class VerifyEmailMFARequest(BaseModel):
    email: EmailStr
    code: str

class EnableAppMFARequest(BaseModel):
    email: EmailStr

class VerifyAppMFARequest(BaseModel):
    email: EmailStr
    code: str

class EnableSMSMFARequest(BaseModel):
    email: EmailStr
    phone: str

class VerifySMSMFARequest(BaseModel):
    email: EmailStr
    code: str

class GenerateRecoveryCodesRequest(BaseModel):
    email: EmailStr

class RecoveryCodesResponse(BaseModel):
    codes: list[str]

class RegisterHardwareKeyRequest(BaseModel):
    email: EmailStr
    credential_data: dict

class AuthenticateHardwareKeyRequest(BaseModel):
    email: EmailStr
    assertion_data: dict

class HardwareKeyResponse(BaseModel):
    success: bool
    message: str

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
