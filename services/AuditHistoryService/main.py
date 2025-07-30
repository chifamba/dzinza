from fastapi import FastAPI, Depends, Query, HTTPException, status
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
logger = setup_logging("AuditHistoryService")

app.include_router(get_healthcheck_router("AuditHistoryService"))

security = HTTPBearer()


class AuditLogEntry(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    user_id: UUID
    action: str
    timestamp: datetime
    details: Dict[str, Any]


def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
    "/audit/logs",
    response_model=Dict[str, Any],
    tags=["Audit Logs"]
)
async def get_audit_logs(
    entity_type: Optional[str] = Query(
        None, description="Filter by entity type"
    ),
    entity_id: Optional[UUID] = Query(
        None, description="Filter by entity ID"
    ),
    user_id: Optional[UUID] = Query(
        None, description="Filter by user ID"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    token: str = Depends(verify_jwt)
):
    pool = await get_db_pool()
    filters = []
    params = []
    if entity_type:
        filters.append(
            "entity_type = $%d" % (len(params) + 1)
        )
        params.append(entity_type)
    if entity_id:
        filters.append(
            "entity_id = $%d" % (len(params) + 1)
        )
        params.append(str(entity_id))
    if user_id:
        filters.append(
            "user_id = $%d" % (len(params) + 1)
        )
        params.append(str(user_id))
    where_clause = (
        "WHERE " + " AND ".join(filters) if filters else ""
    )
    offset = (page - 1) * limit

    query = (
        "SELECT id, entity_type, entity_id, user_id, action, timestamp, details "
        "FROM audit_logs "
        f"{where_clause} "
        "ORDER BY timestamp DESC "
        f"OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}"
    )
    params.extend([offset, limit])

    count_query = (
        f"SELECT COUNT(*) FROM audit_logs {where_clause}"
    )
    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params)
        total_records = await conn.fetchval(count_query, *params[:-2])
    total_pages = (
        (total_records + limit - 1) // limit if total_records else 0
    )
    data = [AuditLogEntry(**dict(r)) for r in records]
    if not data:
        raise HTTPException(
            status_code=404, detail="No audit logs found"
        )
    return {
        "data": data,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages
    }
