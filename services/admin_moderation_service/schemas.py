"""Pydantic schemas for admin_moderation_service service."""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

from enum import Enum

class ReportCategory(str, Enum):
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    FALSE_INFO = "false_info"
    OTHER = "other"

class ReportPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ModerationLog(BaseModel):
    action: str
    moderator_id: UUID
    target_id: Optional[UUID] = None
    target_type: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[str] = None

class ReportContent(BaseModel):
    reporter_id: UUID
    content_id: UUID
    content_type: str
    reason: str
    category: ReportCategory = ReportCategory.OTHER
    priority: ReportPriority = ReportPriority.LOW
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
