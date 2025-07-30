from fastapi import FastAPI, Depends, Query, HTTPException, status, Path, Body
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
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
    title="Community Marketplace Service",
    description="API for sharing resources, knowledge, and tools.",
    version="1.0.0"
)
logger = setup_logging("community-marketplace-service")
app.include_router(get_healthcheck_router("community-marketplace-service"))

security = HTTPBearer()

# --- Pydantic Models ---
class MarketplaceItemBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=1000)
    category: str = Field(..., max_length=50)
    tags: Optional[List[str]] = []

class MarketplaceItemCreate(MarketplaceItemBase):
    pass

class MarketplaceItem(MarketplaceItemBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

class PaginatedMarketplaceResponse(BaseModel):
    data: List[MarketplaceItem]
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
@app.get("/marketplace/items", response_model=PaginatedMarketplaceResponse)
async def list_items(
    category: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    filters, params = [], []
    idx = 1
    if category:
        params.append(category)
        filters.append(f"category = ${idx}")
        idx += 1
    if tags:
        params.append(tags)
        filters.append(f"tags @> ${idx}") # Check if tags array contains all specified tags
        idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    count_query = f"SELECT COUNT(*) FROM marketplace_items {where_clause}"
    total_records = await pool.fetchval(count_query, *params)

    offset = (page - 1) * limit
    query = f"""
        SELECT * FROM marketplace_items {where_clause}
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

@app.post("/marketplace/items", response_model=MarketplaceItem, status_code=status.HTTP_201_CREATED)
async def create_item(
    item: MarketplaceItemCreate,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    now = datetime.utcnow()
    query = """
        INSERT INTO marketplace_items (id, user_id, title, description, category, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *
    """
    new_item = await pool.fetchrow(
        query, uuid4(), user["user_id"], item.title, item.description, item.category, item.tags, now
    )
    return new_item

@app.get("/marketplace/items/{item_id}", response_model=MarketplaceItem)
async def get_item(item_id: UUID, pool: asyncpg.Pool = Depends(get_db_pool)):
    item = await pool.fetchrow("SELECT * FROM marketplace_items WHERE id = $1", item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item

@app.put("/marketplace/items/{item_id}", response_model=MarketplaceItem)
async def update_item(
    item_id: UUID,
    item_update: MarketplaceItemCreate,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    existing_item = await pool.fetchrow("SELECT user_id FROM marketplace_items WHERE id = $1", item_id)
    if not existing_item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    if existing_item['user_id'] != user['user_id']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot update another user's item")

    query = """
        UPDATE marketplace_items
        SET title = $1, description = $2, category = $3, tags = $4, updated_at = $5
        WHERE id = $6 RETURNING *
    """
    updated_item = await pool.fetchrow(
        query, item_update.title, item_update.description, item_update.category, item_update.tags, datetime.utcnow(), item_id
    )
    return updated_item

@app.delete("/marketplace/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    existing_item = await pool.fetchrow("SELECT user_id FROM marketplace_items WHERE id = $1", item_id)
    if not existing_item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    if existing_item['user_id'] != user['user_id']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot delete another user's item")

    await pool.execute("DELETE FROM marketplace_items WHERE id = $1", item_id)
