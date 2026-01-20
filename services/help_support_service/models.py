"""
Database models for Help Support Service
"""

from datetime import datetime
from typing import Optional, Dict, Any
import uuid

class TicketModel:
    """In-memory ticket storage for demo purposes"""
    
    def __init__(self):
        self.tickets: Dict[str, Dict[str, Any]] = {}
        self.messages: Dict[str, list] = {}  # ticket_id -> list of messages
        
    def create_ticket(self, ticket_data: Dict[str, Any]) -> str:
        ticket_id = str(uuid.uuid4())
        now = datetime.now()
        
        ticket = {
            "id": ticket_id,
            "subject": ticket_data["subject"],
            "description": ticket_data["description"],
            "category": ticket_data["category"],
            "priority": ticket_data["priority"],
            "status": "open",
            "user_email": ticket_data["user_email"],
            "user_id": ticket_data.get("user_id"),
            "assigned_agent": None,
            "created_at": now,
            "updated_at": now,
            "resolution_notes": None
        }
        
        self.tickets[ticket_id] = ticket
        self.messages[ticket_id] = []
        return ticket_id
        
    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        return self.tickets.get(ticket_id)
        
    def update_ticket(self, ticket_id: str, updates: Dict[str, Any]) -> bool:
        if ticket_id not in self.tickets:
            return False
            
        self.tickets[ticket_id].update(updates)
        self.tickets[ticket_id]["updated_at"] = datetime.now()
        return True
        
    def get_user_tickets(self, user_email: str) -> list:
        return [
            ticket for ticket in self.tickets.values() 
            if ticket["user_email"] == user_email
        ]
        
    def add_message(self, ticket_id: str, message_data: Dict[str, Any]) -> str:
        if ticket_id not in self.tickets:
            return None
            
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "ticket_id": ticket_id,
            "content": message_data["content"],
            "is_from_agent": message_data["is_from_agent"],
            "agent_id": message_data.get("agent_id"),
            "created_at": datetime.now()
        }
        
        if ticket_id not in self.messages:
            self.messages[ticket_id] = []
            
        self.messages[ticket_id].append(message)
        return message_id
        
    def get_ticket_messages(self, ticket_id: str) -> list:
        return self.messages.get(ticket_id, [])

class ChatModel:
    """In-memory chat session storage for demo purposes"""
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.chat_messages: Dict[str, list] = {}  # session_id -> list of messages
        
    def create_session(self, session_data: Dict[str, Any]) -> str:
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        session = {
            "id": session_id,
            "user_id": session_data["user_id"],
            "user_email": session_data["user_email"],
            "agent_id": None,
            "status": "waiting",
            "created_at": now,
            "ended_at": None
        }
        
        self.sessions[session_id] = session
        self.chat_messages[session_id] = []
        
        # Add initial message if provided
        if session_data.get("initial_message"):
            self.add_message(session_id, {
                "content": session_data["initial_message"],
                "is_from_agent": False,
                "sender_id": session_data["user_id"]
            })
            
        return session_id
        
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(session_id)
        
    def add_message(self, session_id: str, message_data: Dict[str, Any]) -> str:
        if session_id not in self.sessions:
            return None
            
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "session_id": session_id,
            "content": message_data["content"],
            "is_from_agent": message_data["is_from_agent"],
            "sender_id": message_data["sender_id"],
            "created_at": datetime.now()
        }
        
        if session_id not in self.chat_messages:
            self.chat_messages[session_id] = []
            
        self.chat_messages[session_id].append(message)
        return message_id
        
    def get_session_messages(self, session_id: str) -> list:
        return self.chat_messages.get(session_id, [])

class KnowledgeBaseModel:
    """In-memory knowledge base storage for demo purposes"""
    
    def __init__(self):
        self.articles: Dict[str, Dict[str, Any]] = {}
        
    def create_article(self, article_data: Dict[str, Any]) -> str:
        article_id = str(uuid.uuid4())
        now = datetime.now()
        
        article = {
            "id": article_id,
            "title": article_data["title"],
            "content": article_data["content"],
            "category": article_data["category"],
            "tags": article_data.get("tags", []),
            "is_published": article_data.get("is_published", False),
            "created_at": now,
            "updated_at": now,
            "view_count": 0
        }
        
        self.articles[article_id] = article
        return article_id
        
    def get_article(self, article_id: str) -> Optional[Dict[str, Any]]:
        return self.articles.get(article_id)
        
    def search_articles(self, query: str, category: Optional[str] = None) -> list:
        results = []
        query_lower = query.lower()
        
        for article in self.articles.values():
            if not article["is_published"]:
                continue
                
            if category and article["category"] != category:
                continue
                
            if (query_lower in article["title"].lower() or 
                query_lower in article["content"].lower() or
                any(query_lower in tag.lower() for tag in article["tags"])):
                results.append(article)
                
        return results
        
    def increment_view_count(self, article_id: str):
        if article_id in self.articles:
            self.articles[article_id]["view_count"] += 1

# Global instances
ticket_model = TicketModel()
chat_model = ChatModel()
knowledge_base_model = KnowledgeBaseModel()
