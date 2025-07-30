from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import jwt
import asyncpg
import os
from passlib.context import CryptContext

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment Variables & Constants ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# --- FastAPI App Initialization ---
app = FastAPI(
    title="FamilyTree Auth Service",
    description="API for user authentication, registration, and authorization.",
    version="1.0.0"
)
logger = setup_logging("AuthService")
app.include_router(get_healthcheck_router("AuthService"))

# --- Security & Hashing ---
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Pydantic Models ---
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    preferred_language: str = "en"
    timezone: str = "UTC"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    is_active: bool = Field(alias="isActive")
    is_superuser: bool = Field(alias="isSuperuser")
    roles: List[str]
    email_verified: bool = Field(alias="emailVerified")
    mfa_enabled: bool = Field(alias="mfaEnabled")
    last_login_at: Optional[datetime] = Field(alias="lastLoginAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    preferences: Optional[Dict[str, Any]]

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

class AuthTokens(BaseModel):
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    expires_in: int = Field(alias="expiresIn")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: Optional[str] = Field(None, alias="mfaCode")

class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    tokens: AuthTokens
    require_mfa: bool = Field(False, alias="requireMfa")

class RegisterRequest(BaseModel):
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    email: EmailStr
    password: str
    username: str
    preferred_language: str = Field("en", alias="preferredLanguage")

class MessageResponse(BaseModel):
    message: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(alias="refreshToken")

# --- JWT & Auth Functions ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def create_auth_tokens(user_id: UUID, roles: List[str]) -> AuthTokens:
    access_token = create_access_token(data={"sub": str(user_id), "roles": roles})
    refresh_token = create_refresh_token(data={"sub": str(user_id)})
    return AuthTokens(
        accessToken=access_token,
        refreshToken=refresh_token,
        expiresIn=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
        return {"user_id": UUID(user_id), "roles": payload.get("roles", [])}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

def require_role(role: str):
    def role_checker(user: dict = Depends(get_current_user)):
        if role not in user.get("roles", []):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires '{role}' role")
        return user
    return role_checker

# --- Database Pool ---
@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

async def get_db_pool():
    return app.state.db_pool

# --- API Endpoints ---
@app.post("/users/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register_user(req: RegisterRequest, pool: asyncpg.Pool = Depends(get_db_pool)):
    hashed_password = pwd_context.hash(req.password)
    now = datetime.utcnow()
    query = """
        INSERT INTO users (id, email, username, first_name, last_name, preferred_language, timezone, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'UTC', $7, $8, $8)
        RETURNING *
    """
    try:
        user_record = await pool.fetchrow(
            query, uuid4(), req.email, req.username, req.first_name, req.last_name, req.preferred_language, hashed_password, now
        )
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status.HTTP_409_CONFLICT, "User with this email or username already exists")

    user = UserResponse.from_orm(user_record)
    tokens = create_auth_tokens(user.id, user.roles)
    return LoginResponse(message="User registered successfully", user=user, tokens=tokens)

@app.post("/users/login", response_model=LoginResponse)
async def login_user(req: LoginRequest, pool: asyncpg.Pool = Depends(get_db_pool)):
    user_record = await pool.fetchrow("SELECT * FROM users WHERE email = $1", req.email)
    if not user_record or not pwd_context.verify(req.password, user_record['password_hash']):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    user = UserResponse.from_orm(user_record)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")

    # MFA logic would go here. For now, we assume it's not required.

    await pool.execute("UPDATE users SET last_login_at = $1 WHERE id = $2", datetime.utcnow(), user.id)

    tokens = create_auth_tokens(user.id, user.roles)
    return LoginResponse(message="Login successful", user=user, tokens=tokens)

@app.get("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(get_current_user)])
async def get_user_profile(user_id: UUID, pool: asyncpg.Pool = Depends(get_db_pool)):
    user_record = await pool.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if not user_record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserResponse.from_orm(user_record)

@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user_profile(user_id: UUID, req: UserBase, current_user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    if user_id != current_user['user_id'] and "admin" not in current_user['roles']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot update another user's profile")

    query = """
        UPDATE users SET email = $1, username = $2, first_name = $3, last_name = $4, preferred_language = $5, timezone = $6, updated_at = $7
        WHERE id = $8 RETURNING *
    """
    try:
        updated_user = await pool.fetchrow(
            query, req.email, req.username, req.first_name, req.last_name, req.preferred_language, req.timezone, datetime.utcnow(), user_id
        )
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username is already taken")

    if not updated_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserResponse.from_orm(updated_user)

@app.post("/tokens/refresh", response_model=AuthTokens)
async def refresh_token(req: RefreshTokenRequest, pool: asyncpg.Pool = Depends(get_db_pool)):
    try:
        payload = jwt.decode(req.refresh_token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = UUID(payload.get("sub"))
        user = await pool.fetchrow("SELECT roles FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
        return create_auth_tokens(user_id, user['roles'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

@app.post("/users/{user_id}/verify-email", response_model=MessageResponse)
async def verify_email(user_id: UUID, token: str = Body(..., embed=True), pool: asyncpg.Pool = Depends(get_db_pool)):
    # This is a placeholder. Real implementation would use a secure, single-use token
    # stored in the database or cache with an expiry.
    if token != "valid_verification_token":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification token")

    await pool.execute("UPDATE users SET email_verified = TRUE WHERE id = $1", user_id)
    return MessageResponse(message="Email verified successfully")
