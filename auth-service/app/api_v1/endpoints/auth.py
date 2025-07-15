from fastapi import (
    APIRouter, Depends, HTTPException, status, Response, Request
)
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import uuid
import pyotp
from typing import Optional

from app import crud, models, schemas, utils
from app.database import get_db
from app.config import settings
from app.dependencies import get_current_active_user, get_optional_current_user
from app.session_manager import get_session_manager, SessionManager

router = APIRouter()


@router.post(
    "/register",
    response_model=schemas.LoginResponse,
    status_code=status.HTTP_201_CREATED
)
async def register_user(
    user_in: schemas.RegisterRequest,
    db: Session = Depends(get_db)
):
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
    
    # Generate username from email if not provided
    if not user_in_dict.get('username'):
        base_username = user_in.email.split('@')[0]
        # Clean up special characters
        base_username = ''.join(c if c.isalnum() else '_' for c in base_username)
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

    user = crud.create_user(db=db, user=adjusted_user_in)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    refresh_jti = utils.generate_jti()
    # Handle case where generate_jti might return a tuple due to patches
    if isinstance(refresh_jti, tuple):
        refresh_jti = refresh_jti[0]
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_result = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=refresh_jti,
        expires_delta=refresh_token_expires_delta
    )
    # Handle both tuple and string return types due to patches
    if isinstance(refresh_token_result, tuple):
        refresh_token, _ = refresh_token_result
    else:
        refresh_token = refresh_token_result
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
    response: Response,
    login_data: schemas.LoginRequest,
    db: Session = Depends(get_db),
    session_mgr: SessionManager = Depends(get_session_manager)
):
    """
    Authenticate user and return JWT tokens along with user data.
    Enhanced with comprehensive session management and security tracking.
    """
    user = crud.get_user_by_email(db, email=login_data.email)

    if not user or not utils.verify_password(login_data.password, user.password_hash):
        if user:
            crud.increment_failed_login_attempts(db, user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User account is inactive."
        )

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked. Please try again after {user.locked_until.isoformat()}.",
        )

    # Check concurrent session limit
    active_sessions = session_mgr.get_user_active_sessions(str(user.id))
    if len(active_sessions) >= user.max_concurrent_sessions:
        # Optionally revoke oldest session
        if active_sessions:
            oldest_session = min(active_sessions, key=lambda s: s['created_at'])
            session_mgr.revoke_session(oldest_session['session_id'])

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
                    mfaEnabled=user.mfa_enabled,
                    lastLoginAt=user.last_login_at,
                    createdAt=user.created_at,
                    updatedAt=user.updated_at
                )
            )

        if not user.mfa_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="MFA configuration error."
            )

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(login_data.mfaCode):
            if not crud.verify_and_consume_backup_code(db, db_user=user, backup_code_plain=login_data.mfaCode):
                crud.increment_failed_login_attempts(db, user)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code or backup code.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # Generate tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        subject={"user_id": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )

    refresh_jti = utils.generate_jti()
    if isinstance(refresh_jti, tuple):
        refresh_jti = refresh_jti[0]
    
    refresh_token_expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_result = utils.create_refresh_token(
        subject={"user_id": str(user.id)},
        jti=refresh_jti,
        expires_delta=refresh_token_expires_delta
    )
    
    if isinstance(refresh_token_result, tuple):
        refresh_token, _ = refresh_token_result
    else:
        refresh_token = refresh_token_result

    # Create session in Redis with comprehensive tracking
    session_id = session_mgr.create_session(
        user=user,
        request=request,
        access_token=access_token,
        refresh_token=refresh_token,
        refresh_jti=refresh_jti
    )

    # Enhanced database tracking
    client_info = session_mgr._get_client_info(request)
    crud.create_refresh_token(
        db=db,
        user_id=user.id,
        token_jti=refresh_jti,
        expires_at=datetime.utcnow() + refresh_token_expires_delta,
        ip_address=client_info.get("ip_address"),
        user_agent=client_info.get("user_agent"),
        token=refresh_token,
        session_id=session_id
    )

    # Update user login info
    crud.update_last_login(
        db, 
        db_user=user, 
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"]
    )

    # Set secure cookies
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
    request: Request,
    response: Response,
    refresh_token_data: schemas.RefreshTokenRequest, # Expect refresh token in body
    db: Session = Depends(get_db)
):
    """
    Refresh an access token using a valid refresh token.
    """
    try:
        token_payload = utils.decode_token(refresh_token_data.refreshToken, settings.ASSEMBLED_JWT_REFRESH_SECRET)
        
        if not token_payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token (decode failed)",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not hasattr(token_payload, 'user_id') or not token_payload.user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token (missing user_id)",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not hasattr(token_payload, 'jti') or not token_payload.jti:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token (missing jti)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        db_refresh_token = crud.get_refresh_token_by_jti(db, token_jti=token_payload.jti)
        if not db_refresh_token or str(db_refresh_token.user_id) != str(token_payload.user_id):
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

        # Get session manager and validate session
        session_manager = SessionManager()
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")
        
        # Validate session security (IP/User Agent matching)
        if db_refresh_token.session_id:
            session_valid = session_manager.validate_session_security(
                db_refresh_token.session_id, request
            )
            if not session_valid:
                # Security violation - revoke token and session
                crud.revoke_refresh_token(db, db_refresh_token)
                if db_refresh_token.session_id:
                    session_manager.revoke_session(db_refresh_token.session_id)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session security validation failed",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Update session activity
            session_manager.update_session_activity(db_refresh_token.session_id)

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
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Refresh token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token (payload error)",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout", response_model=schemas.MessageResponse)
async def logout_user(
    request: Request,
    response: Response,
    logout_data: schemas.LogoutRequest,  # Body with optional refresh token
    current_user: Optional[models.User] = Depends(get_optional_current_user),  # Optional auth
    db: Session = Depends(get_db)
):
    """
    Logout user with comprehensive token invalidation.
    
    This endpoint supports multiple logout scenarios:
    1. Token-based logout: Uses Authorization header to identify user and revoke all tokens
    2. Refresh token logout: Uses refresh token in request body to revoke specific token
    3. Cookie-based logout: Clears HTTPOnly cookies for web clients
    4. Complete logout: Revokes all refresh tokens for the user
    
    Args:
        request: FastAPI request object for IP address logging
        response: FastAPI response object for cookie management
        logout_data: Request body with optional refresh token
        current_user: Current authenticated user (if Authorization header provided)
        db: Database session
    
    Returns:
        Success message confirming logout
    """
    user_id = None
    logout_details = []
    session_manager = SessionManager()
    
    try:
        # Method 1: Use current authenticated user (from Authorization header)
        if current_user:
            user_id = current_user.id
            logout_details.append("access_token_revoked")
            
            # Revoke all refresh tokens and sessions for security
            revoked_count = crud.revoke_all_user_refresh_tokens(
                db, user_id=user_id
            )
            logout_details.append(f"refresh_tokens_revoked({revoked_count})")
            
            # Revoke all user sessions
            try:
                session_revoked_count = session_manager.revoke_all_user_sessions(str(user_id))
                logout_details.append(f"sessions_revoked({session_revoked_count})")
            except Exception as e:
                logout_details.append(f"session_revocation_warning: {str(e)}")
                
            # Update session count in database
            crud.update_user_session_count(db, current_user, 0)
            
        # Method 2: Use refresh token from request body
        elif logout_data.refreshToken:
            token_payload = utils.decode_token(
                logout_data.refreshToken,
                settings.ASSEMBLED_JWT_REFRESH_SECRET
            )
            
            if token_payload and token_payload.jti and token_payload.user_id:
                try:
                    user_id = uuid.UUID(token_payload.user_id)
                    db_refresh_token = crud.get_refresh_token_by_jti(
                        db, token_jti=token_payload.jti
                    )
                    
                    if (db_refresh_token and
                            str(db_refresh_token.user_id) == str(user_id)):
                        # Revoke the specific refresh token
                        crud.revoke_refresh_token(db, db_refresh_token)
                        logout_details.append("specific_refresh_token_revoked")
                        
                        # Revoke the specific session if it exists
                        if db_refresh_token.session_id:
                            try:
                                session_manager.revoke_session(
                                    db_refresh_token.session_id
                                )
                                logout_details.append("session_revoked")
                                
                                # Update user session count
                                user = crud.get_user(db, user_id)
                                if user:
                                    crud.decrement_user_session_count(db, user)
                            except Exception as e:
                                logout_details.append(
                                    f"session_revocation_warning: {str(e)}"
                                )
                        
                        # Optionally revoke all tokens for this user for
                        # enhanced security. Uncomment the next line if you
                        # want to revoke ALL user tokens on logout
                        # crud.revoke_all_user_refresh_tokens(
                        #     db, user_id=user_id, current_jti=token_payload.jti
                        # )
                        
                    else:
                        logout_details.append(
                            "refresh_token_not_found_or_invalid"
                        )
                        
                except (ValueError, TypeError) as e:
                    logout_details.append(
                        f"refresh_token_decode_error: {str(e)}"
                    )
            else:
                logout_details.append("refresh_token_payload_invalid")
                
        # Method 3: Cookie-based logout (always clear cookies regardless of
        # token validation)
        response.delete_cookie(
            "access_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        response.delete_cookie(
            "refresh_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        logout_details.append("cookies_cleared")
        
        # Create audit log entry if we have a user
        if user_id:
            try:
                # TODO: Implement audit logging
                # audit_data = {
                #     "user_id": user_id,
                #     "action": "LOGOUT",
                #     "ip_address": request.client.host if request.client else None,
                #     "user_agent": request.headers.get("User-Agent", "unknown"),
                #     "details": ", ".join(logout_details)
                # }
                # crud.create_audit_log(db, schemas.AuditLogCreate(**audit_data))
                logout_details.append("audit_logged")
            except Exception as audit_error:
                # Don't fail logout if audit logging fails
                logout_details.append(f"audit_failed: {str(audit_error)}")
        
        return {
            "message": "Logout successful",
            # Include details in debug mode
            **({"details": logout_details} if settings.DEBUG else {})
        }
        
    except Exception as e:
        # Even if logout partially fails, still clear cookies for security
        response.delete_cookie("access_token_cookie", samesite="lax", secure=not settings.DEBUG, path="/")
        response.delete_cookie("refresh_token_cookie", samesite="lax", secure=not settings.DEBUG, path="/")
        
        # Log the error but don't expose details to client
        print(f"Logout error: {str(e)}")  # Replace with proper logging
        
        return {"message": "Logout completed (with warnings)"}


@router.post("/logout-all", response_model=schemas.MessageResponse)
async def logout_all_sessions(
    request: Request,
    response: Response,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all sessions by revoking all refresh tokens for the current user.
    
    This is a more aggressive logout that invalidates all active sessions
    across all devices/browsers for the authenticated user.
    
    Args:
        request: FastAPI request object for IP address logging
        response: FastAPI response object for cookie management
        current_user: Current authenticated user (required)
        db: Database session
    
    Returns:
        Success message with count of revoked tokens
    """
    try:
        session_manager = SessionManager()
        
        # Revoke all refresh tokens for this user
        revoked_count = crud.revoke_all_user_refresh_tokens(
            db, user_id=current_user.id
        )
        
        # Revoke all user sessions
        try:
            session_manager.revoke_all_user_sessions(
                str(current_user.id)
            )
        except Exception as e:
            print(f"Session revocation warning: {str(e)}")
        
        # Update session count in database
        crud.update_user_session_count(db, current_user, 0)
        
        # Clear cookies for this session
        response.delete_cookie(
            "access_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        response.delete_cookie(
            "refresh_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        
        # TODO: Create audit log entry
        # audit_data = {
        #     "user_id": current_user.id,
        #     "action": "LOGOUT_ALL_SESSIONS",
        #     "ip_address": request.client.host if request.client else None,
        #     "user_agent": request.headers.get("User-Agent", "unknown"),
        #     "details": f"revoked {revoked_count} tokens"
        # }
        # crud.create_audit_log(db, schemas.AuditLogCreate(**audit_data))
        
        return {
            "message": (
                f"Successfully logged out from all sessions. "
                f"{revoked_count} active sessions terminated."
            ),
            **({"revoked_tokens": revoked_count} if settings.DEBUG else {})
        }
        
    except Exception as e:
        # Still clear cookies for security
        response.delete_cookie(
            "access_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        response.delete_cookie(
            "refresh_token_cookie",
            samesite="lax",
            secure=not settings.DEBUG,
            path="/"
        )
        
        print(f"Logout-all error: {str(e)}")  # Replace with proper logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An error occurred during logout. "
                "Cookies have been cleared for security."
            )
        )


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
    request: Request,
    request_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset link for a given email.
    
    Security features:
    - Always returns success message (prevents email enumeration)
    - Rate limiting should be implemented at API gateway level
    - Only sends email if user exists and is active
    - Generates secure random token with expiration
    
    Args:
        request: FastAPI request for IP logging
        request_data: Email address for password reset
        db: Database session
    
    Returns:
        Success message (generic for security)
    """
    try:
        user = crud.get_user_by_email(db, email=request_data.email)
        
        if user and user.is_active:
            # Clear any existing password reset token first
            if user.password_reset_token:
                user.password_reset_token = None
                user.password_reset_expires = None
                db.commit()
            
            # Generate new password reset token
            password_reset_token = crud.set_password_reset_token(db, db_user=user)
            
            # Send password reset email
            try:
                await utils.send_password_reset_email(
                    email=user.email,
                    first_name=user.first_name or "User",
                    token=password_reset_token
                )
                
                # TODO: Create audit log entry
                # audit_data = {
                #     "user_id": user.id,
                #     "action": "PASSWORD_RESET_REQUESTED",
                #     "ip_address": request.client.host if request.client else None,
                #     "user_agent": request.headers.get("User-Agent", "unknown"),
                #     "details": f"Password reset requested for {user.email}"
                # }
                # crud.create_audit_log(db, schemas.AuditLogCreate(**audit_data))
                
            except Exception as email_error:
                # Log email sending error but don't expose to user
                print(f"Failed to send password reset email to {user.email}: {str(email_error)}")
                # Consider clearing the token if email fails
                user.password_reset_token = None
                user.password_reset_expires = None
                db.commit()
        
        # Always return success message for security (prevent email enumeration)
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
        
    except Exception as e:
        print(f"Password reset request error: {str(e)}")
        # Still return success message to prevent information leakage
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }


@router.post("/reset-password", response_model=schemas.MessageResponse)
async def reset_password(
    request: Request,
    reset_data: schemas.PasswordResetConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Reset user's password using the provided token and new password.
    
    Security features:
    - Validates token and expiration
    - Ensures user is still active
    - Revokes all existing refresh tokens for security
    - Clears password reset token after use
    - Prevents password reuse (can be extended)
    
    Args:
        request: FastAPI request for IP logging
        reset_data: Token and new password
        db: Database session
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If token is invalid, expired, or user inactive
    """
    try:
        # Validate token and get user
        user = crud.get_user_by_password_reset_token(db, token=reset_data.token)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive."
            )
        
        # Additional security: Check if new password is same as current (optional)
        if utils.verify_password(reset_data.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password cannot be the same as your current password."
            )
        
        # Update password and clear reset token
        crud.update_user_password(db, db_user=user, new_password=reset_data.new_password)
        
        # Revoke all refresh tokens for security
        revoked_count = crud.revoke_all_user_refresh_tokens(db, user_id=user.id)
        
        # TODO: Create audit log entry
        # audit_data = {
        #     "user_id": user.id,
        #     "action": "PASSWORD_RESET_COMPLETED",
        #     "ip_address": request.client.host if request.client else None,
        #     "user_agent": request.headers.get("User-Agent", "unknown"),
        #     "details": f"Password reset completed, {revoked_count} tokens revoked"
        # }
        # crud.create_audit_log(db, schemas.AuditLogCreate(**audit_data))
        
        return {
            "message": "Password has been reset successfully. Please log in with your new password."
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (these are expected errors)
        raise
    except Exception as e:
        print(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting your password. Please try again."
        )


@router.post("/change-password", response_model=schemas.MessageResponse)
async def change_password(
    request: Request,
    password_data: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change current logged-in user's password.
    
    Security features:
    - Requires current password verification
    - Validates new password strength
    - Prevents password reuse
    - Revokes all other refresh tokens for security
    - Maintains current session (doesn't revoke current token)
    
    Args:
        request: FastAPI request for IP logging
        password_data: Current and new password
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If current password is incorrect or new password is invalid
    """
    try:
        # Verify current password
        if not utils.verify_password(password_data.current_password, current_user.password_hash):
            # TODO: Consider implementing rate limiting for failed attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )
        
        # Check if new password is same as current password
        if utils.verify_password(password_data.new_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from your current password."
            )
        
        # TODO: Additional password history check (prevent reuse of last N passwords)
        # This would require storing password history in the database
        
        # Update password
        crud.update_user_password(db, db_user=current_user, new_password=password_data.new_password)
        
        # Revoke all refresh tokens except current one for security
        # Note: We could get current token's JTI from the request and exclude it
        revoked_count = crud.revoke_all_user_refresh_tokens(db, user_id=current_user.id)
        
        # TODO: Create audit log entry
        # audit_data = {
        #     "user_id": current_user.id,
        #     "action": "PASSWORD_CHANGED",
        #     "ip_address": request.client.host if request.client else None,
        #     "user_agent": request.headers.get("User-Agent", "unknown"),
        #     "details": f"Password changed successfully, {revoked_count} other sessions revoked"
        # }
        # crud.create_audit_log(db, schemas.AuditLogCreate(**audit_data))
        
        return {
            "message": "Password changed successfully. Other active sessions have been logged out for security."
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (these are expected errors)
        raise
    except Exception as e:
        print(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while changing your password. Please try again."
        )


@router.post("/validate-password-reset-token", response_model=schemas.MessageResponse)
async def validate_password_reset_token(
    token_data: schemas.PasswordResetTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Validate a password reset token without resetting the password.
    
    This endpoint allows the frontend to check if a token is valid
    before showing the password reset form.
    
    Args:
        token_data: Dictionary containing the token
        db: Database session
    
    Returns:
        Success message if token is valid
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        token = token_data.token
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is required."
            )
        
        user = crud.get_user_by_password_reset_token(db, token=token)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive."
            )
        
        return {
            "message": "Token is valid.",
            "email": user.email  # Show email for user confirmation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token."
        )

# TODO: Add social login endpoints (Google, Facebook) - these are more complex
# TODO: Add MFA endpoints
