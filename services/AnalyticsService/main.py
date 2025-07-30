from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date
import jwt
import asyncpg

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("AnalyticsService")

app.include_router(get_healthcheck_router("AnalyticsService"))

security = HTTPBearer()

class UsageMetric(BaseModel):
    date: date
    active_users: int
    new_persons: int
    new_relationships: int
    verification_events: int

class ContributorStat(BaseModel):
    user_id: UUID
    username: str
    trust_score: float
    contributions: int

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    try:
        # Replace with your JWT secret and algorithm
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

@app.get("/analytics/usage", response_model=List[UsageMetric], tags=["Analytics"])
async def get_usage_metrics(
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    filters = []
    params = []
    if start_date:
        filters.append("date >= $%d" % (len(params) + 1))
        params.append(start_date)
    if end_date:
        filters.append("date <= $%d" % (len(params) + 1))
        params.append(end_date)
    where_clause = "WHERE " + " AND ".join(filters) if filters else ""
    query = (
        "SELECT date, active_users, new_persons, new_relationships, verification_events "
        "FROM usage_metrics "
        f"{where_clause} "
        "ORDER BY date ASC"
    )
    async with pool.acquire() as conn:
        records = await conn.fetch(query, *params)
    if not records:
        raise HTTPException(status_code=404, detail="No usage metrics found")
    return [UsageMetric(**dict(r)) for r in records]

@app.get("/analytics/top-contributors", response_model=List[ContributorStat], tags=["Analytics"])
async def get_top_contributors(
    limit: int = Query(10, ge=1, le=100, description="Max contributors"),
    token: dict = Depends(verify_jwt)
):
    pool = await get_db_pool()
    query = (
        "SELECT user_id, username, trust_score, contributions "
        "FROM contributor_stats "
        "ORDER BY trust_score DESC, contributions DESC "
        "LIMIT $1"
    )
    async with pool.acquire() as conn:
        records = await conn.fetch(query, limit)
    if not records:
        raise HTTPException(status_code=404, detail="No contributors found")
    return [ContributorStat(**dict(r)) for r in records]
