from fastapi import FastAPI, Depends, Query, HTTPException, status, Path, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import jwt
import asyncpg

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("AuthService")

app.include_router(get_healthcheck_router("AuthService"))

security = HTTPBearer()

class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    preferred_language: Optional[str] = "en"
    timezone: Optional[str] = "UTC"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    isActive: bool
    isSuperuser: bool
    roles: List[str]
    emailVerified: bool
    mfaEnabled: bool
    lastLoginAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime
    preferences: Optional[Dict[str, Any]]

class AuthTokens(BaseModel):
    accessToken: str
    refreshToken: str
    expiresIn: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfaCode: Optional[str] = None

class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    tokens: AuthTokens
    requireMfa: Optional[bool] = False

class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    username: str
    preferredLanguage: Optional[str] = "en"

class MessageResponse(BaseModel):
    message: str

class RefreshTokenRequest(BaseModel):
    refreshToken: str

class RefreshTokenResponse(BaseModel):
    tokens: AuthTokens

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    try:
        payload = jwt.decode(credentials.credentials, "your_jwt_secret", algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return {"token": credentials.credentials, "user_id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

DATABASE_URL = "postgresql://dzinza_user:db_password@localhost:5432/dzinza_db"

async def get_db_pool():
    if not hasattr(app.state, "db_pool"):
        app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    return app.state.db_pool

@app.on_event("startup")
async def startup():
    await get_db_pool()

@app.on_event("shutdown")
async def shutdown():
    if hasattr(app.state, "db_pool"):
        await app.state.db_pool.close()

@app.post("/users/register", response_model=Dict[str, Any], status_code=201, tags=["Auth"])
async def register_user(
    body: RegisterRequest = Body(...),
):
    pool = await get_db_pool()
    user_id = uuid4()
    now = datetime.utcnow()
    query = """
        INSERT INTO users (id, email, username, first_name, last_name, preferred_language, timezone, password_hash, is_active, is_superuser, roles, email_verified, mfa_enabled, last_login_at, created_at, updated_at, preferences)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE, ARRAY['user'], FALSE, FALSE, NULL, $9, $9, '{}')
        RETURNING id, email, username, first_name, last_name, preferred_language, timezone, is_active, is_superuser, roles, email_verified, mfa_enabled, last_login_at, created_at, updated_at, preferences
    """
    # NOTE: Replace with real password hashing
    password_hash = body.password + "_hashed"
    async with pool.acquire() as conn:
        result = await conn.fetchrow(query, str(user_id), body.email, body.username, body.firstName, body.lastName, body.preferredLanguage, "UTC", password_hash, now)
    if not result:
        raise HTTPException(status_code=500, detail="User registration failed")
    user = dict(result)
    tokens = {
        "accessToken": "access_token_example",
        "refreshToken": "refresh_token_example",
        "expiresIn": 3600
    }
    return {"user": user, "tokens": tokens}

@app.post("/users/login", response_model=LoginResponse, tags=["Auth"])
async def login_user(
    body: LoginRequest = Body(...),
):
    pool = await get_db_pool()
    query = """
        SELECT * FROM users WHERE email = $1
    """
    async with pool.acquire() as conn:
        user = await conn.fetchrow(query, body.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # NOTE: Replace with real password verification
    if user["password_hash"] != body.password + "_hashed":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    tokens = AuthTokens(
        accessToken="access_token_example",
        refreshToken="refresh_token_example",
        expiresIn=3600
    )
    user_response = UserResponse(**user)
    return LoginResponse(message="Login successful", user=user_response, tokens=tokens, requireMfa=False)

@app.get("/users/{id}", response_model=UserResponse, tags=["Auth"])
async def get_user_profile(
    id: UUID = Path(..., description="User ID"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    query = "SELECT * FROM users WHERE id = $1"
    async with pool.acquire() as conn:
        user = await conn.fetchrow(query, str(id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@app.put("/users/{id}", response_model=UserResponse, tags=["Auth"])
async def update_user_profile(
    id: UUID = Path(..., description="User ID"),
    body: UserBase = Body(...),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    query = """
        UPDATE users SET email = $2, username = $3, first_name = $4, last_name = $5, preferred_language = $6, timezone = $7, updated_at = $8
        WHERE id = $1
        RETURNING *
    """
    now = datetime.utcnow()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(query, str(id), body.email, body.username, body.first_name, body.last_name, body.preferred_language, body.timezone, now)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@app.post("/tokens/refresh", response_model=RefreshTokenResponse, tags=["Auth"])
async def refresh_token(
    body: RefreshTokenRequest = Body(...),
):
    # NOTE: Replace with real refresh token validation and generation
    tokens = AuthTokens(
        accessToken="access_token_example",
        refreshToken="refresh_token_example",
        expiresIn=3600
    )
    return RefreshTokenResponse(tokens=tokens)

@app.post("/users/{id}/verify-email", response_model=MessageResponse, tags=["Auth"])
async def verify_email(
    id: UUID = Path(..., description="User ID"),
    body: Dict[str, str] = Body(...),
):
    # NOTE: Replace with real email verification logic
    token = body.get("token")
    if not token or token != "valid_token_example":
        raise HTTPException(status_code=400, detail="Invalid verification token")
    return MessageResponse(message="Email verified successfully")
