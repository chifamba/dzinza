from fastapi import FastAPI, Depends, Query, HTTPException, status, Path, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
import jwt
import asyncpg

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("deduplication-service")

app.include_router(get_healthcheck_router("deduplication-service"))

security = HTTPBearer()

class DuplicateCheckRequest(BaseModel):
    person_id: UUID

class DuplicateSuggestion(BaseModel):
    id: UUID
    person1_id: UUID
    person2_id: UUID
    confidence: float
    status: str
    created_at: datetime

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    try:
        payload = jwt.decode(credentials.credentials, "your_jwt_secret", algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return {"token": credentials.credentials, "user_id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

DATABASE_URL = "postgresql://dzinza_user:db_password@localhost:5432/dzinza_db"

async def get_db_pool():
    if not hasattr(app.state, "db_pool"):
        app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    return app.state.db_pool

@app.on_event("startup")
async def startup():
    await get_db_pool()

@app.on_event("shutdown")
async def shutdown():
    if hasattr(app.state, "db_pool"):
        await app.state.db_pool.close()

@app.post("/duplicates/check", response_model=List[DuplicateSuggestion], tags=["Deduplication"])
async def check_duplicates(
    body: DuplicateCheckRequest = Body(...),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    # NOTE: Replace with real duplicate detection logic
    query = """
        SELECT * FROM duplicate_suggestions
        WHERE person1_id = $1 OR person2_id = $1
        ORDER BY confidence DESC
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, str(body.person_id))
    return [DuplicateSuggestion(**dict(r)) for r in records]

@app.get("/duplicates/suggestions", tags=["Deduplication"])
async def list_suggestions(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    filters = []
    params = []
    if status:
        filters.append("status = $%d" % (len(params) + 1))
        params.append(status)
    where_clause = "WHERE " + " AND ".join(filters) if filters else ""
    offset = (page - 1) * limit
    query = (
        "SELECT id, person1_id, person2_id, confidence, status, created_at "
        "FROM duplicate_suggestions "
        f"{where_clause} "
        "ORDER BY created_at DESC "
        f"OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}"
    )
    params.extend([offset, limit])
    count_query = f"SELECT COUNT(*) FROM duplicate_suggestions {where_clause}"
    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params)
        total_records = await conn.fetchval(count_query, *params[:-2])
    total_pages = (total_records + limit - 1) // limit if total_records else 0
    data = [DuplicateSuggestion(**dict(r)) for r in records]
    return {
        "data": data,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages
    }

@app.put("/duplicates/suggestions/{id}", response_model=DuplicateSuggestion, tags=["Deduplication"])
async def update_suggestion_status(
    id: UUID = Path(..., description="Suggestion ID"),
    body: dict = Body(...),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    status_val = body.get("status")
    if status_val not in ["MERGED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    query = """
        UPDATE duplicate_suggestions SET status = $2
        WHERE id = $1
        RETURNING id, person1_id, person2_id, confidence, status, created_at
    """
    async with pool.acquire() as conn:
        suggestion = await conn.fetchrow(query, str(id), status_val)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Duplicate suggestion not found")
    return DuplicateSuggestion(**dict(suggestion))
