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

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Trust & Access Control Service",
    description="API for managing user trust levels and access permissions.",
    version="1.0.0"
)
logger = setup_logging("trust-access-control-service")
app.include_router(get_healthcheck_router("trust-access-control-service"))

security = HTTPBearer()

# --- Enums and Pydantic Models ---
class AccessType(str, Enum):
    VIEW = "VIEW"
    EDIT = "EDIT"

class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class TrustLevel(BaseModel):
    user_id: UUID
    trust_score: float = Field(..., ge=0, le=100)
    updated_at: datetime

class AccessRequestCreate(BaseModel):
    family_tree_id: UUID
    access_type: AccessType

class AccessRequest(AccessRequestCreate):
    id: UUID
    user_id: UUID
    status: RequestStatus
    requested_at: datetime

class PaginatedAccessRequestResponse(BaseModel):
    data: List[AccessRequest]
    page: int
    limit: int
    total_records: int
    total_pages: int

class UpdateAccessRequestStatus(BaseModel):
    status: RequestStatus

# --- Auth ---
def get_current_user(credentials=Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": UUID(payload["sub"]), "roles": payload.get("roles", [])}
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
@app.get("/trust-levels/{user_id}", response_model=TrustLevel)
async def get_trust_level(user_id: UUID, pool: asyncpg.Pool = Depends(get_db_pool)):
    # In a real system, trust score would be calculated based on various factors.
    # Here, we'll just retrieve a stored value or return a default.
    query = "SELECT user_id, trust_score, updated_at FROM trust_levels WHERE user_id = $1"
    trust_level = await pool.fetchrow(query, user_id)
    if not trust_level:
        # Return a default if not found
        return TrustLevel(user_id=user_id, trust_score=50.0, updated_at=datetime.utcnow())
    return trust_level

@app.post("/access-requests", response_model=AccessRequest, status_code=status.HTTP_201_CREATED)
async def request_access(
    req: AccessRequestCreate,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    query = """
        INSERT INTO access_requests (id, user_id, family_tree_id, access_type, status, requested_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    """
    new_request = await pool.fetchrow(
        query, uuid4(), user["user_id"], req.family_tree_id, req.access_type.value, RequestStatus.PENDING.value, datetime.utcnow()
    )
    return new_request

@app.get("/access-requests", response_model=PaginatedAccessRequestResponse)
async def list_access_requests(
    status: Optional[RequestStatus] = Query(None),
    user_id: Optional[UUID] = Query(None),
    family_tree_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    filters, params = [], []
    idx = 1
    if status:
        params.append(status.value)
        filters.append(f"status = ${idx}")
        idx += 1
    if user_id:
        params.append(user_id)
        filters.append(f"user_id = ${idx}")
        idx += 1
    if family_tree_id:
        params.append(family_tree_id)
        filters.append(f"family_tree_id = ${idx}")
        idx += 1

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    count_query = f"SELECT COUNT(*) FROM access_requests {where_clause}"
    total_records = await pool.fetchval(count_query, *params)

    offset = (page - 1) * limit
    query = f"""
        SELECT * FROM access_requests {where_clause}
        ORDER BY requested_at DESC
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

@app.put("/access-requests/{request_id}", response_model=AccessRequest)
async def update_access_request_status(
    request_id: UUID,
    update_data: UpdateAccessRequestStatus,
    user: dict = Depends(get_current_user), # User for authorization
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    # Authorization check: only the owner of the family tree should approve/reject
    request_to_update = await pool.fetchrow("SELECT ar.*, ft.owner_id FROM access_requests ar JOIN family_trees ft ON ar.family_tree_id = ft.id WHERE ar.id = $1", request_id)

    if not request_to_update:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Access request not found")

    if request_to_update['owner_id'] != user['user_id'] and 'admin' not in user['roles']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the tree owner can modify this request")

    if request_to_update['status'] != RequestStatus.PENDING.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request has already been actioned")

    query = "UPDATE access_requests SET status = $1 WHERE id = $2 RETURNING *"
    updated_request = await pool.fetchrow(query, update_data.status.value, request_id)

    # If approved, add user to collaborators table (this logic would be here)
    if update_data.status == RequestStatus.APPROVED:
        logger.info(f"Access request {request_id} approved. Adding user as collaborator.")
        # (Add collaborator logic here)

    return updated_request
