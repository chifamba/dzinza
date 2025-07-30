from fastapi import FastAPI, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from enum import Enum
import asyncpg
import os
import jwt

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="Graph Query Service",
    description="API for deep traversal and reasoning over the family graph structure.",
    version="1.0.0"
)
logger = setup_logging("GraphQueryService")
app.include_router(get_healthcheck_router("GraphQueryService"))

# --- Enums and Pydantic Models ---
class TraversalDirection(str, Enum):
    ANCESTORS = "ANCESTORS"
    DESCENDANTS = "DESCENDANTS"
    BOTH = "BOTH"

class GraphTraversalRequest(BaseModel):
    start_person_id: UUID
    depth: int = Field(..., ge=1, le=10)
    direction: TraversalDirection

class Node(BaseModel):
    id: UUID
    name: str
    type: str = "PERSON" # Simplified, could also be 'RELATIONSHIP'

class Edge(BaseModel):
    source: UUID = Field(..., alias="from")
    target: UUID = Field(..., alias="to")
    relationship_type: str

class GraphTraversalResult(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

# --- Database Pool ---
@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

async def get_db_pool():
    return app.state.db_pool

# --- Auth ---
def get_current_user(token: str = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": UUID(payload["sub"])}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- API Endpoint ---
@app.post("/graph/traverse", response_model=GraphTraversalResult)
async def traverse_graph(
    req: GraphTraversalRequest,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    # This is a simplified example using CTEs for graph traversal in Postgres.
    # A dedicated graph database like Neo4j or Memgraph would be more efficient for complex traversals.

    base_query = """
    WITH RECURSIVE family_graph AS (
        SELECT person1_id as source, person2_id as target, relationship_type, 1 as level
        FROM relationships
        WHERE {start_condition}

        UNION ALL

        SELECT r.person1_id, r.person2_id, r.relationship_type, fg.level + 1
        FROM relationships r
        JOIN family_graph fg ON {join_condition}
        WHERE fg.level < $2
    )
    SELECT source, target, relationship_type FROM family_graph;
    """

    if req.direction == TraversalDirection.ANCESTORS:
        start_condition = "person2_id = $1"
        join_condition = "r.person2_id = fg.source"
    elif req.direction == TraversalDirection.DESCENDANTS:
        start_condition = "person1_id = $1"
        join_condition = "r.person1_id = fg.target"
    else: # BOTH
        # "BOTH" is more complex and would likely require two separate queries or a more elaborate CTE.
        # For simplicity, we'll treat it as DESCENDANTS for this example.
        logger.warning("'BOTH' direction is complex; this implementation defaults to DESCENDANTS.")
        start_condition = "person1_id = $1"
        join_condition = "r.person1_id = fg.target"

    query = base_query.format(start_condition=start_condition, join_condition=join_condition)

    try:
        edges_records = await pool.fetch(query, req.start_person_id, req.depth)
    except Exception as e:
        logger.error(f"Graph traversal query failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to execute graph traversal.")

    if not edges_records:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No graph results found from the start person.")

    edges = []
    node_ids = {req.start_person_id}
    for record in edges_records:
        edges.append(Edge(from=record['source'], to=record['target'], relationship_type=record['relationship_type']))
        node_ids.add(record['source'])
        node_ids.add(record['target'])

    # Fetch node details
    nodes_query = "SELECT id, primary_name->>'given_name' as name FROM persons WHERE id = ANY($1::uuid[])"
    nodes_records = await pool.fetch(nodes_query, list(node_ids))

    nodes = [Node(id=r['id'], name=r['name']) for r in nodes_records]

    return GraphTraversalResult(nodes=nodes, edges=edges)
