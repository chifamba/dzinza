import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr, constr, validator
from datetime import datetime

from app.db.models.user_model import UserRole # For role validation

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[constr(min_length=1, max_length=50)] = None
    last_name: Optional[constr(min_length=1, max_length=50)] = None
    is_active: bool = True
    is_verified: bool = False
    role: UserRole = UserRole.USER

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: constr(min_length=8)

# Properties to receive via API on update
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[constr(min_length=1, max_length=50)] = None
    last_name: Optional[constr(min_length=1, max_length=50)] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None # Usually admin controlled or via verification flow
    role: Optional[UserRole] = None # Admin controlled

# Properties to return to client (general public, sensitive info removed)
class UserPublicResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True # orm_mode = True for Pydantic v1

# Properties to return to client (including more details, for authenticated user or admin)
class UserResponse(UserPublicResponse):
    is_active: bool
    is_verified: bool
    mfa_enabled: bool

    class Config:
        from_attributes = True

# Properties for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Properties for user object stored in DB (includes hashed_password)
# This is more for internal use or if you need to map directly from the DB model
class UserWithSensitiveInfo(UserBase):
    id: uuid.UUID
    hashed_password: str
    mfa_secret: Optional[str] = None
    mfa_enabled: bool = False
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schemas for password operations
class PasswordChange(BaseModel):
    current_password: str
    new_password: constr(min_length=8)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: constr(min_length=8)

# Schemas for email verification
class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationConfirm(BaseModel):
    token: str

# Admin User Update (potentially more fields than regular UserUpdate)
class AdminUserUpdate(UserUpdate):
    mfa_enabled: Optional[bool] = None # Admin can toggle MFA for user
    # any other admin-specific fields

# User list response for admin
class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int
