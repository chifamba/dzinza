from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
import jwt
import asyncpg
import os
import json

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment Variables ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

# --- FastAPI App ---
app = FastAPI(
    title="Audit & History Service",
    description="API for tracking create/update/delete actions for transparency and accountability.",
    version="1.0.0"
)
logger = setup_logging("AuditHistoryService")
app.include_router(get_healthcheck_router("AuditHistoryService"))

security = HTTPBearer()

# --- Pydantic Models ---
class AuditLogEntry(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    user_id: UUID
    action: str = Field(..., pattern="^(CREATE|UPDATE|DELETE)$")
    timestamp: datetime
    details: Dict[str, Any]

class PaginatedAuditLogResponse(BaseModel):
    data: List[AuditLogEntry]
    page: int
    limit: int
    total_records: int
    total_pages: int

# --- JWT & Permissions ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        # This endpoint is sensitive, so we'll restrict it to admins for now.
        # A more granular permission system could be implemented later.
        if "admin" not in payload.get("roles", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires 'admin' role")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

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
    "/audit/logs",
    response_model=PaginatedAuditLogResponse,
    summary="Retrieve audit logs",
    dependencies=[Depends(get_current_user)]
)
async def get_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g., 'user', 'person')"),
    entity_id: Optional[UUID] = Query(None, description="Filter by a specific entity's ID"),
    user_id: Optional[UUID] = Query(None, description="Filter by the user who performed the action"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    filters, params = [], []
    param_idx = 1

    if entity_type:
        params.append(entity_type)
        filters.append(f"entity_type = ${param_idx}")
        param_idx += 1
    if entity_id:
        params.append(entity_id)
        filters.append(f"entity_id = ${param_idx}")
        param_idx += 1
    if user_id:
        params.append(user_id)
        filters.append(f"user_id = ${param_idx}")
        param_idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    offset = (page - 1) * limit

    query = f"""
        SELECT id, entity_type, entity_id, user_id, action, timestamp, details
        FROM audit_log_entries
        {where_clause}
        ORDER BY timestamp DESC
        OFFSET ${param_idx} LIMIT ${param_idx + 1}
    """

    count_query = f"SELECT COUNT(*) FROM audit_log_entries {where_clause}"

    try:
        async with pool.acquire() as conn:
            # Pass offset and limit along with filter parameters
            query_params = params + [offset, limit]
            records = await conn.fetch(query, *query_params)

            # Count query should only use filter parameters
            total_records = await conn.fetchval(count_query, *params)

        total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0

        if not records:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No audit logs found for the given criteria")

        # Process details from JSONB to dict
        processed_records = []
        for r in records:
            record_dict = dict(r)
            if isinstance(record_dict['details'], str):
                record_dict['details'] = json.loads(record_dict['details'])
            processed_records.append(AuditLogEntry(**record_dict))

        return {
            "data": processed_records,
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
        }
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")
