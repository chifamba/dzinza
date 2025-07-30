from fastapi import (
    FastAPI, Depends, Query, HTTPException, status, Path
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from datetime import datetime
import jwt
import asyncpg
import os

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Admin & Moderation Service",
    description="API for managing abuse, user disputes, and content moderation.",
    version="1.0.0"
)
logger = setup_logging("AdminModerationService")

app.include_router(get_healthcheck_router("AdminModerationService"))

security = HTTPBearer()

# --- Pydantic Models ---

class AbuseReport(BaseModel):
    id: UUID
    reporter_id: UUID
    reported_user_id: UUID
    reason: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

class BanAction(BaseModel):
    user_id: UUID
    banned_by: UUID
    reason: str
    banned_at: datetime

class ReportInput(BaseModel):
    reported_user_id: UUID
    reason: str = Field(..., min_length=10, max_length=1000)

class ResolveReportInput(BaseModel):
    status: str = Field(..., pattern="^(RESOLVED|REJECTED)$")

class BanUserInput(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)

class PaginatedResponse(BaseModel):
    data: List[AbuseReport]
    page: int
    limit: int
    total_records: int
    total_pages: int

# --- JWT and Permissions ---

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT and return user payload."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return {"user_id": UUID(user_id), "roles": payload.get("roles", [])}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_role(role: str):
    """Dependency to check for a specific user role."""
    def role_checker(user: dict = Depends(get_current_user)):
        if role not in user.get("roles", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires '{role}' role")
        return user
    return role_checker

# --- Database Pool ---

@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    logger.info("Database pool created.")

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()
    logger.info("Database pool closed.")

async def get_db_pool():
    return app.state.db_pool

# --- API Endpoints ---

@app.get(
    "/admin/reports",
    response_model=PaginatedResponse,
    summary="Fetch submitted abuse or conflict reports",
    dependencies=[Depends(require_role("moderator"))]
)
async def get_reports(
    status: Optional[str] = Query(None, enum=["OPEN", "RESOLVED", "REJECTED"]),
    reporter_id: Optional[UUID] = Query(None),
    reported_user_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Fetches abuse reports with optional filters and pagination.
    Requires 'moderator' role.
    """
    filters, params = [], []
    if status:
        params.append(status)
        filters.append(f"status = ${len(params)}")
    if reporter_id:
        params.append(reporter_id)
        filters.append(f"reporter_id = ${len(params)}")
    if reported_user_id:
        params.append(reported_user_id)
        filters.append(f"reported_user_id = ${len(params)}")

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    offset = (page - 1) * limit

    query = f"""
        SELECT id, reporter_id, reported_user_id, reason, status, created_at, resolved_at
        FROM abuse_reports {where_clause}
        ORDER BY created_at DESC
        OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}
    """

    count_query = f"SELECT COUNT(*) FROM abuse_reports {where_clause}"

    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params, offset, limit)
        total_records = await conn.fetchval(count_query, *params)

    total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

    return {
        "data": [AbuseReport(**dict(r)) for r in records],
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages,
    }

@app.post(
    "/admin/users/{userId}/ban",
    response_model=BanAction,
    status_code=status.HTTP_201_CREATED,
    summary="Ban malicious users",
    dependencies=[Depends(require_role("admin"))]
)
async def ban_user(
    userId: UUID,
    ban_input: BanUserInput,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user),
):
    """
    Bans a user. Requires 'admin' role.
    """
    banned_by = current_user["user_id"]
    banned_at = datetime.utcnow()

    query = """
        INSERT INTO ban_actions (user_id, banned_by, reason, banned_at)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, banned_by, reason, banned_at
    """

    try:
        result = await pool.fetchrow(query, userId, banned_by, ban_input.reason, banned_at)
        if not result:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create ban record")

        # Also, update the user's status in the users table
        await pool.execute("UPDATE users SET is_banned = TRUE WHERE id = $1", userId)

    except asyncpg.exceptions.ForeignKeyViolationError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    except Exception as e:
        logger.error(f"Error banning user {userId}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

    return BanAction(**dict(result))

@app.put(
    "/admin/reports/{reportId}/resolve",
    response_model=AbuseReport,
    summary="Resolve or reject an abuse report",
    dependencies=[Depends(require_role("moderator"))]
)
async def resolve_report(
    reportId: UUID,
    resolve_input: ResolveReportInput,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Updates the status of an abuse report to 'RESOLVED' or 'REJECTED'.
    Requires 'moderator' role.
    """
    resolved_at = datetime.utcnow()

    query = """
        UPDATE abuse_reports
        SET status = $1, resolved_at = $2
        WHERE id = $3 AND status = 'OPEN'
        RETURNING *
    """

    result = await pool.fetchrow(query, resolve_input.status, resolved_at, reportId)

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Open report with the given ID not found")

    return AbuseReport(**dict(result))
