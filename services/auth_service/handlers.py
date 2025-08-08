"""Request handlers for auth_service service."""

from fastapi import APIRouter, HTTPException, status
from .schemas import User, RegisterRequest, LoginRequest, TokenResponse, GoogleLoginRequest, FacebookLoginRequest, AppleLoginRequest, LinkedInLoginRequest, EnableEmailMFARequest, VerifyEmailMFARequest, EnableAppMFARequest, VerifyAppMFARequest, EnableSMSMFARequest, VerifySMSMFARequest, GenerateRecoveryCodesRequest, RecoveryCodesResponse
from typing import List
from uuid import uuid4
from passlib.hash import bcrypt
import jwt
from datetime import datetime, timedelta
import requests
import os

router = APIRouter()
users: List[User] = []
JWT_SECRET = "secret"
JWT_ALGORITHM = "HS256"
blacklisted_tokens = set()
active_sessions = {}
roles = {}
permissions = {}

email_mfa_codes = {}
app_mfa_secrets = {}
sms_mfa_codes = {}
recovery_codes = {}
hardware_keys = {}

@router.post("/register_hardware_key", response_model=HardwareKeyResponse)
def register_hardware_key(payload: RegisterHardwareKeyRequest):
    """
    Register a FIDO2/WebAuthn hardware key for the user (placeholder).
    """
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    hardware_keys[payload.email] = payload.credential_data
    return HardwareKeyResponse(success=True, message="Hardware key registered")

@router.post("/authenticate_hardware_key", response_model=HardwareKeyResponse)
def authenticate_hardware_key(payload: AuthenticateHardwareKeyRequest):
    """
    Authenticate using a FIDO2/WebAuthn hardware key (placeholder).
    """
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.email not in hardware_keys:
        return HardwareKeyResponse(success=False, message="No hardware key registered")
    # Placeholder: In production, verify assertion_data using FIDO2/WebAuthn libraries
    return HardwareKeyResponse(success=True, message="Hardware key authentication successful")

@router.post("/generate_recovery_codes", response_model=RecoveryCodesResponse)
def generate_recovery_codes(payload: GenerateRecoveryCodesRequest):
    """
    Generate and return a set of MFA recovery codes for the user.
    """
    import secrets
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    codes = [secrets.token_hex(4) for _ in range(10)]
    recovery_codes[payload.email] = codes
    return RecoveryCodesResponse(codes=codes)

@router.post("/enable_sms_mfa")
def enable_sms_mfa(payload: EnableSMSMFARequest):
    """
    Enable SMS-based MFA: generate a code and (simulate) send to user's phone.
    """
    import random
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = f"{random.randint(100000, 999999)}"
    sms_mfa_codes[payload.email] = code
    # Simulate sending SMS
    print(f"SMS MFA code for {payload.phone}: {code}")
    return {"message": f"MFA code sent to {payload.phone}"}

@router.post("/verify_sms_mfa")
def verify_sms_mfa(payload: VerifySMSMFARequest):
    """
    Verify SMS MFA code and enable MFA for the user.
    """
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = sms_mfa_codes.get(payload.email)
    if not code or code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid MFA code")
    user.mfa_enabled = True
    del sms_mfa_codes[payload.email]
    return {"message": f"SMS MFA enabled for {payload.email}"}

@router.post("/enable_app_mfa")
def enable_app_mfa(payload: EnableAppMFARequest):
    """
    Enable app-based MFA: generate a TOTP secret and return provisioning URI.
    """
    import pyotp
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    secret = pyotp.random_base32()
    app_mfa_secrets[payload.email] = secret
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=payload.email, issuer_name="FamilyTree")
    return {"secret": secret, "provisioning_uri": provisioning_uri}

@router.post("/verify_app_mfa")
def verify_app_mfa(payload: VerifyAppMFARequest):
    """
    Verify app MFA TOTP code and enable MFA for the user.
    """
    import pyotp
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    secret = app_mfa_secrets.get(payload.email)
    if not secret:
        raise HTTPException(status_code=400, detail="App MFA not enabled for this user")
    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")
    user.mfa_enabled = True
    del app_mfa_secrets[payload.email]
    return {"message": f"App MFA enabled for {payload.email}"}

@router.post("/enable_email_mfa")
def enable_email_mfa(payload: EnableEmailMFARequest):
    """
    Enable email-based MFA: generate a code and (simulate) send to user's email.
    """
    import random
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = f"{random.randint(100000, 999999)}"
    email_mfa_codes[payload.email] = code
    # Simulate sending email
    print(f"Email MFA code for {payload.email}: {code}")
    return {"message": f"MFA code sent to {payload.email}"}

@router.post("/verify_email_mfa")
def verify_email_mfa(payload: VerifyEmailMFARequest):
    """
    Verify email MFA code and enable MFA for the user.
    """
    user = next((u for u in users if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = email_mfa_codes.get(payload.email)
    if not code or code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid MFA code")
    user.mfa_enabled = True
    del email_mfa_codes[payload.email]
    return {"message": f"Email MFA enabled for {payload.email}"}

@router.post("/link_social_account")
def link_social_account(payload: SocialAccountLinkRequest):
    """
    Link a social account to an existing user profile.
    """
    user = next((u for u in users if u.email == payload.user_email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if already linked
    for acc in user.linked_accounts:
        if acc.get("provider") == payload.provider and acc.get("provider_id") == payload.provider_id:
            return {"message": "Account already linked"}
    user.linked_accounts.append({
        "provider": payload.provider,
        "provider_id": payload.provider_id,
        "access_token": payload.access_token
    })
    return {"message": f"{payload.provider} account linked to {payload.user_email}"}

def create_jwt(user_id: str, expires_delta: timedelta):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + expires_delta
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a digit")
    if not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in password):
        raise HTTPException(status_code=400, detail="Password must contain a special character")

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    if any(u.email == payload.email for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")
    validate_password(payload.password)
    user = User(
        id=uuid4(),
        email=payload.email,
        password_hash=bcrypt.hash(payload.password),
        is_active=True,
        roles=[],
        mfa_enabled=False
    )
    users.append(user)
    return user

@router.post("/assign_role")
def assign_role(email: str, role_name: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role_name not in roles:
        roles[role_name] = []
    if role_name not in user.roles:
        user.roles.append(role_name)
    return {"message": f"Role {role_name} assigned to {email}"}

@router.post("/revoke_role")
def revoke_role(email: str, role_name: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role_name in user.roles:
        user.roles.remove(role_name)
    return {"message": f"Role {role_name} revoked from {email}"}

@router.post("/add_permission")
def add_permission(email: str, permission: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if email not in permissions:
        permissions[email] = []
    if permission not in permissions[email]:
        permissions[email].append(permission)
    return {"message": f"Permission {permission} added to {email}"}

@router.post("/remove_permission")
def remove_permission(email: str, permission: str):
    if email in permissions and permission in permissions[email]:
        permissions[email].remove(permission)
        return {"message": f"Permission {permission} removed from {email}"}
    raise HTTPException(status_code=404, detail="Permission not found")

@router.post("/inherit_role_permissions")
def inherit_role_permissions(email: str, role_name: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role_name not in roles:
        raise HTTPException(status_code=404, detail="Role not found")
    if email not in permissions:
        permissions[email] = []
    for perm in roles[role_name]:
        if perm not in permissions[email]:
            permissions[email].append(perm)
    return {"message": f"Permissions from role {role_name} inherited by {email}"}

login_attempts = {}

@router.post("/login/linkedin", response_model=TokenResponse)
def login_linkedin(payload: LinkedInLoginRequest):
    """
    LinkedIn social login endpoint.
    Accepts a LinkedIn access token, verifies it, and returns JWT tokens.
    """
    # Get user's email from LinkedIn API
    email_resp = requests.get(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        headers={"Authorization": f"Bearer {payload.access_token}"}
    )
    if email_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid LinkedIn access token")
    email_data = email_resp.json()
    elements = email_data.get("elements", [])
    if not elements or "handle~" not in elements[0] or "emailAddress" not in elements[0]["handle~"]:
        raise HTTPException(status_code=400, detail="LinkedIn account missing email or permission not granted")
    email = elements[0]["handle~"]["emailAddress"]
    # Find or create user
    user = next((u for u in users if u.email == email), None)
    if not user:
        user = User(
            id=uuid4(),
            email=email,
            password_hash="",
            is_active=True,
            roles=[],
            mfa_enabled=False
        )
        users.append(user)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login/apple", response_model=TokenResponse)
def login_apple(payload: AppleLoginRequest):
    """
    Apple social login endpoint.
    Accepts an Apple ID token, verifies it, and returns JWT tokens.
    """
    import base64
    import json
    from jose import jwt as jose_jwt
    # Get Apple's public keys
    keys_resp = requests.get("https://appleid.apple.com/auth/keys")
    if keys_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch Apple public keys")
    keys = keys_resp.json()["keys"]
    # Decode header to get kid
    header = jose_jwt.get_unverified_header(payload.id_token)
    key = next((k for k in keys if k["kid"] == header["kid"]), None)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid Apple ID token (kid mismatch)")
    # Construct public key
    from jose import jwk
    from jose.utils import base64url_decode
    public_key = jwk.construct(key)
    message, encoded_sig = payload.id_token.rsplit('.', 1)
    decoded_sig = base64url_decode(encoded_sig.encode())
    if not public_key.verify(message.encode(), decoded_sig):
        raise HTTPException(status_code=401, detail="Invalid Apple ID token signature")
    claims = jose_jwt.get_unverified_claims(payload.id_token)
    email = claims.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Apple account missing email")
    # Find or create user
    user = next((u for u in users if u.email == email), None)
    if not user:
        user = User(
            id=uuid4(),
            email=email,
            password_hash="",
            is_active=True,
            roles=[],
            mfa_enabled=False
        )
        users.append(user)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login/facebook", response_model=TokenResponse)
def login_facebook(payload: FacebookLoginRequest):
    """
    Facebook social login endpoint.
    Accepts a Facebook access token, verifies it, and returns JWT tokens.
    """
    # Verify token with Facebook Graph API
    resp = requests.get(
        "https://graph.facebook.com/me",
        params={
            "fields": "id,email",
            "access_token": payload.access_token
        }
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Facebook access token")
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Facebook account missing email or email permission not granted")
    # Find or create user
    user = next((u for u in users if u.email == email), None)
    if not user:
        user = User(
            id=uuid4(),
            email=email,
            password_hash="",
            is_active=True,
            roles=[],
            mfa_enabled=False
        )
        users.append(user)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login/google", response_model=TokenResponse)
def login_google(payload: GoogleLoginRequest):
    """
    Google social login endpoint.
    Accepts a Google ID token, verifies it, and returns JWT tokens.
    """
    # Get Google client ID from secrets
    with open(os.path.join(os.path.dirname(__file__), "../../secrets/google_client_id.txt")) as f:
        GOOGLE_CLIENT_ID = f.read().strip()
    # Verify token with Google
    resp = requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": payload.id_token}
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google ID token")
    data = resp.json()
    if data.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid Google client ID")
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account missing email")
    # Find or create user
    user = next((u for u in users if u.email == email), None)
    if not user:
        user = User(
            id=uuid4(),
            email=email,
            password_hash="",
            is_active=True,
            roles=[],
            mfa_enabled=False
        )
        users.append(user)
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    now = datetime.utcnow()
    attempts = login_attempts.get(payload.email, [])
    # Remove attempts older than 10 minutes
    attempts = [t for t in attempts if (now - t).total_seconds() < 600]
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    user = next((u for u in users if u.email == payload.email), None)
    if not user or not bcrypt.verify(payload.password, user.password_hash):
        attempts.append(now)
        login_attempts[payload.email] = attempts
        raise HTTPException(status_code=401, detail="Invalid credentials")
    login_attempts[payload.email] = []
    access_token = create_jwt(str(user.id), timedelta(minutes=30))
    refresh_token = create_jwt(str(user.id), timedelta(days=7))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh_token", response_model=TokenResponse)
def refresh_token(token: str):
    if token in blacklisted_tokens:
        raise HTTPException(status_code=401, detail="Token blacklisted")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access_token = create_jwt(user_id, timedelta(minutes=30))
    refresh_token = create_jwt(user_id, timedelta(days=7))
    active_sessions[user_id] = access_token
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/blacklist_token")
def blacklist_token(token: str):
    blacklisted_tokens.add(token)
    return {"message": "Token blacklisted"}

@router.get("/sessions")
def list_sessions():
    return active_sessions

@router.post("/reset_password")
def reset_password(email: str, new_password: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    validate_password(new_password)
    user.password_hash = bcrypt.hash(new_password)
    # Placeholder: send email with reset confirmation
    return {"message": f"Password reset for {email}"}

@router.post("/recover_account")
def recover_account(email: str, new_password: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    validate_password(new_password)
    user.password_hash = bcrypt.hash(new_password)
    # Placeholder: send email with recovery confirmation
    return {"message": f"Account recovered for {email}"}

@router.post("/verify_account")
def verify_account(email: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True  # Simulate verification
    # Placeholder: send verification email
    return {"message": f"Account verified for {email}"}

@router.post("/deactivate_account")
def deactivate_account(email: str):
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    return {"message": f"Account deactivated for {email}"}

@router.post("/delete_account")
def delete_account(email: str):
    global users
    user = next((u for u in users if u.email == email), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users = [u for u in users if u.email != email]
    # Placeholder: remove user data per GDPR
    return {"message": f"Account deleted for {email}"}
