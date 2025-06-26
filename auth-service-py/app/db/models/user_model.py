import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin" # Example, if needed

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False) # Email verification status
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.USER, nullable=False)

    # MFA fields
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    # mfa_backup_codes = Column(Text, nullable=True) # Store as encrypted JSON string or separate table

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Verification & Password Reset
    email_verification_token = Column(String, unique=True, nullable=True)
    email_verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    password_reset_token = Column(String, unique=True, nullable=True)
    password_reset_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Social provider info (optional, can be a separate table if supporting multiple)
    # google_provider_id = Column(String, unique=True, nullable=True, index=True)
    # facebook_provider_id = Column(String, unique=True, nullable=True, index=True)

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    # Audit logs could be a separate table linking to user_id

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"
