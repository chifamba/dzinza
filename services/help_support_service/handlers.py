"""
Help Support Service Handlers
Provides ticketing system, live chat, knowledge base, and community forums.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Optional
from schemas import (
    TicketCreate, TicketUpdate, Ticket, MessageCreate, Message,
    ChatSessionCreate, ChatSession, ChatMessage,
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBase,
    ForumPostCreate, ForumPost, ForumReplyCreate, ForumReply
)
from models import ticket_model, chat_model, knowledge_base_model
import uuid
from datetime import datetime

router = APIRouter()

# Ticketing System
@router.post("/tickets", response_model=Ticket)
async def create_ticket(ticket_data: TicketCreate):
    """Create a new support ticket"""
    try:
        ticket_id = ticket_model.create_ticket(ticket_data.dict())
        ticket = ticket_model.get_ticket(ticket_id)
        return ticket
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")

@router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    """Get ticket details by ID"""
    ticket = ticket_model.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.put("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, updates: TicketUpdate):
    """Update ticket status, priority, or assignment"""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    success = ticket_model.update_ticket(ticket_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket = ticket_model.get_ticket(ticket_id)
    return ticket

@router.get("/tickets/user/{user_email}", response_model=List[Ticket])
async def get_user_tickets(user_email: str):
    """Get all tickets for a user"""
    tickets = ticket_model.get_user_tickets(user_email)
    return tickets

@router.post("/tickets/{ticket_id}/messages", response_model=Message)
async def add_ticket_message(ticket_id: str, message_data: MessageCreate):
    """Add a message to a ticket"""
    if not ticket_model.get_ticket(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    message_id = ticket_model.add_message(ticket_id, message_data.dict())
    if not message_id:
        raise HTTPException(status_code=500, detail="Failed to add message")
    
    messages = ticket_model.get_ticket_messages(ticket_id)
    message = next((m for m in messages if m["id"] == message_id), None)
    return message

@router.get("/tickets/{ticket_id}/messages", response_model=List[Message])
async def get_ticket_messages(ticket_id: str):
    """Get all messages for a ticket"""
    if not ticket_model.get_ticket(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    messages = ticket_model.get_ticket_messages(ticket_id)
    return messages

# Live Chat System
@router.post("/chat/sessions", response_model=ChatSession)
async def create_chat_session(session_data: ChatSessionCreate):
    """Start a new chat session"""
    try:
        session_id = chat_model.create_session(session_data.dict())
        session = chat_model.get_session(session_id)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")

@router.get("/chat/sessions/{session_id}", response_model=ChatSession)
async def get_chat_session(session_id: str):
    """Get chat session details"""
    session = chat_model.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@router.post("/chat/sessions/{session_id}/messages")
async def add_chat_message(session_id: str, message_data: ChatMessage):
    """Add a message to a chat session"""
    if not chat_model.get_session(session_id):
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    message_id = chat_model.add_message(session_id, message_data.dict())
    if not message_id:
        raise HTTPException(status_code=500, detail="Failed to add message")
    
    return {"message_id": message_id, "status": "sent"}

@router.get("/chat/sessions/{session_id}/messages")
async def get_chat_messages(session_id: str):
    """Get all messages for a chat session"""
    if not chat_model.get_session(session_id):
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = chat_model.get_session_messages(session_id)
    return messages

# WebSocket for real-time chat
@router.websocket("/chat/ws/{session_id}")
async def chat_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    if not chat_model.get_session(session_id):
        await websocket.close(code=4004, reason="Session not found")
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            # Echo the message back for demo purposes
            # In production, this would handle routing to agents
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        pass

# Knowledge Base
@router.post("/knowledge-base", response_model=KnowledgeBase)
async def create_article(article_data: KnowledgeBaseCreate):
    """Create a new knowledge base article"""
    try:
        article_id = knowledge_base_model.create_article(article_data.dict())
        article = knowledge_base_model.get_article(article_id)
        return article
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create article: {str(e)}")

@router.get("/knowledge-base/{article_id}", response_model=KnowledgeBase)
async def get_article(article_id: str):
    """Get knowledge base article by ID"""
    article = knowledge_base_model.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    knowledge_base_model.increment_view_count(article_id)
    article = knowledge_base_model.get_article(article_id)  # Get updated count
    return article

@router.get("/knowledge-base/search", response_model=List[KnowledgeBase])
async def search_knowledge_base(query: str, category: Optional[str] = None):
    """Search knowledge base articles"""
    results = knowledge_base_model.search_articles(query, category)
    return results

# Video Tutorials (placeholder with sample data)
@router.get("/video-tutorials")
async def get_video_tutorials():
    """Get available video tutorials"""
    sample_tutorials = [
        {
            "id": "tutorial_1",
            "title": "Getting Started with Family Trees",
            "description": "Learn how to create your first family tree",
            "duration": "5:30",
            "url": "https://example.com/tutorial1",
            "category": "beginner"
        },
        {
            "id": "tutorial_2", 
            "title": "Adding Photos and Documents",
            "description": "How to upload and organize family photos",
            "duration": "8:15",
            "url": "https://example.com/tutorial2",
            "category": "intermediate"
        },
        {
            "id": "tutorial_3",
            "title": "Verifying Relationships",
            "description": "Best practices for relationship verification",
            "duration": "12:45",
            "url": "https://example.com/tutorial3",
            "category": "advanced"
        }
    ]
    return {"tutorials": sample_tutorials}

# Community Forums (placeholder implementation)
@router.get("/forums")
async def get_forums():
    """Get community forum categories"""
    sample_forums = [
        {
            "id": "general",
            "name": "General Discussion",
            "description": "General genealogy topics",
            "post_count": 1234,
            "latest_post": datetime.now().isoformat()
        },
        {
            "id": "research_help",
            "name": "Research Help",
            "description": "Get help with your research",
            "post_count": 856,
            "latest_post": datetime.now().isoformat()
        },
        {
            "id": "dna_analysis",
            "name": "DNA Analysis",
            "description": "DNA testing and analysis discussions",
            "post_count": 423,
            "latest_post": datetime.now().isoformat()
        }
    ]
    return {"forums": sample_forums}

@router.get("/forums/{forum_id}/posts")
async def get_forum_posts(forum_id: str, page: int = 1, limit: int = 20):
    """Get posts from a specific forum"""
    # Placeholder implementation
    sample_posts = [
        {
            "id": f"post_{i}",
            "title": f"Sample Post {i}",
            "content": f"This is sample content for post {i}",
            "author": f"user_{i}",
            "created_at": datetime.now().isoformat(),
            "reply_count": i * 2,
            "view_count": i * 10
        }
        for i in range(1, min(limit + 1, 11))
    ]
    
    return {
        "forum_id": forum_id,
        "posts": sample_posts,
        "page": page,
        "total_pages": 5,
        "total_posts": 100
    }

# Health check
@router.get("/health")
async def health_check():
    """Service health check"""
    return {
        "status": "healthy",
        "service": "help_support_service",
        "features": {
            "ticketing": "active",
            "live_chat": "active", 
            "knowledge_base": "active",
            "video_tutorials": "active",
            "community_forums": "active"
        },
        "timestamp": datetime.now().isoformat()
    }
