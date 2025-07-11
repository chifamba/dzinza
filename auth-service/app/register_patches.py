"""
This module contains patches for the registration functionality to ensure username handling is correct.
"""

from pydantic import BaseModel, EmailStr, constr, validator, Field
from typing import Optional
from app.models import UserRole


class RegisterRequestPatch(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: constr(min_length=8)
    username: Optional[str] = None  # Added missing username field
    preferredLanguage: str = "en"

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


def generate_username_from_email(email: str) -> str:
    """
    Generate a username from email address by taking the part before @.
    This is a helper function to ensure usernames are available.
    """
    return email.split('@')[0]


def apply_register_request_patch():
    """Apply the patches to fix registration functionality"""
    from app import schemas
    # Replace the RegisterRequest class with our patched version
    schemas.RegisterRequest = RegisterRequestPatch
