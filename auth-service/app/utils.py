from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import JWTError, jwt
from pydantic import ValidationError

from .config import settings
from .schemas import TokenPayload # Assuming TokenPayload is defined in schemas.py

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=settings.BCRYPT_ROUNDS)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# JWT Token Creation and Decoding
def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(subject), # Subject can be user_id or email
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    # Add user_id and email to the token if subject is a user object/dict
    if isinstance(subject, dict) and "user_id" in subject and "email" in subject:
        to_encode["user_id"] = str(subject["user_id"])
        to_encode["email"] = subject["email"]
        if "role" in subject:
             to_encode["role"] = subject["role"]
    elif hasattr(subject, 'id') and hasattr(subject, 'email'): # If subject is a User model instance
        to_encode["user_id"] = str(subject.id)
        to_encode["email"] = subject.email
        if hasattr(subject, 'role'):
            to_encode["role"] = subject.role.value if hasattr(subject.role, 'value') else str(subject.role)


    encoded_jwt = jwt.encode(to_encode, settings.ASSEMBLED_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], jti: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "exp": expire,
        "sub": str(subject), # User identifier
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "jti": jti, # JWT ID, unique identifier for this refresh token
        "type": "refresh"
    }
    if isinstance(subject, dict) and "user_id" in subject:
        to_encode["user_id"] = str(subject["user_id"])
    elif hasattr(subject, 'id'):
        to_encode["user_id"] = str(subject.id)

    encoded_jwt = jwt.encode(to_encode, settings.ASSEMBLED_JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str, secret_key: str) -> Optional[TokenPayload]:
    try:
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM], audience=settings.JWT_AUDIENCE, issuer=settings.JWT_ISSUER)
        # Pydantic validation can be added here if needed, but TokenPayload structure is simple
        # For example: return TokenPayload(**payload)
        # For now, returning dict and caller can validate with TokenPayload schema

        # Ensure essential fields are present from the TokenPayload perspective
        # 'sub' is usually the primary identifier. 'user_id' is custom.
        if "sub" not in payload: # or "user_id" not in payload if that's your primary internal key
            raise JWTError("Missing subject in token payload")

        # Map 'sub' to 'user_id' if 'user_id' is not directly in payload but 'sub' is intended to be user_id
        # This depends on how create_access_token sets the 'sub' field.
        # If 'sub' is always the user_id (as a string), then TokenPayload.user_id can get it from there.
        # Let's assume TokenPayload expects user_id.

        # Construct TokenPayload ensuring all fields are present or None
        token_data = {
            "sub": payload.get("sub"),
            "exp": payload.get("exp"),
            "iss": payload.get("iss"),
            "aud": payload.get("aud"),
            "user_id": payload.get("user_id", payload.get("sub")), # Fallback sub to user_id
            "email": payload.get("email"),
            "role": payload.get("role")
        }
        # Validate with Pydantic model
        return TokenPayload(**token_data)

    except JWTError as e:
        # Log the error e.g., logger.error(f"JWT Error: {e}")
        print(f"JWT Decode Error: {e}") # Placeholder for proper logging
        return None
    except ValidationError as e:
        # Log the error e.g., logger.error(f"Token payload validation error: {e}")
        print(f"Token Payload Validation Error: {e}") # Placeholder
        return None

# Email sending utility (placeholder, actual implementation requires SMTP setup)
# This would typically use a library like `emails` or `fastapi-mail`
async def send_email_async(to_email: str, subject: str, html_content: str):
    # This is a mock. In a real app, integrate with an email sending service/library.
    print(f"Sending email to {to_email} with subject '{subject}'")
    print(f"Content:\n{html_content}")
    # Simulate email sending
    # In a real app:
    # from app.config import settings
    # import smtplib
    # from email.mime.text import MIMEText
    #
    # msg = MIMEText(html_content, "html")
    # msg["Subject"] = subject
    # msg["From"] = settings.FROM_EMAIL
    # msg["To"] = to_email
    #
    # try:
    #     with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
    #         if settings.SMTP_TLS:
    #             server.starttls()
    #         if settings.SMTP_USER and settings.ASSEMBLED_SMTP_PASS:
    #             server.login(settings.SMTP_USER, settings.ASSEMBLED_SMTP_PASS)
    #         server.sendmail(settings.FROM_EMAIL, [to_email], msg.as_string())
    #     logger.info(f"Email sent to {to_email}, subject: {subject}")
    # except Exception as e:
    #     logger.error(f"Failed to send email to {to_email}: {e}")
    #     raise # Or handle error appropriately
    pass

async def send_verification_email(email: EmailStr, first_name: str, token: str):
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Verify your email address"
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html_content = f"""
    <html>
        <body>
            <p>Hi {first_name},</p>
            <p>Thanks for registering with {project_name}. Please verify your email address by clicking the link below:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p>If you did not register for {project_name}, please ignore this email.</p>
            <p>Thanks,<br/>The {project_name} Team</p>
        </body>
    </html>
    """
    await send_email_async(email, subject, html_content)

async def send_password_reset_email(email: EmailStr, first_name: str, token: str):
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password Reset Request"
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}" # Ensure this matches frontend route
    html_content = f"""
    <html>
        <body>
            <p>Hi {first_name},</p>
            <p>You requested a password reset for your {project_name} account.</p>
            <p>Please click the link below to set a new password:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <p>This link will expire in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Thanks,<br/>The {project_name} Team</p>
        </body>
    </html>
    """
    await send_email_async(email, subject, html_content)

async def send_welcome_email(email: EmailStr, first_name: str):
    project_name = settings.PROJECT_NAME
    subject = f"Welcome to {project_name}!"
    login_url = f"{settings.FRONTEND_URL}/login"
    html_content = f"""
    <html>
        <body>
            <p>Hi {first_name},</p>
            <p>Welcome to {project_name}! We're excited to have you.</p>
            <p>You can now log in to your account: <a href="{login_url}">{login_url}</a></p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Thanks,<br/>The {project_name} Team</p>
        </body>
    </html>
    """
    await send_email_async(email, subject, html_content)

# Add other utilities like generating random strings, OTPs, etc. as needed.
import secrets
import string

def generate_random_string(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

def generate_otp_code(length: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for i in range(length))

def generate_jti() -> str:
    # Generates a unique JWT ID
    return uuid.uuid4().hex
