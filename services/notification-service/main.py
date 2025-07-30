from fastapi import FastAPI, Depends, Query, HTTPException, status, Path
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
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
    title="Notification Service",
    description="API to manage user notifications.",
    version="1.0.0"
)
logger = setup_logging("notification-service")
app.include_router(get_healthcheck_router("notification-service"))

security = HTTPBearer()

# --- Pydantic Models ---
class Notification(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    message: str
    data: Dict[str, Any]
    read: bool
    created_at: datetime

class PaginatedNotificationResponse(BaseModel):
    data: List[Notification]
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
@app.get("/notifications", response_model=PaginatedNotificationResponse)
async def get_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    user_id = user["user_id"]
    filters = ["user_id = $1"]
    params = [user_id]

    if unread_only:
        filters.append("read = FALSE")

    where_clause = f"WHERE {' AND '.join(filters)}"

    # Adjust parameter indexing for the main query vs count query
    count_params = list(params)
    count_query = f"SELECT COUNT(*) FROM notifications {where_clause}"
    total_records = await pool.fetchval(count_query, *count_params)

    offset = (page - 1) * limit

    query_params = params + [limit, offset]
    query = f"""
        SELECT * FROM notifications {where_clause}
        ORDER BY created_at DESC
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """

    records = await pool.fetch(query, *query_params)

    total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

    return {
        "data": records,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages,
    }

@app.post("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_as_read(
    notification_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    user_id = user["user_id"]

    query = """
        UPDATE notifications
        SET read = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING *
    """

    updated_notification = await pool.fetchrow(query, notification_id, user_id)

    if not updated_notification:
        # We check if the notification exists at all to give a more precise error
        exists = await pool.fetchval("SELECT 1 FROM notifications WHERE id = $1", notification_id)
        if not exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
        else:
            # The notification exists but doesn't belong to the user
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    return updated_notification
