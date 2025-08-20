"""Data models for auth_service service."""

from sqlalchemy import Column, String, Boolean, Table, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base
import uuid

# Association table for the many-to-many relationship between users and roles
user_roles = Table('user_roles', Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    social_accounts = relationship("SocialAccount", back_populates="user")

class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)

    users = relationship("User", secondary=user_roles, back_populates="roles")

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    provider = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)

    user = relationship("User", back_populates="social_accounts")
