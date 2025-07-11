"""
This module contains a patch for the register endpoint to ensure username is correctly set.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from app import crud, schemas, utils
from app.database import get_db
from app.config import settings
from app.register_patches import generate_username_from_email


async def register_user_patched(user_in: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """
    Patched register user endpoint that handles username field properly.
    """
    # Map frontend field names to backend expected field names
    user_in_dict = user_in.dict()
    user_in_dict['first_name'] = user_in_dict.pop('firstName')
    user_in_dict['last_name'] = user_in_dict.pop('lastName')
    user_in_dict['preferred_language'] = user_in_dict.pop('preferredLanguage')
    
    # Generate username from email if not provided
    if not user_in_dict.get('username'):
        base_username = generate_username_from_email(user_in.email)
        # Check if username exists and generate a unique one if needed
        count = 0
        username = base_username
        while crud.get_user_by_username(db, username=username):
            count += 1
            username = f"{base_username}{count}"
        user_in_dict['username'] = username
    
    adjusted_user_in = schemas.UserCreate(**user_in_dict)

    db_user_by_email = crud.get_user_by_email(db, email=adjusted_user_in.email)
    if db_user_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Check if username already exists
    if adjusted_user_in.username:
        db_user_by_username = crud.get_user_by_username(db, username=adjusted_user_in.username)
        if db_user_by_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken.",
            )

    # Create the user
    user = crud.create_user(db=db, user=adjusted_user_in)
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    refresh_jti = utils.generate_jti()
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token, _ = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=refresh_jti,
        expires_delta=refresh_token_expires_delta
    )
    
    # Store refresh token
    crud.create_refresh_token(
        db,
        user_id=user.id,
        token_jti=refresh_jti,
        expires_at=datetime.utcnow() + refresh_token_expires_delta,
        ip_address="mock_ip",
        user_agent="mock_ua",
        token=refresh_token
    )
    
    # Return response
    tokens = schemas.AuthTokens(
        accessToken=access_token,
        refreshToken=refresh_token,
        expiresIn=int(access_token_expires.total_seconds())
    )
    
    return schemas.LoginResponse(
        message="Registration successful",
        user=schemas.UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            preferred_language=user.preferred_language,
            isActive=user.is_active,
            isSuperuser=user.role == schemas.UserRole.ADMIN,
            roles=[user.role.value] if user.role else [],
            emailVerified=user.email_verified,
            mfaEnabled=user.mfa_enabled if hasattr(user, 'mfa_enabled') else False,
            lastLoginAt=user.last_login_at if hasattr(user, 'last_login_at') else None,
            createdAt=user.created_at if hasattr(user, 'created_at') else datetime.utcnow(),
            updatedAt=user.updated_at if hasattr(user, 'updated_at') else datetime.utcnow()
        ),
        tokens=tokens
    )


def apply_register_endpoint_patch():
    """Apply the patch to fix the register endpoint"""
    from app.api_v1.endpoints import auth
    # Replace the original register endpoint with our patched version
    auth.register_user = register_user_patched
