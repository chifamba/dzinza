import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user_model import User, UserRole
from app.schemas.user_schema import UserCreate, UserUpdate, AdminUserUpdate
from app.core.security import get_password_hash
from datetime import datetime, timezone

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_active=user_in.is_active, # Or True by default, set is_verified based on flow
        is_verified=user_in.is_verified, # Typically False by default, verified via email
        role=user_in.role
    )
    db.add(db_user)
    await db.flush() # Use flush to get ID before commit if needed, or commit is handled by get_db_session
    await db.refresh(db_user)
    return db_user

async def update_user(db: AsyncSession, user: User, user_in: Union[UserUpdate, AdminUserUpdate, Dict[str, Any]]) -> User:
    update_data = user_in if isinstance(user_in, dict) else user_in.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]: # For password changes via admin or other flows
        hashed_password = get_password_hash(update_data["password"])
        user.hashed_password = hashed_password
        del update_data["password"]

    if "email" in update_data and update_data["email"]:
        user.email = update_data["email"].lower()
        del update_data["email"] # Email is unique, handle with care

    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await db.execute(delete(User).where(User.id == user_id))
    # await db.commit() # Commit handled by get_db_session
    return result.rowcount > 0


async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

async def get_users_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one()

# Specific update operations
async def update_last_login(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(last_login_at=datetime.now(timezone.utc))
    )
    # await db.commit() # Commit handled by get_db_session

async def set_email_verification_token(db: AsyncSession, user: User, token: str, expires_at: datetime) -> User:
    user.email_verification_token = token
    user.email_verification_expires_at = expires_at
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def set_password_reset_token(db: AsyncSession, user: User, token: str, expires_at: datetime) -> User:
    user.password_reset_token = token
    user.password_reset_expires_at = expires_at
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def verify_user_email(db: AsyncSession, user: User) -> User:
    user.is_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def update_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = get_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def set_mfa_secret(db: AsyncSession, user: User, secret: Optional[str], enabled: bool) -> User:
    user.mfa_secret = secret
    user.mfa_enabled = enabled
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
