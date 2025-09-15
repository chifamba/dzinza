"""
Pydantic schemas for Help Support Service
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_FOR_CUSTOMER = "waiting_for_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    GENEALOGY = "genealogy"
    FEATURE_REQUEST = "feature_request"
    OTHER = "other"


class TicketCreate(BaseModel):
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    user_email: EmailStr
    user_id: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_agent: Optional[str] = None
    resolution_notes: Optional[str] = None


class Ticket(BaseModel):
    id: str
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    user_email: EmailStr
    user_id: Optional[str] = None
    assigned_agent: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolution_notes: Optional[str] = None


class MessageCreate(BaseModel):
    ticket_id: str
    content: str
    is_from_agent: bool = False
    agent_id: Optional[str] = None


class Message(BaseModel):
    id: str
    ticket_id: str
    content: str
    is_from_agent: bool
    agent_id: Optional[str] = None
    created_at: datetime


class ChatSessionCreate(BaseModel):
    user_id: str
    user_email: EmailStr
    initial_message: Optional[str] = None


class ChatSession(BaseModel):
    id: str
    user_id: str
    user_email: EmailStr
    agent_id: Optional[str] = None
    status: str
    created_at: datetime
    ended_at: Optional[datetime] = None


class ChatMessage(BaseModel):
    session_id: str
    content: str
    is_from_agent: bool = False
    sender_id: str


class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str
    category: str
    tags: List[str] = []
    is_published: bool = False


class KnowledgeBaseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None


class KnowledgeBase(BaseModel):
    id: str
    title: str
    content: str
    category: str
    tags: List[str]
    is_published: bool
    created_at: datetime
    updated_at: datetime
    view_count: int = 0


class ForumPostCreate(BaseModel):
    title: str
    content: str
    category: str
    user_id: str


class ForumPost(BaseModel):
    id: str
    title: str
    content: str
    category: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    reply_count: int = 0
    view_count: int = 0


class ForumReplyCreate(BaseModel):
    post_id: str
    content: str
    user_id: str


class ForumReply(BaseModel):
    id: str
    post_id: str
    content: str
    user_id: str
    created_at: datetime
