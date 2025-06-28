from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
import pyotp  # For OTP generation and verification
from datetime import timedelta
from app.core import security
from app.core.config import settings
from app.crud import user_crud
from app.db.database import get_db_session
from app.db.models.user_model import User
from app.schemas import token_schema  # Using MFASetupResponse, MFAVerifyRequest from token_schema
# from app.utils.qrcode_generator import generate_qr_code_base64  # Optional QR code generation
from app.dependencies.auth import get_current_active_user_dependency  # Use the actual dependency

router = APIRouter()

# Dependency alias
ActiveUser = Depends(get_current_active_user_dependency)

# For MFA login flow, a more specialized dependency might be needed
# to handle partially authenticated states (e.g., after password, before OTP).
# For now, ActiveUser assumes full authentication or a mechanism to get the user.


@router.post("/setup", response_model=token_schema.MFASetupResponse)
async def setup_mfa(
    current_user: User = ActiveUser,  # User must be logged in
    db: AsyncSession = Depends(get_db_session)
):
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this account."
        )

    # Generate a new OTP secret
    otp_secret = pyotp.random_base32()

    # Store the unconfirmed OTP secret temporarily or directly if activation is immediate
    # For a two-step setup (generate then verify to enable), store temporarily
    # For simplicity here, we'll store it directly but not enable MFA yet.
    # A more robust flow: store temp secret, user confirms with OTP, then set mfa_secret and mfa_enabled=True.
    current_user.mfa_secret = otp_secret
    # current_user.mfa_enabled = False  # Explicitly false until verified
    await user_crud.update_user(
        db, user=current_user, user_in={"mfa_secret": otp_secret, "mfa_enabled": False}
    )

    otp_uri = pyotp.totp.TOTP(otp_secret).provisioning_uri(
        name=current_user.email,  # Or some other user identifier
        issuer_name=settings.MFA_OTP_ISSUER_NAME
    )

    # qr_code_image_base64 = await generate_qr_code_base64(otp_uri)  # If generating QR on backend

    return token_schema.MFASetupResponse(
        secret_key=otp_secret,  # Send secret for manual entry
        otp_uri=otp_uri         # Send URI for QR code generation by frontend
        # qr_code_image=qr_code_image_base64  # If sending image data
    )


@router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_mfa_setup_and_enable(
    mfa_data: token_schema.MFAVerifyRequest,
    current_user: User = ActiveUser,  # User must be logged in
    db: AsyncSession = Depends(get_db_session)
):
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA already enabled."
        )

    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated or secret not found. Please setup MFA first."
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(mfa_data.otp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code."
        )

    # OTP is valid, enable MFA for the user
    await user_crud.set_mfa_secret(
        db, user=current_user, secret=current_user.mfa_secret, enabled=True
    )

    # Optional: Generate and store backup codes here
    # backup_codes = [secrets.token_hex(8) for _ in range(10)]
    # current_user.mfa_backup_codes = json.dumps(backup_codes)  # Encrypt these!
    # await db.commit()
    # return {"message": "MFA enabled successfully.", "backup_codes": backup_codes}

    return {"message": "MFA enabled successfully."}


@router.post("/disable", status_code=status.HTTP_200_OK)
async def disable_mfa(
    # mfa_disable_data: token_schema.MFADisableRequest,  # If OTP is required to disable
    current_user: User = ActiveUser,  # User must be logged in
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not currently enabled for this account."
        )

    # Optional: Verify OTP before disabling for added security
    # if not current_user.mfa_secret:
    #     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="MFA secret not found.")
    # totp = pyotp.TOTP(current_user.mfa_secret)
    # if not totp.verify(mfa_disable_data.otp_code):
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code.")

    await user_crud.set_mfa_secret(db, user=current_user, secret=None, enabled=False)
    # current_user.mfa_backup_codes = None  # Clear backup codes
    # await db.commit()

    return {"message": "MFA disabled successfully."}


# This is a simplified MFA login flow. A more complete one would involve:
# 1. User logs in with username/password.
# 2. If MFA is enabled, server returns a response indicating MFA is required (e.g., a specific status code or flag).
# 3. Frontend prompts for OTP.
# 4. User submits OTP to a separate endpoint (like `/login/mfa-verify`).
# 5. If OTP is valid, server issues access/refresh tokens.
# This requires a way to maintain a "partially authenticated" state.


@router.post("/login/verify-otp", response_model=token_schema.Token)
async def login_verify_otp(
    mfa_data: token_schema.MFAVerifyRequest,
    # Need a way to identify the user who is in the process of MFA login
    # This could be via a temporary token issued after password auth, or session.
    # For this example, we'll assume `get_current_active_user` can somehow get this user
    # based on a temporary "MFA pending" token. This is a simplification.
    partially_authenticated_user: User = ActiveUser,  # Needs refinement
    db: AsyncSession = Depends(get_db_session),
    response: Response = Response()  # For setting cookies
):
    user = partially_authenticated_user  # In reality, fetch user based on a temp token/session

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not enabled for this user."
        )

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(mfa_data.otp_code):
        # Implement rate limiting or lockout for failed OTP attempts here
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP code."
        )

    # OTP is correct, complete the login process
    # (Code similar to the end of the regular /login endpoint)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    refresh_token_str = security.create_refresh_token(subject=str(user.id))

    # Store refresh token, update last login, etc. (as in auth_router.login_for_access_token)
    # ... (omitted for brevity, assume this logic is refactored or called)

    # response.set_cookie(...)
    return token_schema.Token(access_token=access_token, refresh_token=refresh_token_str)
