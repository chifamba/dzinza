from fastapi import APIRouter, HTTPException, status, Depends, Response
from sqlalchemy.orm import Session
from typing import Dict
from config.database import get_db
from config.redis import get_redis
from models.user import User
from models.refresh_token import RefreshToken
from fastapi import Request
from utils.jwt import generate_access_token, generate_refresh_token, verify_token
from utils.password import hash_password, verify_password
import os
import redis
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(
    email: str,
    password: str,
    username: str = None,
    first_name: str = None,
    last_name: str = None,
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Register a new user.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # If username is provided, check if it already exists
    if username:
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken"
            )
    
    # Generate a default username if not provided
    if not username:
        username = email.split('@')[0]
        # Check if the default username exists
        count = 0
        temp_username = username
        while db.query(User).filter(User.username == temp_username).first():
            count += 1
            temp_username = f"{username}{count}"
        username = temp_username

    # Hash password and create new user
    hashed_password = hash_password(password)
    new_user = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        first_name=first_name,
        last_name=last_name,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully, verification email sent"}


@router.post("/login")
async def login(
    email: str,
    password: str,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> Dict[str, str]:
    """
    Authenticate a user and return access and refresh tokens.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Generate tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = generate_access_token(token_data)
    refresh_token, token_jti = generate_refresh_token(token_data)

    # Store refresh token in database
    refresh_token_expiry = datetime.utcnow() + timedelta(days=7)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        token_jti=token_jti,
        expires_at=refresh_token_expiry
    )
    db.add(db_refresh_token)
    db.commit()

    # Also store refresh token in Redis for quick revocation checks
    redis_client.setex(
        f"refresh_token:{refresh_token}",
        int(timedelta(days=7).total_seconds()),
        str(user.id)
    )

    # Set refresh token as a cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=os.getenv("NODE_ENV") == "production",
        samesite="strict",
        max_age=int(timedelta(days=7).total_seconds())
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> Dict[str, str]:
    """
    Refresh an access token using a refresh token.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    # Check Redis first for quick revocation check
    user_id = redis_client.get(f"refresh_token:{refresh_token}")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token"
        )

    # Verify token in database
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.revoked.is_(None),
        RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Verify token signature
    token_data = verify_token(refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Generate new tokens
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found or disabled"
        )

    new_token_data = {"sub": str(user.id), "email": user.email}
    new_access_token = generate_access_token(new_token_data)
    new_refresh_token, new_token_jti = generate_refresh_token(new_token_data)

    # Revoke old refresh token in database and Redis
    db_token.revoked = datetime.utcnow()
    db.commit()
    redis_client.delete(f"refresh_token:{refresh_token}")

    # Store new refresh token
    new_refresh_token_expiry = datetime.utcnow() + timedelta(days=7)
    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        token_jti=new_token_jti,
        expires_at=new_refresh_token_expiry
    )
    db.add(new_db_token)
    db.commit()

    redis_client.setex(
        f"refresh_token:{new_refresh_token}",
        int(timedelta(days=7).total_seconds()),
        str(user.id)
    )

    # Set new refresh token as cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=os.getenv("NODE_ENV") == "production",
        samesite="strict",
        max_age=int(timedelta(days=7).total_seconds())
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> Dict[str, str]:
    """
    Logout a user by revoking their refresh token.
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        # Revoke token in Redis
        redis_client.delete(f"refresh_token:{refresh_token}")

        # Revoke token in database
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token,
            RefreshToken.revoked.is_(None)
        ).first()
        if db_token:
            db_token.revoked = datetime.utcnow()
            db.commit()

    # Clear the cookie
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
