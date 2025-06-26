import uuid
from typing import Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.token_model import RefreshToken
from app.schemas.token_schema import RefreshTokenCreate
from datetime import datetime, timezone

async def create_refresh_token(db: AsyncSession, token_in: RefreshTokenCreate, user_id: uuid.UUID) -> RefreshToken:
    db_token = RefreshToken(
        token=token_in.token,
        user_id=user_id, # Ensure user_id is passed correctly
        expires_at=token_in.expires_at
    )
    db.add(db_token)
    await db.flush()
    await db.refresh(db_token)
    return db_token

async def get_refresh_token(db: AsyncSession, token: str) -> Optional[RefreshToken]:
    """Fetches a non-revoked refresh token by its token string."""
    result = await db.execute(
        select(RefreshToken).filter(RefreshToken.token == token, RefreshToken.is_revoked == False)
    )
    return result.scalars().first()

async def get_refresh_token_by_user_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[RefreshToken]:
    """
    Fetches the latest non-revoked refresh token for a user.
    This might be useful if you only allow one active refresh token per user.
    Adjust logic if multiple concurrent refresh tokens are allowed.
    """
    result = await db.execute(
        select(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
        .order_by(RefreshToken.created_at.desc()) # Get the most recent one
    )
    return result.scalars().first()


async def revoke_refresh_token(db: AsyncSession, token_id: uuid.UUID) -> bool:
    """Revokes a specific refresh token by its ID."""
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.id == token_id)
        .values(is_revoked=True, updated_at=datetime.now(timezone.utc)) # Assuming an updated_at field
    )
    # await db.commit() # Handled by session dependency
    return result.rowcount > 0

async def revoke_refresh_token_by_token_string(db: AsyncSession, token: str) -> bool:
    """Revokes a specific refresh token by its token string."""
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token == token)
        .values(is_revoked=True, updated_at=datetime.now(timezone.utc))
    )
    return result.rowcount > 0

async def revoke_all_user_refresh_tokens(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Revokes all active refresh tokens for a specific user."""
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
        .values(is_revoked=True, updated_at=datetime.now(timezone.utc))
    )
    # await db.commit() # Handled by session dependency
    return result.rowcount

async def prune_expired_refresh_tokens(db: AsyncSession) -> int:
    """Deletes refresh tokens that are expired or already revoked."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        delete(RefreshToken)
        .where((RefreshToken.expires_at < now) | (RefreshToken.is_revoked == True))
    )
    # await db.commit() # Handled by session dependency
    return result.rowcount

async def is_refresh_token_revoked(db: AsyncSession, token: str) -> bool:
    """Checks if a specific refresh token (by string) has been revoked."""
    result = await db.execute(
        select(RefreshToken.is_revoked).filter(RefreshToken.token == token)
    )
    is_revoked_status = result.scalar_one_or_none()
    return is_revoked_status if is_revoked_status is not None else True # Treat non-existent as revoked/invalid
