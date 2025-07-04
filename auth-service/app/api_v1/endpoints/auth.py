from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm # For standard login form
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import uuid
import pyotp
from typing import Optional

from app import crud, models, schemas, utils
from app.database import get_db
from app.config import settings
from app.dependencies import get_current_user, get_current_active_user # Will create this

router = APIRouter()

@router.post("/register", response_model=schemas.LoginResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Checks if email or username already exists.
    - Hashes the password.
    - Creates the user in the database.
    - Sends a verification email (mocked for now).
    - Returns user data and tokens for immediate login.
    """
    # Map frontend field names to backend expected field names
    user_in_dict = user_in.dict()
    user_in_dict['first_name'] = user_in_dict.pop('firstName')
    user_in_dict['last_name'] = user_in_dict.pop('lastName')
    user_in_dict['preferred_language'] = user_in_dict.pop('preferredLanguage')
    adjusted_user_in = schemas.UserCreate(**user_in_dict)

    db_user_by_email = crud.get_user_by_email(db, email=adjusted_user_in.email)
    if db_user_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    user = crud.create_user(db=db, user=adjusted_user_in)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    refresh_jti = utils.generate_jti()
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=refresh_jti,
        expires_delta=refresh_token_expires_delta
    )
    crud.create_refresh_token(
        db,
        user_id=user.id,
        token_jti=refresh_jti,
        expires_at=datetime.utcnow() + refresh_token_expires_delta,
        ip_address="mock_ip",
        user_agent="mock_ua"
    )
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

    # Send verification email
    # verification_token = crud.set_email_verification_token(db, db_user=user)
    # await utils.send_verification_email(user.email, user.first_name or "User", verification_token)
    # For now, this step is simplified. Full implementation would generate and send token.

    # For immediate login after registration (optional, common pattern)
    # access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # access_token = utils.create_access_token(
    #     subject={"user_id": user.id, "email": user.email, "role": user.role.value},
    #     expires_delta=access_token_expires
    # )
    # refresh_jti = utils.generate_jti()
    # refresh_token = utils.create_refresh_token(subject={"user_id": user.id}, jti=refresh_jti)
    # crud.create_refresh_token(
    #     db, user_id=user.id, token_jti=refresh_jti,
    #     expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    #     ip_address=None, # TODO: Get IP from request
    #     user_agent=None # TODO: Get User-Agent from request
    # )
    # return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token, "user": user}

    # For now, just return user info. Login should be a separate step.
    return user


@router.post("/login", response_model=schemas.LoginResponse)
async def login_for_access_token(
    request: Request,
    response: Response, # To set cookies
    login_data: schemas.LoginRequest, # Use Pydantic model for request body
    db: Session = Depends(get_db)  # To get IP and User-Agent
):
    """
    Authenticate user and return JWT tokens along with user data.
    Now uses a JSON body defined by schemas.LoginRequest.
    Includes MFA check if enabled for the user.
    """
    user = crud.get_user_by_email(db, email=login_data.email)

    if not user or not utils.verify_password(login_data.password, user.password_hash):
        if user: # Only increment if user exists but password was wrong
            crud.increment_failed_login_attempts(db, user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive.")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # 403 Forbidden as account is locked
            detail=f"Account is temporarily locked. Please try again after {user.locked_until.isoformat()}.",
        )

    # MFA Check
    if user.mfa_enabled:
        if not login_data.mfaCode:
            return schemas.LoginResponse(
                message="MFA required",
                requireMfa=True,
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
                )
            )

        if not user.mfa_secret: # Should not happen if mfa_enabled is true
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="MFA configuration error.")

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(login_data.mfaCode):
            # Primary TOTP failed, try as a backup code
            if not crud.verify_and_consume_backup_code(db, db_user=user, backup_code_plain=login_data.mfaCode):
                # Both TOTP and backup code failed
                crud.increment_failed_login_attempts(db, user)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code or backup code.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value}, # Ensure role is string
        expires_delta=access_token_expires
    )

    refresh_jti = utils.generate_jti()
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=refresh_jti,
        expires_delta=refresh_token_expires_delta
    )

    crud.create_refresh_token(
        db,
        user_id=user.id,
        token_jti=refresh_jti,
        expires_at=datetime.utcnow() + refresh_token_expires_delta,
        ip_address=request.client.host,
        user_agent=request.headers.get("User-Agent", "unknown")
    )

    crud.update_last_login(db, db_user=user, ip_address=request.client.host)

    # Set tokens in HTTPOnly cookies (more secure for web clients)
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=True,
        max_age=int(access_token_expires.total_seconds()),
        samesite="lax", # or "strict"
        secure=not settings.DEBUG # True in production (HTTPS)
    )
    response.set_cookie(
        key="refresh_token_cookie",
        value=refresh_token,
        httponly=True,
        max_age=int(refresh_token_expires_delta.total_seconds()),
        samesite="lax",
        secure=not settings.DEBUG
    )

    tokens = schemas.AuthTokens(
        accessToken=access_token,
        refreshToken=refresh_token,
        expiresIn=int(access_token_expires.total_seconds())
    )
    return schemas.LoginResponse(
        message="Login successful",
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

@router.post("/refresh", response_model=schemas.AuthTokens)
async def refresh_access_token(
    response: Response,
    refresh_token_data: schemas.RefreshTokenRequest, # Expect refresh token in body
    db: Session = Depends(get_db)
):
    """
    Refresh an access token using a valid refresh token.
    """
    token_payload = utils.decode_token(refresh_token_data.refreshToken, settings.ASSEMBLED_JWT_REFRESH_SECRET)
    if not token_payload or not token_payload.user_id or not token_payload.jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token (payload error)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db_refresh_token = crud.get_refresh_token_by_jti(db, token_jti=token_payload.jti)
    if not db_refresh_token or db_refresh_token.user_id != uuid.UUID(token_payload.user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token (db validation failed)",
            headers={"WWW-Authenticate": "Bearer"},
        )

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

    # For simplicity, reuse existing refresh token until it expires.
    refreshed_token_to_return = refresh_token_data.refreshToken

    response.set_cookie(
        key="access_token_cookie",
        value=new_access_token,
        httponly=True,
        max_age=int(access_token_expires.total_seconds()),
        samesite="lax",
        secure=not settings.DEBUG
    )

    return schemas.AuthTokens(
        accessToken=new_access_token,
        refreshToken=refreshed_token_to_return,
        expiresIn=int(access_token_expires.total_seconds())
    )


@router.post("/logout", response_model=schemas.MessageResponse)
async def logout_user(
    response: Response,
    # current_user: models.User = Depends(get_current_active_user), # Optional: ensure user is active
    refresh_token_data: Optional[schemas.RefreshTokenRequest] = None, # Client can send refresh token to invalidate
    db: Session = Depends(get_db)
):
    """
    Logout user.
    Invalidates the refresh token if provided.
    Clears HTTPOnly cookies.
    """
    if refresh_token_data and refresh_token_data.refresh_token:
        token_payload = utils.decode_token(refresh_token_data.refresh_token, settings.ASSEMBLED_JWT_REFRESH_SECRET)
        if token_payload and token_payload.jti:
            db_refresh_token = crud.get_refresh_token_by_jti(db, token_jti=token_payload.jti)
            if db_refresh_token:
                # crud.revoke_all_user_refresh_tokens(db, user_id=db_refresh_token.user_id) # Or just this one
                crud.revoke_refresh_token(db, db_refresh_token)

    response.delete_cookie("access_token_cookie", samesite="lax", secure=not settings.DEBUG)
    response.delete_cookie("refresh_token_cookie", samesite="lax", secure=not settings.DEBUG)

    # TODO: Log logout action in AuditLog
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=current_user.id, action=schemas.AuditLogAction.LOGOUT, ip_address=request.client.host))

    return {"message": "Logout successful"}


@router.post("/request-email-verification", response_model=schemas.MessageResponse)
async def request_email_verification(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Requests an email verification link for the currently authenticated user.
    """
    if current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified.",
        )

    verification_token = crud.set_email_verification_token(db, db_user=current_user)
    await utils.send_verification_email(
        email=current_user.email,
        first_name=current_user.first_name or "User",
        token=verification_token
    )
    # TODO: Log action in AuditLog
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=current_user.id, action=schemas.AuditLogAction.EMAIL_VERIFICATION_REQUESTED, ...))
    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/verify-email", response_model=schemas.MessageResponse)
async def verify_email(
    token_data: schemas.EmailVerificationConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user's email address using the provided token.
    """
    user = crud.get_user_by_email_verification_token(db, token=token_data.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    crud.set_user_email_verified(db, db_user=user, verified=True)
    # TODO: Log action in AuditLog
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=user.id, action=schemas.AuditLogAction.EMAIL_VERIFIED, ...))
    return {"message": "Email verified successfully. You can now login with full features."}


@router.post("/request-password-reset", response_model=schemas.MessageResponse)
async def request_password_reset(
    request_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset link for a given email.
    """
    user = crud.get_user_by_email(db, email=request_data.email)
    if user:
        # Even if user not found, we don't reveal that for security.
        # But only send email if user exists and is active.
        if user.is_active:
            password_reset_token = crud.set_password_reset_token(db, db_user=user)
            await utils.send_password_reset_email(
                email=user.email,
                first_name=user.first_name or "User",
                token=password_reset_token
            )
            # TODO: Log action in AuditLog (even if just attempt, note user found or not for internal review)
            # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=user.id, action=schemas.AuditLogAction.PASSWORD_RESET_REQUESTED, ...))

    # Always return a generic message to prevent email enumeration
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password", response_model=schemas.MessageResponse)
async def reset_password(
    reset_data: schemas.PasswordResetConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Reset user's password using the provided token and new password.
    """
    user = crud.get_user_by_password_reset_token(db, token=reset_data.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )
    if not user.is_active: # Should not happen if token was issued for active user, but check
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive.")

    crud.update_user_password(db, db_user=user, new_password=reset_data.new_password)
    # Invalidate all other refresh tokens for this user for security
    crud.revoke_all_user_refresh_tokens(db, user_id=user.id)

    # TODO: Log action in AuditLog
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=user.id, action=schemas.AuditLogAction.PASSWORD_RESET_COMPLETED, ...))
    return {"message": "Password has been reset successfully."}


@router.post("/change-password", response_model=schemas.MessageResponse)
async def change_password(
    password_data: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change current logged-in user's password.
    """
    if not utils.verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")

    # Validate new password strength (already done by Pydantic schema, but can add more complex rules here if needed)
    # if password_data.new_password == password_data.current_password:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be the same as the current password.")

    crud.update_user_password(db, db_user=current_user, new_password=password_data.new_password)
    # Invalidate all other refresh tokens for this user for security
    crud.revoke_all_user_refresh_tokens(db, user_id=current_user.id)

    # TODO: Log action in AuditLog
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=current_user.id, action=schemas.AuditLogAction.PASSWORD_CHANGED, ...))
    return {"message": "Password changed successfully."}

# TODO: Add social login endpoints (Google, Facebook) - these are more complex
# TODO: Add MFA endpoints
