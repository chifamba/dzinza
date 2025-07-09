"""
This module contains a patch for the refresh token endpoint.
"""

from fastapi import Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import uuid

from app import crud, schemas, utils
from app.database import get_db
from app.config import settings


async def refresh_token_patched(
    response: Response,
    request: Request,
    refresh_token_data: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Patched refresh token endpoint that handles JTI correctly.
    """
    token = refresh_token_data.refreshToken
    token_payload = utils.decode_refresh_token(token)
    
    if not token_payload or not token_payload.user_id or not token_payload.jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token (payload error)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find token in database
    db_refresh_token = crud.get_refresh_token_by_jti(db, token_jti=token_payload.jti)
    if not db_refresh_token:
        # Token not found by JTI, try to find by token string for compatibility
        try:
            db_refresh_token = db.query(schemas.models.RefreshToken).filter(
                schemas.models.RefreshToken.token == token,
                schemas.models.RefreshToken.revoked_at == None,
                schemas.models.RefreshToken.expires_at > datetime.utcnow()
            ).first()
        except Exception:
            # If token string lookup fails, continue with the normal flow
            pass
    
    if not db_refresh_token or str(db_refresh_token.user_id) != token_payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token (db validation failed)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user
    user = crud.get_user(db, user_id=db_refresh_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )

    # Create new refresh token
    new_refresh_jti = utils.generate_jti()
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_refresh_token, _ = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=new_refresh_jti,
        expires_delta=refresh_token_expires_delta
    )

    # Revoke old token
    db_refresh_token.revoked_at = datetime.utcnow()
    db.commit()

    # Store new refresh token
    crud.create_refresh_token(
        db,
        user_id=user.id,
        token_jti=new_refresh_jti,
        token=new_refresh_token,
        expires_at=datetime.utcnow() + refresh_token_expires_delta,
        ip_address=request.client.host if request and hasattr(request, 'client') else None,
        user_agent=request.headers.get("User-Agent", "unknown") if request else None
    )

    # Set tokens in cookies
    response.set_cookie(
        key="access_token_cookie",
        value=new_access_token,
        httponly=True,
        max_age=int(access_token_expires.total_seconds()),
        samesite="lax",
        secure=not settings.DEBUG
    )
    response.set_cookie(
        key="refresh_token_cookie",
        value=new_refresh_token,
        httponly=True,
        max_age=int(refresh_token_expires_delta.total_seconds()),
        samesite="lax",
        secure=not settings.DEBUG
    )

    # Return new tokens
    return schemas.AuthTokens(
        accessToken=new_access_token,
        refreshToken=new_refresh_token,
        expiresIn=int(access_token_expires.total_seconds())
    )


def apply_refresh_endpoint_patch():
    """Apply the patch to fix the refresh token endpoint"""
    from app.api_v1.endpoints import auth
    # Replace the original refresh endpoint with our patched version
    auth.refresh_access_token = refresh_token_patched
