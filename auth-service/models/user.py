from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    profile_picture_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(JSON, nullable=True)
    email_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)
    email_verification_token = Column(String(255), nullable=True)
    email_verification_expires = Column(DateTime, nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(Enum("USER", "ADMIN", "MODERATOR", name="userrole"), nullable=False, default="USER")
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    pending_mfa_secret = Column(String(255), nullable=True)
    pending_mfa_secret_expires_at = Column(DateTime, nullable=True)
    mfa_backup_codes_hashed = Column(Text, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(255), nullable=True)
    last_login_user_agent = Column(Text, nullable=True)
    current_session_count = Column(Integer, default=0)
    max_concurrent_sessions = Column(Integer, default=5)
    privacy_settings = Column(JSON, default=dict)
    notification_preferences = Column(JSON, default=dict)
    preferred_language = Column(String(10), default="en")
    timezone = Column(String(50), default="UTC")
    subscription_tier = Column(String(50), default="free")
    subscription_status = Column(String(20), default="active")
    subscription_expires = Column(DateTime, nullable=True)
    billing_info = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at = Column(DateTime, nullable=True)
