"""Data models for auth_service service."""

from sqlalchemy import create_engine, Column, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid

# Association table for User and Role many-to-many relationship
user_role_association = Table(
    'user_role_association', Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'))
)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # Nullable for social logins
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    roles = relationship("Role", secondary=user_role_association, back_populates="users")
    linked_accounts = relationship("LinkedAccount", back_populates="user")

class Role(Base):
    __tablename__ = "roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    users = relationship("User", secondary=user_role_association, back_populates="roles")

class LinkedAccount(Base):
    __tablename__ = "linked_accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    provider = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    user = relationship("User", back_populates="linked_accounts")

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, index=True, nullable=False)
