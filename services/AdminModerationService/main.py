from fastapi import (
    FastAPI, Depends, Query, HTTPException, status, Path
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import jwt
import asyncpg

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("AdminModerationService")

app.include_router(get_healthcheck_router("AdminModerationService"))

security = HTTPBearer()


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


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token"
        )
    try:
        # Replace with your JWT secret and algorithm
        payload = jwt.decode(
            credentials.credentials,
            "your_jwt_secret",
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        return {"token": credentials.credentials, "user_id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


DATABASE_URL = (
    "postgresql://dzinza_user:db_password@localhost:5432/dzinza_db"
)


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


@app.get(
    "/admin/reports",
    response_model=Dict[str, Any],
    tags=["Admin Reports"]
)
async def get_reports(
    status: Optional[str] = Query(
        None, description="Filter by report status"
    ),
    reporter_id: Optional[UUID] = Query(
        None, description="Filter by reporter"
    ),
    reported_user_id: Optional[UUID] = Query(
        None, description="Filter by reported user"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    token: str = Depends(verify_jwt)
):
    pool = await get_db_pool()
    filters = []
    params = []
    if status:
        filters.append(
            "status = $%d" % (len(params) + 1)
        )
        params.append(status)
    if reporter_id:
        filters.append(
            "reporter_id = $%d" % (len(params) + 1)
        )
        params.append(str(reporter_id))
    if reported_user_id:
        filters.append(
            "reported_user_id = $%d" % (len(params) + 1)
        )
        params.append(str(reported_user_id))
    where_clause = (
        "WHERE " + " AND ".join(filters) if filters else ""
    )
    offset = (page - 1) * limit

    query = (
        "SELECT id, reporter_id, reported_user_id, reason, status, "
        "created_at, resolved_at "
        "FROM abuse_reports "
        f"{where_clause} "
        "ORDER BY created_at DESC "
        f"OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}"
    )
    params.extend([offset, limit])

    count_query = (
        f"SELECT COUNT(*) FROM abuse_reports {where_clause}"
    )
    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params)
        total_records = await conn.fetchval(count_query, *params[:-2])
    total_pages = (
        (total_records + limit - 1) // limit if total_records else 0
    )
    data = [AbuseReport(**dict(r)) for r in records]
    if not data:
        raise HTTPException(
            status_code=404, detail="No abuse reports found"
        )
    return {
        "data": data,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages
    }


class BanUserRequest(BaseModel):
    reason: str


@app.post(
    "/admin/users/{userId}/ban",
    response_model=BanAction,
    status_code=201,
    tags=["Admin Actions"]
)
async def ban_user(
    userId: UUID = Path(..., description="User ID to ban"),
    body: BanUserRequest = None,
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    if not body or not body.reason:
        raise HTTPException(
            status_code=400, detail="Reason is required"
        )
    banned_by = UUID(token["user_id"])
    banned_at = datetime.utcnow()
    # Example permission check (replace with real logic)
    if not token.get("user_id"):
        raise HTTPException(
            status_code=403, detail="Insufficient permissions"
        )
    query = (
        "INSERT INTO ban_actions (user_id, banned_by, reason, banned_at) "
        "VALUES ($1, $2, $3, $4) "
        "RETURNING user_id, banned_by, reason, banned_at"
    )
    try:
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                query, str(userId), str(banned_by), body.reason, banned_at
            )
    except Exception as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error"
        )
    if not result:
        raise HTTPException(
            status_code=404, detail="User not found"
        )
    return BanAction(**dict(result))
