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
import random

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Deduplication Service",
    description="API for detecting and managing duplicate persons.",
    version="1.0.0"
)
logger = setup_logging("deduplication-service")
app.include_router(get_healthcheck_router("deduplication-service"))

security = HTTPBearer()

# --- Enums and Pydantic Models ---
class SuggestionStatus(str, Enum):
    PENDING = "PENDING"
    MERGED = "MERGED"
    REJECTED = "REJECTED"

class DuplicateCheckRequest(BaseModel):
    person_id: UUID

class DuplicateSuggestion(BaseModel):
    id: UUID
    person1_id: UUID
    person2_id: UUID
    confidence: float = Field(..., ge=0, le=1)
    status: SuggestionStatus
    created_at: datetime

class PaginatedSuggestionResponse(BaseModel):
    data: List[DuplicateSuggestion]
    page: int
    limit: int
    total_records: int
    total_pages: int

class UpdateSuggestionStatus(BaseModel):
    status: SuggestionStatus

# --- Auth ---
def get_current_user(credentials=Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        # A role-check could be added here, e.g., for moderators/admins
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
@app.post("/duplicates/check", response_model=List[DuplicateSuggestion])
async def check_duplicates(
    req: DuplicateCheckRequest,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    This is a mock implementation. A real service would use a sophisticated
    algorithm (e.g., based on name similarity, dates, locations) to find
    potential duplicates and create suggestion records in the database.
    """
    logger.info(f"Checking for duplicates for person_id: {req.person_id}")

    # Mock logic: Find a random person and create a suggestion
    # In a real system, you'd query for similar persons and calculate confidence.
    find_potential_match_query = "SELECT id FROM persons WHERE id != $1 ORDER BY random() LIMIT 1"
    match = await pool.fetchrow(find_potential_match_query, req.person_id)

    if not match:
        return []

    suggestion = DuplicateSuggestion(
        id=uuid4(),
        person1_id=req.person_id,
        person2_id=match['id'],
        confidence=random.uniform(0.7, 0.95),
        status=SuggestionStatus.PENDING,
        created_at=datetime.utcnow()
    )

    # Save the new suggestion
    insert_query = """
        INSERT INTO duplicate_suggestions (id, person1_id, person2_id, confidence, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    """
    await pool.execute(
        insert_query, suggestion.id, suggestion.person1_id, suggestion.person2_id,
        suggestion.confidence, suggestion.status.value, suggestion.created_at
    )

    return [suggestion]

@app.get("/duplicates/suggestions", response_model=PaginatedSuggestionResponse)
async def list_suggestions(
    status: Optional[SuggestionStatus] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool),
    user: dict = Depends(get_current_user)
):
    filters, params = [], []
    idx = 1
    if status:
        params.append(status.value)
        filters.append(f"status = ${idx}")
        idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    count_query = f"SELECT COUNT(*) FROM duplicate_suggestions {where_clause}"
    total_records = await pool.fetchval(count_query, *params)

    offset = (page - 1) * limit
    query = f"""
        SELECT * FROM duplicate_suggestions {where_clause}
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

@app.put("/duplicates/suggestions/{suggestion_id}", response_model=DuplicateSuggestion)
async def update_suggestion_status(
    suggestion_id: UUID,
    update_data: UpdateSuggestionStatus,
    user: dict = Depends(get_current_user), # User for logging/authorization
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    query = """
        UPDATE duplicate_suggestions SET status = $1
        WHERE id = $2
        RETURNING *
    """
    updated_suggestion = await pool.fetchrow(query, update_data.status.value, suggestion_id)

    if not updated_suggestion:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Duplicate suggestion not found")

    # If status is MERGED, you would typically trigger a merge process here.
    if update_data.status == SuggestionStatus.MERGED:
        logger.info(f"Suggestion {suggestion_id} approved for merge by user {user['user_id']}.")
        # (Trigger merge logic here)

    return updated_suggestion
