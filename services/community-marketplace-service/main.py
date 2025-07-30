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
logger = setup_logging("community-marketplace-service")

app.include_router(get_healthcheck_router("community-marketplace-service"))

security = HTTPBearer()

class MarketplaceItem(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

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

@app.get("/marketplace/items", response_model=List[MarketplaceItem], tags=["Marketplace"])
async def list_items(
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    filters = []
    params = []
    if category:
        filters.append("category = $%d" % (len(params) + 1))
        params.append(category)
    if tags:
        filters.append("tags && $%d" % (len(params) + 1))
        params.append(tags)
    where_clause = "WHERE " + " AND ".join(filters) if filters else ""
    offset = (page - 1) * limit
    query = (
        "SELECT id, user_id, title, description, category, tags, created_at, updated_at "
        "FROM marketplace_items "
        f"{where_clause} "
        "ORDER BY created_at DESC "
        f"OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}"
    )
    params.extend([offset, limit])
    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params)
    if not records:
        raise HTTPException(status_code=404, detail="No items found")
    return [MarketplaceItem(**dict(r)) for r in records]

@app.post("/marketplace/items", response_model=MarketplaceItem, status_code=201, tags=["Marketplace"])
async def create_item(
    body: dict = Body(...),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    item_id = uuid4()
    now = datetime.utcnow()
    query = """
        INSERT INTO marketplace_items (id, user_id, title, description, category, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING id, user_id, title, description, category, tags, created_at, updated_at
    """
    async with pool.acquire() as conn:
        result = await conn.fetchrow(query, str(item_id), str(token["user_id"]), body.get("title"), body.get("description"), body.get("category"), body.get("tags", []), now)
    if not result:
        raise HTTPException(status_code=500, detail="Item creation failed")
    return MarketplaceItem(**dict(result))

@app.get("/marketplace/items/{id}", response_model=MarketplaceItem, tags=["Marketplace"])
async def get_item(
    id: UUID = Path(..., description="Item ID"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    query = "SELECT * FROM marketplace_items WHERE id = $1"
    async with pool.acquire() as conn:
        item = await conn.fetchrow(query, str(id))
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return MarketplaceItem(**dict(item))

@app.put("/marketplace/items/{id}", response_model=MarketplaceItem, tags=["Marketplace"])
async def update_item(
    id: UUID = Path(..., description="Item ID"),
    body: dict = Body(...),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    now = datetime.utcnow()
    query = """
        UPDATE marketplace_items SET title = $2, description = $3, category = $4, tags = $5, updated_at = $6
        WHERE id = $1
        RETURNING *
    """
    async with pool.acquire() as conn:
        item = await conn.fetchrow(query, str(id), body.get("title"), body.get("description"), body.get("category"), body.get("tags", []), now)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return MarketplaceItem(**dict(item))

@app.delete("/marketplace/items/{id}", status_code=204, tags=["Marketplace"])
async def delete_item(
    id: UUID = Path(..., description="Item ID"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    query = "DELETE FROM marketplace_items WHERE id = $1 RETURNING id"
    async with pool.acquire() as conn:
        result = await conn.fetchrow(query, str(id))
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    return
