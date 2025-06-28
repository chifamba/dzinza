from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta, datetime, timezone
import secrets # For generating secure random tokens

from app.core import security
from app.crud import user_crud
from app.db.database import get_db_session
from app.db.models.user_model import User
from app.schemas import user_schema
from app.services.email_service import send_password_reset_email_task # Placeholder
from app.dependencies.auth import get_current_active_user_dependency # Use the actual dependency

router = APIRouter()

from app.middleware.rate_limiter import get_forgot_password_limiter # Import limiter

# Dependency alias
ActiveUser = Depends(get_current_active_user_dependency)

@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED, dependencies=[get_forgot_password_limiter()])
async def request_password_reset(
    request_data: user_schema.PasswordResetRequest,
    db: AsyncSession = Depends(get_db_session)
):
    user = await user_crud.get_user_by_email(db, email=request_data.email)
    if user: # Only proceed if user exists, but don't reveal if user exists or not for security
        # Generate a secure, URL-safe token
        token = secrets.token_urlsafe(32)
        expires_delta = timedelta(hours=1) # Password reset links typically have short expiry
        expires_at = datetime.now(timezone.utc) + expires_delta

        await user_crud.set_password_reset_token(db, user=user, token=token, expires_at=expires_at)

        # In a real app, you'd construct a frontend URL with this token
        # reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        # await send_password_reset_email_task(user.email, reset_link) # Placeholder for email sending
        # For now, we are not sending email. The token would need to be communicated to user.
        print(f"Password reset token for {user.email}: {token}") # For debugging/testing

    # Always return a generic message to prevent email enumeration
    return {"message": "If an account with this email exists, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    reset_data: user_schema.PasswordResetConfirm,
    db: AsyncSession = Depends(get_db_session)
):
    # Find user by the reset token.
    # This requires adding a method to user_crud: get_user_by_password_reset_token
    # For now, let's assume a placeholder lookup.
    # user = await user_crud.get_user_by_password_reset_token(db, token=reset_data.token)

    # Temporary: Iterate to find user by token (inefficient, replace with direct DB query)
    all_users = await user_crud.get_users(db, limit=10000) # Adjust limit as needed, not for production
    user: Optional[User] = None
    for u in all_users:
        if u.password_reset_token == reset_data.token:
            user = u
            break

    if not user or user.password_reset_token != reset_data.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    if not user.password_reset_expires_at or user.password_reset_expires_at < datetime.now(timezone.utc):
        # Clear the expired token
        await user_crud.set_password_reset_token(db, user=user, token=None, expires_at=None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive.")

    await user_crud.update_user_password(db, user=user, new_password=reset_data.new_password)
    # Optionally, log out user from other sessions by revoking refresh tokens
    # await token_crud.revoke_all_user_refresh_tokens(db, user_id=user.id)
    return {"message": "Password has been reset successfully."}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: user_schema.PasswordChange,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = ActiveUser
):
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")

    if password_data.current_password == password_data.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be the same as the old password.")

    await user_crud.update_user_password(db, user=current_user, new_password=password_data.new_password)
    # Optionally, log out user from other sessions by revoking refresh tokens
    # await token_crud.revoke_all_user_refresh_tokens(db, user_id=current_user.id)
    return {"message": "Password changed successfully."}
