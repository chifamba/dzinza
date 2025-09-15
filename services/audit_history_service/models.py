"""Audit log models for Audit History Service."""

from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(JSON, nullable=True)
