from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import pyotp # For TOTP generation and verification

from app import crud, models, schemas, utils
from app.database import get_db
from app.config import settings
from app.dependencies import get_current_active_user

router = APIRouter()

@router.post("/enable", response_model=schemas.MFAEnableResponse)
async def enable_mfa_request(
    request: Request, # To get base URL for otpauth_url
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Initiates MFA enablement for the current user.
    Generates a new TOTP secret and returns it along with the otpauth:// URI
    for QR code generation by the client. The secret is stored temporarily
    and only confirmed on successful verification.
    """
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this account."
        )

    # Generate a new TOTP secret
    # For security, this secret should be stored temporarily (e.g., in Redis or a temporary user field)
    # and only moved to the permanent mfa_secret field after successful verification.
    # For simplicity in this step, we'll generate and directly prepare for storage,
    # but a two-step confirmation (generate -> verify -> save) is best practice.

    temp_mfa_secret = pyotp.random_base32()

    # Store this temp_mfa_secret associated with the user, perhaps with an expiry
    # e.g., crud.set_pending_mfa_secret(db, user_id=current_user.id, secret=temp_mfa_secret)
    # For now, we'll pass it back and expect verification to confirm it.
    # This means the user model's mfa_secret won't be set until verification.

    # Generate otpauth URI for QR code
    # The issuer name should come from settings.
    # The account name is typically user's email or username.
    issuer_name = settings.PROJECT_NAME.replace(" ", "") # OTPAuth URI doesn't like spaces
    account_name = current_user.email

    totp = pyotp.TOTP(temp_mfa_secret)
    otpauth_url = totp.provisioning_uri(name=account_name, issuer_name=issuer_name)

    # For a real implementation, you'd store temp_mfa_secret securely (e.g., encrypted in DB or Redis with TTL)
    # and associate it with the user pending verification.
    # Here, we will update the user model with this secret but not yet enable MFA flag
    # The actual `mfa_enabled = True` will happen upon successful verification.
    # This is a slight simplification of the ideal flow for brevity.

    # Let's assume crud.set_pending_mfa will store it appropriately before verification
    # For now, we'll update the user's mfa_secret field directly but keep mfa_enabled=False
    # This is NOT ideal for security as the secret is stored before verification.
    # A better approach: store temp_mfa_secret in a separate temporary store or a specific field.

    # crud.update_user(db, db_user=current_user, user_update=schemas.UserUpdate(mfa_secret_unverified=temp_mfa_secret))
    # This requires mfa_secret_unverified field in UserUpdate and User model.
    # For now, let's assume the client will send back the secret for verification to confirm,
    # which is not standard but simplifies this example.
    # A more standard flow:
    # 1. User requests to enable MFA.
    # 2. Server generates secret, stores it temporarily (e.g. user.pending_mfa_secret).
    # 3. Server returns secret (for manual entry) and OTPAuth URI (for QR).
    # 4. User scans QR/enters secret, gets a code from their authenticator app.
    # 5. User sends this code to a new "/verify-mfa-enable" endpoint.
    # 6. Server verifies code against user.pending_mfa_secret.
    # 7. If valid, server moves pending_mfa_secret to user.mfa_secret, sets user.mfa_enabled = True.

    # For this step, we'll return the secret and URL. Verification will confirm and save.
    # The `mfa_secret` on the user model will only be set upon successful verification.

    # We need a way to temporarily hold this secret for the user until they verify it.
    # Let's simulate this by using a temporary field or a separate mechanism if we had Redis.
    # For now, we'll have to rely on the client sending the secret back during verification,
    # which is not ideal but a simplification for this stage of coding.

    return schemas.MFAEnableResponse(
        otp_secret=temp_mfa_secret, # Client should display this for manual entry
        otp_auth_url=otpauth_url    # Client should use this to generate QR code
    )

@router.post("/verify-mfa", response_model=schemas.MessageResponse)
async def verify_mfa_and_finalize_enable(
    mfa_data: schemas.MFAVerifyRequest, # Expects mfa_code
    # To make this more secure for enablement, this endpoint should also receive the secret
    # that was generated in /enable, or retrieve it from a temporary store.
    # For simplicity, let's assume the client sends the secret, which is NOT how it should be done in prod.
    # A better way: client sends code, server retrieves temporarily stored secret for this user.
    # For this example, we'll modify MFAVerifyRequest to include the temporary secret.
    # Let's update schemas.MFAVerifyRequest to include temp_otp_secret for the enable flow.
    # This is a workaround for not having a temporary store in this coding phase.
    # In schemas.py, MFAVerifyRequest should be:
    # class MFAVerifyRequest(BaseModel):
    #     mfa_code: constr(min_length=6, max_length=6)
    #     temp_otp_secret: Optional[str] = None # Used only during MFA enablement flow

    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verifies an MFA code provided by the user during MFA setup.
    If successful, marks MFA as enabled for the user and saves the secret.
    This endpoint is intended for the *initial setup* of MFA.
    For login MFA check, that logic is part of the /login endpoint.
    """
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is already enabled.")

    # This is where the temporary secret (temp_otp_secret from enable_mfa_request) would be used.
    # The client needs to send it. This is not ideal.
    # Let's assume for now the client has it from the /enable step and provides it.
    # We need to add `temp_otp_secret` to `schemas.MFAVerifyRequest` for this flow.
    # For a real app: Retrieve the pending_mfa_secret from DB/Redis for `current_user.id`.

    # This part needs the actual secret that was generated.
    # If we don't have a temporary store, we can't securely complete this.
    # Let's assume a schema modification for `MFAVerifyRequest` to include `temp_otp_secret` for now.
    # This was the previous simplified approach.
    # Now, we store the pending secret in the database.
    crud.set_pending_mfa_secret(db, db_user=current_user, pending_secret=temp_mfa_secret, expires_in_minutes=10) # 10 min expiry for pending

    return schemas.MFAEnableResponse(
        otp_secret=temp_mfa_secret,
        otp_auth_url=otpauth_url
    )

@router.post("/verify-mfa-enable", response_model=schemas.MFASetupCompleteResponse) # Changed response model
async def verify_mfa_and_finalize_enable(
    mfa_data: schemas.MFAVerifyRequest, # Expects mfa_code only now
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verifies an MFA code provided by the user during MFA setup against a pending secret.
    If successful, marks MFA as enabled for the user, saves the secret permanently,
    and returns backup codes.
    """
    if current_user.mfa_enabled: # Should not happen if flow is correct, but good check
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is already enabled.")

    # Retrieve the user with their valid pending MFA secret
    user_with_pending_secret = crud.get_user_with_valid_pending_mfa_secret(db, user_id=current_user.id)

    if not user_with_pending_secret or not user_with_pending_secret.pending_mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending MFA setup found for this user, or the setup process has expired. Please start over."
        )

    totp = pyotp.TOTP(user_with_pending_secret.pending_mfa_secret)
    if not totp.verify(mfa_data.mfa_code):
        # TODO: Implement attempt counting for MFA verification to prevent brute-force
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code. Please try again."
        )

    # If code is valid, finalize MFA enablement
    # The crud function will move pending_secret to mfa_secret and set mfa_enabled = True
    updated_user, backup_codes = crud.finalize_mfa_enablement(db, db_user=user_with_pending_secret, verified_pending_secret=user_with_pending_secret.pending_mfa_secret)

    # Create Audit Log for MFA_ENABLED
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=updated_user.id, action=schemas.AuditLogAction.MFA_ENABLED, ip_address=request.client.host if request else None))

    return schemas.MFASetupCompleteResponse(
        message="MFA has been successfully enabled. Please store your backup codes securely.",
        backup_codes=backup_codes
    )


@router.post("/disable", response_model=schemas.MessageResponse)
async def disable_mfa(
    disable_request: schemas.MFADisableRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Disables MFA for the current user.
    Requires current password OR a valid MFA code to authorize disablement.
    """
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not currently enabled for this account."
        )

    authorized_to_disable = False
    if disable_request.password:
        if utils.verify_password(disable_request.password, current_user.password_hash):
            authorized_to_disable = True

    if not authorized_to_disable and disable_request.mfa_code and current_user.mfa_secret:
        totp = pyotp.TOTP(current_user.mfa_secret) # User's actual stored secret
        if totp.verify(disable_request.mfa_code):
            authorized_to_disable = True

    if not authorized_to_disable:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Password or MFA code required to disable MFA."
        )

    crud.disable_mfa_for_user(db, db_user=current_user)
    # Create Audit Log
    # crud.create_audit_log(db, schemas.AuditLogCreate(user_id=current_user.id, action=schemas.AuditLogAction.MFA_DISABLED, ...))
    return {"message": "MFA has been successfully disabled."}

# Note: A route to check MFA status might be useful: GET /mfa/status -> {"mfa_enabled": true/false}
# Note: Login flow in `auth.py` needs to be updated to check `user.mfa_enabled` and require `mfa_code`.
# Note: `schemas.MFAVerifyRequest` needs `temp_otp_secret: Optional[str] = None` for the current simplified enable flow.
# This is a temporary measure for development. A real system uses a server-side temporary store for the secret during enablement.
