"""Request handlers for auth_service service."""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas
from typing import List
from uuid import uuid4
from passlib.hash import bcrypt
import jwt
from datetime import datetime, timedelta
import requests
import os
from .config import JWT_SECRET

router = APIRouter()
JWT_ALGORITHM = "HS256"

# In-memory storage for MFA codes and login attempts, can be moved to Redis in production
email_mfa_codes = {}
app_mfa_secrets = {}
sms_mfa_codes = {}
recovery_codes = {}
hardware_keys = {}
login_attempts = {}

def create_jwt(user_id: str, expires_delta: timedelta):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + expires_delta
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a digit")
    if not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a special character")

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    validate_password(payload.password)
    hashed_password = bcrypt.hash(payload.password)
    db_user = models.User(
        email=payload.email,
        password_hash=hashed_password,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    attempts = login_attempts.get(payload.email, [])
    attempts = [t for t in attempts if (now - t).total_seconds() < 600]
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.password_hash or not bcrypt.verify(payload.password, user.password_hash):
        attempts.append(now)
        login_attempts[payload.email] = attempts
        raise HTTPException(status_code=401, detail="Invalid credentials")

    login_attempts[payload.email] = []
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh_token", response_model=schemas.TokenResponse)
def refresh_token(token: str, db: Session = Depends(get_db)):
    blacklisted = db.query(models.TokenBlacklist).filter(models.TokenBlacklist.token == token).first()
    if blacklisted:
        raise HTTPException(status_code=401, detail="Token blacklisted")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_jwt(user_id, timedelta(minutes=30))
    new_refresh_token = create_jwt(user_id, timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=new_refresh_token)

@router.post("/blacklist_token")
def blacklist_token(token: str, db: Session = Depends(get_db)):
    db_token = models.TokenBlacklist(token=token)
    db.add(db_token)
    db.commit()
    return {"message": "Token blacklisted"}

def get_user_by_email(email: str, db: Session):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/enable_email_mfa")
def enable_email_mfa(payload: schemas.EnableEmailMFARequest, db: Session = Depends(get_db)):
    user = get_user_by_email(payload.email, db)
    import random
    code = f"{random.randint(100000, 999999)}"
    email_mfa_codes[payload.email] = code
    print(f"Email MFA code for {payload.email}: {code}")
    return {"message": f"MFA code sent to {payload.email}"}

@router.post("/verify_email_mfa")
def verify_email_mfa(payload: schemas.VerifyEmailMFARequest, db: Session = Depends(get_db)):
    user = get_user_by_email(payload.email, db)
    code = email_mfa_codes.get(payload.email)
    if not code or code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid MFA code")
    user.mfa_enabled = True
    db.commit()
    del email_mfa_codes[payload.email]
    return {"message": f"Email MFA enabled for {payload.email}"}

def find_or_create_social_user(email: str, db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.post("/login/google", response_model=schemas.TokenResponse)
def login_google(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    from .config import GOOGLE_CLIENT_ID
    resp = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": payload.id_token})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google ID token")
    data = resp.json()
    if data.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid Google client ID")
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account missing email")

    user = find_or_create_social_user(email, db)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)

# ... Placeholder implementations for other social logins
@router.post("/login/facebook", response_model=schemas.TokenResponse)
def login_facebook(payload: schemas.FacebookLoginRequest, db: Session = Depends(get_db)):
    # This is a placeholder and would need a real implementation
    email = "user@example.com" # Dummy email
    user = find_or_create_social_user(email, db)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login/apple", response_model=schemas.TokenResponse)
def login_apple(payload: schemas.AppleLoginRequest, db: Session = Depends(get_db)):
    # This is a placeholder and would need a real implementation
    email = "user@example.com" # Dummy email
    user = find_or_create_social_user(email, db)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login/linkedin", response_model=schemas.TokenResponse)
def login_linkedin(payload: schemas.LinkedInLoginRequest, db: Session = Depends(get_db)):
    # This is a placeholder and would need a real implementation
    email = "user@example.com" # Dummy email
    user = find_or_create_social_user(email, db)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/deactivate_account")
def deactivate_account(email: str, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    user.is_active = False
    db.commit()
    return {"message": f"Account deactivated for {email}"}

@router.post("/assign_role")
def assign_role(email: str, role_name: str, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if not role:
        role = models.Role(name=role_name)
        db.add(role)
    if role not in user.roles:
        user.roles.append(role)
        db.commit()
    return {"message": f"Role {role_name} assigned to {email}"}

@router.post("/revoke_role")
def revoke_role(email: str, role_name: str, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role and role in user.roles:
        user.roles.remove(role)
        db.commit()
        return {"message": f"Role {role_name} revoked from {email}"}
    raise HTTPException(status_code=404, detail="Role not found or not assigned to user")

@router.get("/users/{user_id}", response_model=schemas.User)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: str, payload: schemas.UserUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.first_name = payload.first_name
    user.last_name = payload.last_name
    db.commit()
    db.refresh(user)
    return user

@router.post("/delete_account")
def delete_account(email: str, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    db.delete(user)
    db.commit()
    return {"message": f"Account deleted for {email}"}
