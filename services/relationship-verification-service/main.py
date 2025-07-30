from fastapi import FastAPI, Depends, Query, HTTPException, status, Path, Body
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum
import jwt
import asyncpg
import os

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Relationship Verification Service",
    description="API for suggesting and verifying relationships.",
    version="1.0.0"
)
logger = setup_logging("relationship-verification-service")
app.include_router(get_healthcheck_router("relationship-verification-service"))

security = HTTPBearer()

# --- Enums and Pydantic Models ---
class RelationshipType(str, Enum):
    PARENT_CHILD = "PARENT_CHILD"
    SPOUSE = "SPOUSE"
    SIBLING = "SIBLING"
    OTHER = "OTHER"

class SuggestionStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"

class RelationshipSuggestionCreate(BaseModel):
    person1_id: UUID
    person2_id: UUID
    relationship_type: RelationshipType

class RelationshipSuggestion(RelationshipSuggestionCreate):
    id: UUID
    suggesting_user_id: UUID
    status: SuggestionStatus
    created_at: datetime
    updated_at: datetime

class ConfirmationRequest(BaseModel):
    confirmed: bool

class PaginatedSuggestionResponse(BaseModel):
    data: List[RelationshipSuggestion]
    page: int
    limit: int
    total_records: int
    total_pages: int

# --- Auth ---
def get_current_user(credentials=Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": UUID(payload["sub"])}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- Database Pool ---
@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

async def get_db_pool():
    return app.state.db_pool

# --- API Endpoints ---
@app.post("/relationship-suggestions", response_model=RelationshipSuggestion, status_code=status.HTTP_201_CREATED)
async def create_suggestion(
    suggestion: RelationshipSuggestionCreate,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    now = datetime.utcnow()
    query = """
        INSERT INTO relationship_suggestions (id, suggesting_user_id, person1_id, person2_id, relationship_type, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *
    """
    new_suggestion = await pool.fetchrow(
        query, uuid4(), user["user_id"], suggestion.person1_id, suggestion.person2_id, suggestion.relationship_type.value, SuggestionStatus.PENDING.value, now
    )
    return new_suggestion

@app.get("/relationship-suggestions", response_model=PaginatedSuggestionResponse)
async def list_suggestions(
    status: Optional[SuggestionStatus] = Query(None),
    person_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    filters, params = [], []
    idx = 1
    if status:
        params.append(status.value)
        filters.append(f"status = ${idx}")
        idx += 1
    if person_id:
        params.append(person_id)
        filters.append(f"(person1_id = ${idx} OR person2_id = ${idx})")
        idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    count_query = f"SELECT COUNT(*) FROM relationship_suggestions {where_clause}"
    total_records = await pool.fetchval(count_query, *params)

    offset = (page - 1) * limit
    query = f"""
        SELECT * FROM relationship_suggestions {where_clause}
        ORDER BY created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    records = await pool.fetch(query, *params, limit, offset)

    total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

    return {
        "data": records,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages
    }

@app.get("/relationship-suggestions/{suggestion_id}", response_model=RelationshipSuggestion)
async def get_suggestion(suggestion_id: UUID, pool: asyncpg.Pool = Depends(get_db_pool)):
    suggestion = await pool.fetchrow("SELECT * FROM relationship_suggestions WHERE id = $1", suggestion_id)
    if not suggestion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion not found")
    return suggestion

@app.put("/relationship-suggestions/{suggestion_id}", response_model=RelationshipSuggestion)
async def confirm_or_reject_suggestion(
    suggestion_id: UUID,
    confirmation: ConfirmationRequest,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    # In a real app, this logic would be more complex, potentially requiring confirmations
    # from multiple parties and checking permissions.

    suggestion = await pool.fetchrow("SELECT * FROM relationship_suggestions WHERE id = $1", suggestion_id)
    if not suggestion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion not found")

    if suggestion['status'] != SuggestionStatus.PENDING.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Suggestion has already been actioned")

    new_status = SuggestionStatus.CONFIRMED if confirmation.confirmed else SuggestionStatus.REJECTED

    query = """
        UPDATE relationship_suggestions
        SET status = $1, updated_at = $2
        WHERE id = $3 RETURNING *
    """
    updated_suggestion = await pool.fetchrow(query, new_status.value, datetime.utcnow(), suggestion_id)

    # If confirmed, you might trigger the creation of an actual relationship record
    # in the genealogy service here.
    if new_status == SuggestionStatus.CONFIRMED:
        logger.info(f"Suggestion {suggestion_id} confirmed by user {user['user_id']}.")
        # (Trigger relationship creation logic)

    return updated_suggestion
