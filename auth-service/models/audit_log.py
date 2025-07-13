from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from config.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action = Column(String(50), nullable=False)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    details = Column(JSON, nullable=True)
