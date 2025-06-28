from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm # For standard /token endpoint
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta, datetime, timezone
import uuid

from app.core.config import settings
from app.core import security
from app.crud import user_crud, token_crud
from app.db.database import get_db_session
from app.db.models.user_model import User
from app.schemas import user_schema, token_schema
from app.services.email_service import send_verification_email_task # Placeholder for email sending
# from app.utils.limiter import get_login_limiter # Placeholder for rate limiter
from app.main import get_current_active_user_dependency # Use the actual dependency

router = APIRouter()

# Dependency alias for clarity in this router
ActiveUser = Depends(get_current_active_user_dependency)

@router.post("/register", response_model=user_schema.UserPublicResponse, status_code=status.HTTP_201_CREATED, dependencies=[get_login_limiter()]) # Added limiter
async def register_user(
    user_in: user_schema.UserCreate,
    db: AsyncSession = Depends(get_db_session)
):
    existing_user = await user_crud.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    new_user = await user_crud.create_user(db, user_in=user_in)

    # Send verification email (async task)
    # This is a placeholder. Email sending should be robust (e.g., background task)
    # verification_token = security.create_email_verification_token(new_user.email)
    # await user_crud.set_email_verification_token(db, user=new_user, token=verification_token, ...)
    # await send_verification_email_task(new_user.email, verification_token)
    # For now, we'll assume verification is handled or user is active by default

    return new_user


from app.middleware.rate_limiter import get_login_limiter, get_guest_limiter # Import limiter

@router.post("/login", response_model=token_schema.Token, dependencies=[get_login_limiter()])
async def login_for_access_token(
    response: Response, # To set cookies if needed
    form_data: OAuth2PasswordRequestForm = Depends(), # Standard form data for username/password
    db: AsyncSession = Depends(get_db_session)
):
    user = await user_crud.get_user_by_email(db, email=form_data.username) # username is email here
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user.")

    # if not user.is_verified: # Optional: require email verification before login
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not verified.")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_str = security.create_refresh_token(
        subject=str(user.id), expires_delta=refresh_token_expires
    )

    # Store refresh token in DB
    refresh_token_payload = security.verify_token(refresh_token_str, settings.JWT_REFRESH_SECRET_KEY)
    if not refresh_token_payload or not refresh_token_payload.get("exp"):
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create refresh token payload")

    expires_at_dt = datetime.fromtimestamp(refresh_token_payload["exp"], tz=timezone.utc)

    await token_crud.revoke_all_user_refresh_tokens(db, user_id=user.id) # Invalidate old ones
    await token_crud.create_refresh_token(
        db,
        token_in=token_schema.RefreshTokenCreate(token=refresh_token_str, user_id=user.id, expires_at=expires_at_dt),
        user_id=user.id
    )

    # Update last login
    await user_crud.update_last_login(db, user_id=user.id)

    # Set tokens in HttpOnly cookies (optional, good for web clients)
    # response.set_cookie(
    #     key="access_token", value=f"Bearer {access_token}", httponly=True,
    #     max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, samesite="lax", secure=settings.ENVIRONMENT != "development"
    # )
    # response.set_cookie(
    #     key="refresh_token", value=f"Bearer {refresh_token_str}", httponly=True,
    #     max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, samesite="lax", secure=settings.ENVIRONMENT != "development"
    # )

    return token_schema.Token(access_token=access_token, refresh_token=refresh_token_str)


@router.post("/refresh", response_model=token_schema.Token)
async def refresh_access_token(
    refresh_token_str: str, # Can get this from body or header
    db: AsyncSession = Depends(get_db_session)
):
    payload = security.verify_token(refresh_token_str, settings.JWT_REFRESH_SECRET_KEY)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload.")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token.")

    db_refresh_token = await token_crud.get_refresh_token(db, token=refresh_token_str)
    if not db_refresh_token or db_refresh_token.is_revoked or db_refresh_token.user_id != user_id:
        # Token reuse attempt or invalid token, revoke all for user for safety
        await token_crud.revoke_all_user_refresh_tokens(db, user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid or revoked.")

    if db_refresh_token.expires_at < datetime.now(timezone.utc):
        await token_crud.revoke_refresh_token(db, token_id=db_refresh_token.id) # Clean up expired
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")

    user = await user_crud.get_user_by_id(db, user_id=user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    # Issue new access token
    new_access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = security.create_access_token(
        subject=str(user.id), expires_delta=new_access_token_expires
    )

    # Optional: Implement refresh token rotation
    # await token_crud.revoke_refresh_token(db, token_id=db_refresh_token.id)
    # new_refresh_token_str = security.create_refresh_token(subject=str(user.id))
    # ... store new_refresh_token_str in DB ...
    # return token_schema.Token(access_token=new_access_token, refresh_token=new_refresh_token_str)

    return token_schema.Token(access_token=new_access_token, refresh_token=refresh_token_str) # Return original refresh token if not rotating


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    response: Response,
    current_user: User = ActiveUser, # Ensure user is authenticated for logging out their own session
    # For logout, we might just need the refresh token to invalidate it
    refresh_token_str: Optional[str] = None, # Can be from body or a cookie
    db: AsyncSession = Depends(get_db_session)
):
    if refresh_token_str:
        db_refresh_token = await token_crud.get_refresh_token(db, token=refresh_token_str)
        if db_refresh_token and not db_refresh_token.is_revoked:
            await token_crud.revoke_refresh_token(db, token_id=db_refresh_token.id)
            # Optionally, revoke all for the user if needed:
            # await token_crud.revoke_all_user_refresh_tokens(db, user_id=db_refresh_token.user_id)

    # Clear HttpOnly cookies if they were set
    # response.delete_cookie("access_token")
    # response.delete_cookie("refresh_token")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=user_schema.UserResponse)
async def read_users_me(current_user: User = ActiveUser):
    return current_user


from app.middleware.rate_limiter import get_login_limiter, get_guest_limiter, get_authenticated_action_limiter # Import limiter

# Email Verification Endpoints (Simplified)
@router.post("/request-verification-email", status_code=status.HTTP_202_ACCEPTED, dependencies=[get_authenticated_action_limiter()])
async def request_verification_email(
    request_data: user_schema.EmailVerificationRequest,
    # This endpoint might be called by an authenticated user for their own email,
    # or an unauthenticated user if they lost their first verification email.
    # If for authenticated user, current_user dependency should be added.
    # For now, assuming it can be called without full auth, relying on email in request.
    db: AsyncSession = Depends(get_db_session)
):
    user = await user_crud.get_user_by_email(db, email=request_data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified.")

    # Generate verification token (e.g., a JWT or a random string)
    # Store it on the user model with an expiry
    # Send email with the token
    # For now, this is a conceptual placeholder
    # token_content = {"sub": user.email, "type": "email_verification"}
    # verification_token = security.create_custom_token(token_content, expires_delta=timedelta(hours=24))
    # await user_crud.set_email_verification_token(db, user, verification_token, datetime.now(timezone.utc) + timedelta(hours=24))
    # await send_verification_email_task(user.email, verification_token) # Placeholder

    return {"message": "Verification email sent if user exists and is not verified."}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    verification_data: user_schema.EmailVerificationConfirm,
    db: AsyncSession = Depends(get_db_session)
):
    # token_payload = security.verify_custom_token(verification_data.token, expected_type="email_verification")
    # if not token_payload:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")

    # user_email = token_payload.get("sub")
    # user = await user_crud.get_user_by_email(db, email=user_email)

    # Placeholder: Find user by verification_data.token directly if it's not a JWT
    user = None # Replace with actual lookup: e.g. await user_crud.get_user_by_verification_token(db, token=verification_data.token)

    if not user or user.email_verification_token != verification_data.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token.")

    if user.email_verification_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired.")

    if user.is_verified:
        return {"message": "Email already verified."} # Or raise error

    await user_crud.verify_user_email(db, user=user)
    return {"message": "Email verified successfully."}

# TODO: Implement social login routes (Google, Facebook)
# These will typically involve:
# 1. Frontend redirecting to provider's auth URL.
# 2. Provider redirecting back to our backend callback URL with a code.
# 3. Backend exchanging the code for an access token from the provider.
# 4. Backend fetching user info from the provider using their access token.
# 5. Backend finding or creating a local user, then issuing our own JWTs.

# @router.get("/google/login") # Redirect to Google
# @router.get("/google/callback") # Handle Google callback

# @router.get("/facebook/login") # Redirect to Facebook
# @router.get("/facebook/callback") # Handle Facebook callback
