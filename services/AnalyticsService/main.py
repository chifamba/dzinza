from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, timedelta
import jwt
import asyncpg
import os

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment Variables ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

# --- FastAPI App ---
app = FastAPI(
    title="Analytics & Insights Service",
    description="API for platform activity metrics and user contribution patterns.",
    version="1.0.0"
)
logger = setup_logging("AnalyticsService")
app.include_router(get_healthcheck_router("AnalyticsService"))

security = HTTPBearer()

# --- Pydantic Models ---
class UsageMetric(BaseModel):
    date: date
    active_users: int
    new_persons: int
    new_relationships: int
    verification_events: int

class ContributorStat(BaseModel):
    user_id: UUID
    username: str
    trust_score: float = Field(..., ge=0, le=100)
    contributions: int = Field(..., ge=0)

# --- JWT & Permissions ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
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
    "/analytics/usage",
    response_model=List[UsageMetric],
    summary="Get general platform usage metrics",
    dependencies=[Depends(get_current_user)]
)
async def get_usage_metrics(
    start_date: date = Query(date.today() - timedelta(days=30)),
    end_date: date = Query(date.today()),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    if start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date cannot be after end_date")

    query = """
        SELECT date, active_users, new_persons, new_relationships, verification_events
        FROM usage_metrics
        WHERE date >= $1 AND date <= $2
        ORDER BY date ASC
    """
    try:
        records = await pool.fetch(query, start_date, end_date)
        if not records:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No usage metrics found for the given date range")
        return [UsageMetric(**dict(r)) for r in records]
    except Exception as e:
        logger.error(f"Error fetching usage metrics: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")

@app.get(
    "/analytics/top-contributors",
    response_model=List[ContributorStat],
    summary="List top contributors",
    dependencies=[Depends(get_current_user)]
)
async def get_top_contributors(
    limit: int = Query(10, ge=1, le=100),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    query = """
        SELECT u.id as user_id, u.username, ts.score as trust_score, c.total_contributions as contributions
        FROM users u
        JOIN trust_scores ts ON u.id = ts.user_id
        JOIN (
            SELECT user_id, COUNT(*) as total_contributions
            FROM contributions
            GROUP BY user_id
        ) c ON u.id = c.user_id
        ORDER BY trust_score DESC, contributions DESC
        LIMIT $1
    """
    try:
        records = await pool.fetch(query, limit)
        if not records:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No contributors found")
        return [ContributorStat(**dict(r)) for r in records]
    except Exception as e:
        logger.error(f"Error fetching top contributors: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")
