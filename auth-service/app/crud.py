from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import uuid
import json # Import json module
from datetime import datetime, timedelta

from . import models, schemas, utils # utils for password hashing
from .config import settings

# User CRUD operations
def get_user(db: Session, user_id: uuid.UUID) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(func.lower(models.User.email) == func.lower(email)).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(func.lower(models.User.username) == func.lower(username)).first()

def get_user_by_email_or_username(db: Session, email_or_username: str) -> Optional[models.User]:
    return db.query(models.User).filter(
        or_(
            func.lower(models.User.email) == func.lower(email_or_username),
            func.lower(models.User.username) == func.lower(email_or_username)
        )
    ).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = utils.hash_password(user.password)
    db_user = models.User(
        email=user.email.lower(),
        username=user.username.lower() if user.username else None,
        password_hash=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        preferred_language=user.preferred_language,
        timezone=user.timezone,
        is_active=True, # Default new users to active, can be changed by admin or verification flow
        email_verified=False # Require email verification by default
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_update: schemas.UserUpdate) -> models.User:
    update_data = user_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "email" and value is not None:
            setattr(db_user, field, value.lower())
            db_user.email_verified = False # Require re-verification if email changes
        elif field == "username" and value is not None:
            setattr(db_user, field, value.lower())
        elif value is not None: # Ensure we don't set fields to None unless explicitly allowed by schema
            setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, db_user: models.User) -> models.User:
    # Instead of physical delete, consider soft delete by setting is_active=False
    # For now, implementing as per typical delete, but this is a design choice.
    # If soft deleting:
    # db_user.is_active = False
    # db.commit()
    # db.refresh(db_user)
    # return db_user
    db.delete(db_user)
    db.commit()
    return db_user # User object is stale after delete, but might be useful to return the data

def set_user_active_status(db: Session, db_user: models.User, is_active: bool) -> models.User:
    db_user.is_active = is_active
    db.commit()
    db.refresh(db_user)
    return db_user

def set_user_email_verified(db: Session, db_user: models.User, verified: bool) -> models.User:
    db_user.email_verified = verified
    if verified:
        db_user.email_verification_token = None
        db_user.email_verification_expires = None
        db_user.email_verified_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_password(db: Session, db_user: models.User, new_password: str) -> models.User:
    db_user.password_hash = utils.hash_password(new_password)
    # Potentially invalidate active sessions/refresh tokens here
    db_user.password_reset_token = None # Clear any pending reset token
    db_user.password_reset_expires = None
    db.commit()
    db.refresh(db_user)
    return db_user

def set_email_verification_token(db: Session, db_user: models.User) -> str:
    token = utils.generate_random_string(length=64)
    expires_delta = timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    db_user.email_verification_token = token
    db_user.email_verification_expires = datetime.utcnow() + expires_delta
    db.commit()
    db.refresh(db_user)
    return token

def get_user_by_email_verification_token(db: Session, token: str) -> Optional[models.User]:
    return db.query(models.User).filter(
        models.User.email_verification_token == token,
        models.User.email_verification_expires > datetime.utcnow()
    ).first()

def set_password_reset_token(db: Session, db_user: models.User) -> str:
    token = utils.generate_random_string(length=64)
    expires_delta = timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    db_user.password_reset_token = token
    db_user.password_reset_expires = datetime.utcnow() + expires_delta
    db.commit()
    db.refresh(db_user)
    return token

def get_user_by_password_reset_token(db: Session, token: str) -> Optional[models.User]:
    return db.query(models.User).filter(
        models.User.password_reset_token == token,
        models.User.password_reset_expires > datetime.utcnow()
    ).first()

def update_last_login(db: Session, db_user: models.User, ip_address: Optional[str], user_agent: Optional[str] = None) -> models.User:
    db_user.last_login_at = datetime.utcnow()
    db_user.last_login_ip = ip_address
    db_user.last_login_user_agent = user_agent
    db_user.failed_login_attempts = 0 # Reset on successful login
    db_user.locked_until = None
    db.commit()
    db.refresh(db_user)
    return db_user

def increment_failed_login_attempts(db: Session, db_user: models.User) -> models.User:
    db_user.failed_login_attempts = (db_user.failed_login_attempts or 0) + 1
    if db_user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
        db_user.locked_until = datetime.utcnow() + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
    db.commit()
    db.refresh(db_user)
    return db_user

# Refresh Token CRUD
def create_refresh_token(
    db: Session,
    user_id: uuid.UUID,
    token_jti: str,
    expires_at: datetime,
    ip_address: Optional[str],
    user_agent: Optional[str],
    session_id: Optional[str] = None
) -> models.RefreshToken:
    db_refresh_token = models.RefreshToken(
        user_id=user_id,
        token_jti=token_jti,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        session_id=session_id
    )
    db.add(db_refresh_token)
    db.commit()
    db.refresh(db_refresh_token)
    return db_refresh_token

def get_refresh_token_by_jti(db: Session, token_jti: str) -> Optional[models.RefreshToken]:
    return db.query(models.RefreshToken).filter(
        models.RefreshToken.token_jti == token_jti,
        models.RefreshToken.revoked_at == None, # Check not revoked
        models.RefreshToken.expires_at > datetime.utcnow() # Check not expired
    ).first()

def get_refresh_token_by_id(db: Session, token_id: uuid.UUID) -> Optional[models.RefreshToken]:
    return db.query(models.RefreshToken).filter(models.RefreshToken.id == token_id).first()

def revoke_refresh_token(db: Session, db_refresh_token: models.RefreshToken) -> models.RefreshToken:
    db_refresh_token.revoked_at = datetime.utcnow()
    db.commit()
    db.refresh(db_refresh_token)
    return db_refresh_token

def revoke_all_user_refresh_tokens(db: Session, user_id: uuid.UUID, current_jti: Optional[str] = None):
    query = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked_at == None,
        models.RefreshToken.expires_at > datetime.utcnow()
    )
    if current_jti: # Optionally, don't revoke the current token being used for refresh
        query = query.filter(models.RefreshToken.token_jti != current_jti)

    tokens_to_revoke = query.all()
    for token in tokens_to_revoke:
        token.revoked_at = datetime.utcnow()
    db.commit()
    return len(tokens_to_revoke)

def cleanup_expired_refresh_tokens(db: Session) -> int:
    # Deletes expired or already revoked tokens
    deleted_count = db.query(models.RefreshToken).filter(
        or_(
            models.RefreshToken.expires_at <= datetime.utcnow(),
            models.RefreshToken.revoked_at != None
        )
    ).delete(synchronize_session=False)
    db.commit()
    return deleted_count if deleted_count is not None else 0

# Audit Log CRUD
def create_audit_log(db: Session, log_entry: schemas.AuditLogCreate) -> models.AuditLog:
    db_audit_log = models.AuditLog(**log_entry.model_dump())
    db.add(db_audit_log)
    db.commit()
    db.refresh(db_audit_log)
    return db_audit_log

def get_audit_logs_for_user(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    return db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

# MFA CRUD
def set_pending_mfa_secret(db: Session, db_user: models.User, pending_secret: str, expires_in_minutes: int = 10) -> models.User:
    """
    Stores a temporary MFA secret for a user during the enablement process.
    """
    db_user.pending_mfa_secret = pending_secret
    db_user.pending_mfa_secret_expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    db_user.mfa_enabled = False # Ensure MFA is not marked as fully enabled yet
    db_user.mfa_secret = None   # Clear any existing (verified) MFA secret if re-enabling
    db.add(db_user) # Use add if user might be transient or to ensure it's in session
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_with_valid_pending_mfa_secret(db: Session, user_id: uuid.UUID) -> Optional[models.User]:
    """
    Retrieves a user if they have a non-expired pending MFA secret.
    """
    return db.query(models.User).filter(
        models.User.id == user_id,
        models.User.pending_mfa_secret != None,
        models.User.pending_mfa_secret_expires_at > datetime.utcnow()
    ).first()

def finalize_mfa_enablement(db: Session, db_user: models.User, verified_pending_secret: str) -> tuple[models.User, List[str]]:
    """
    Finalizes MFA enablement after successful TOTP verification.
    Moves the pending secret to the final secret field, enables MFA,
    and generates backup codes.
    Returns the user and the list of (plaintext) backup codes.
    """
    if db_user.pending_mfa_secret != verified_pending_secret:
        # This check ensures that the secret being confirmed is the one we stored.
        raise ValueError("Verified secret does not match the pending MFA secret for this user.")

    db_user.mfa_secret = db_user.pending_mfa_secret # Finalize the secret
    db_user.mfa_enabled = True
    db_user.pending_mfa_secret = None # Clear the pending secret
    db_user.pending_mfa_secret_expires_at = None # Clear expiry

    # Generate and store (hashed/encrypted) backup codes
    backup_codes_plain = [utils.generate_random_string(12) for _ in range(settings.MFA_NUMBER_OF_BACKUP_CODES if hasattr(settings, 'MFA_NUMBER_OF_BACKUP_CODES') else 5)] # Default to 5 if not in settings

    # Store backup codes securely (e.g., hashed or as a JSON array of hashes)
    # Generate and store (hashed/encrypted) backup codes
    # Ensure settings.MFA_NUMBER_OF_BACKUP_CODES is defined in config.py or use a default
    num_backup_codes = getattr(settings, 'MFA_NUMBER_OF_BACKUP_CODES', 5) # Default to 5 codes
    backup_codes_plain = [utils.generate_random_string(12) for _ in range(num_backup_codes)]

    hashed_backup_codes = [utils.hash_password(code) for code in backup_codes_plain]
    db_user.mfa_backup_codes_hashed = json.dumps(hashed_backup_codes)

    db.add(db_user) # Ensure changes are staged if db_user was modified
    db.commit()
    db.refresh(db_user)

    return db_user, backup_codes_plain # Return plaintext codes ONCE for the user to save.

def disable_mfa_for_user(db: Session, db_user: models.User) -> models.User:
    """
    Disables MFA for the user and clears all MFA-related fields.
    """
    db_user.mfa_enabled = False
    db_user.mfa_secret = None
    db_user.pending_mfa_secret = None
    db_user.pending_mfa_secret_expires_at = None
    db_user.mfa_backup_codes_hashed = None # Clear hashed backup codes
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_and_consume_backup_code(db: Session, db_user: models.User, backup_code_plain: str) -> bool:
    """
    Verifies a plaintext backup code against the user's stored hashed backup codes.
    If successful, consumes the code (removes it from the list).
    Returns True if verification and consumption were successful, False otherwise.
    """
    if not db_user.mfa_backup_codes_hashed:
        return False

    try:
        hashed_codes: List[str] = json.loads(db_user.mfa_backup_codes_hashed)
    except json.JSONDecodeError:
        # Log this error: Corrupted backup codes storage
        return False

    found_match = False
    remaining_hashed_codes = []
    for stored_hash in hashed_codes:
        if not found_match and utils.verify_password(backup_code_plain, stored_hash):
            found_match = True
            # This code is consumed, do not add it to remaining_hashed_codes
            continue
        remaining_hashed_codes.append(stored_hash)

    if found_match:
        db_user.mfa_backup_codes_hashed = json.dumps(remaining_hashed_codes)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return True

    return False

def update_user_session_count(db: Session, db_user: models.User, session_count: int) -> models.User:
    """Update the current session count for a user."""
    db_user.current_session_count = session_count
    db.commit()
    db.refresh(db_user)
    return db_user

def increment_user_session_count(db: Session, db_user: models.User) -> models.User:
    """Increment the current session count for a user."""
    current_count = db_user.current_session_count or 0
    db_user.current_session_count = current_count + 1
    db.commit()
    db.refresh(db_user)
    return db_user

def decrement_user_session_count(db: Session, db_user: models.User) -> models.User:
    """Decrement the current session count for a user, ensuring it doesn't go below 0."""
    current_count = db_user.current_session_count or 0
    db_user.current_session_count = max(0, current_count - 1)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_refresh_token_session_info(db: Session, db_refresh_token: models.RefreshToken, 
                                    session_id: Optional[str], 
                                    device_fingerprint: Optional[str] = None,
                                    location_info: Optional[str] = None) -> models.RefreshToken:
    """Update session information for a refresh token."""
    db_refresh_token.session_id = session_id
    if device_fingerprint is not None:
        db_refresh_token.device_fingerprint = device_fingerprint
    if location_info is not None:
        db_refresh_token.location_info = location_info
    db.commit()
    db.refresh(db_refresh_token)
    return db_refresh_token
