from fastapi import FastAPI, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import date
import asyncpg
import os
import jwt

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Search & Discovery Service",
    description="API for searching persons, branches, and historical entries.",
    version="1.0.0"
)
logger = setup_logging("SearchDiscoveryService")
app.include_router(get_healthcheck_router("SearchDiscoveryService"))

# --- Pydantic Models ---
class PersonSearchResult(BaseModel):
    id: UUID
    name: str
    birth_date: Optional[date]
    location: Optional[str]
    tree_id: UUID
    match_score: float

class PaginatedSearchResponse(BaseModel):
    data: List[PersonSearchResult]
    page: int
    limit: int
    total_records: int
    total_pages: int

# --- Database Pool ---
@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

async def get_db_pool():
    return app.state.db_pool

# --- Auth ---
def get_current_user(token: str = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": UUID(payload["sub"])}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- API Endpoint ---
@app.get("/search/person", response_model=PaginatedSearchResponse)
async def search_person(
    name: Optional[str] = Query(None, description="Name or partial name"),
    birth_date: Optional[date] = Query(None, description="Exact birth date to filter"),
    location: Optional[str] = Query(None, description="Location to filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    if not any([name, birth_date, location]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one search parameter (name, birth_date, location) must be provided.")

    filters, params = [], []
    param_idx = 1

    # This search is basic. A real implementation would use full-text search (e.g., tsvector in Postgres)
    # or an external search engine like Elasticsearch for better relevance and performance.
    if name:
        params.append(f"%{name}%")
        # Searches in both given name and surname, assuming a JSONB structure for primary_name
        filters.append(f"(primary_name->>'given_name' ILIKE ${param_idx} OR primary_name->>'surname' ILIKE ${param_idx})")
        param_idx += 1
    if birth_date:
        params.append(birth_date)
        filters.append(f"birth_date_exact = ${param_idx}")
        param_idx += 1
    if location:
        params.append(f"%{location}%")
        filters.append(f"birth_place ILIKE ${param_idx}")
        param_idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}"

    offset = (page - 1) * limit

    # The query is simplified. It doesn't join with trees or calculate a real match score.
    base_query = f"""
        SELECT
            p.id,
            p.primary_name->>'given_name' || ' ' || p.primary_name->>'surname' as name,
            p.birth_date_exact as birth_date,
            p.birth_place as location,
            ptl.tree_id,
            1.0 as match_score -- Placeholder score
        FROM persons p
        LEFT JOIN person_tree_link ptl ON p.id = ptl.person_id
        {where_clause}
    """

    count_query = f"SELECT COUNT(p.id) FROM persons p {where_clause}"

    query = f"{base_query} ORDER BY match_score DESC, name LIMIT ${param_idx} OFFSET ${param_idx + 1}"

    try:
        async with pool.acquire() as conn:
            total_records = await conn.fetchval(count_query, *params)

            query_params = params + [limit, offset]
            records = await conn.fetch(query, *query_params)

        if not records:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching persons found.")

        total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

        return {
            "data": [PersonSearchResult(**dict(r)) for r in records],
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
        }
    except Exception as e:
        logger.error(f"Person search query failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Search operation failed.")
