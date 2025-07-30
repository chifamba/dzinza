from fastapi import FastAPI, Depends, HTTPException, status, Body, Query, Path
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, date
import asyncpg
import os
import jwt
from enum import Enum

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"

app = FastAPI(
    title="FamilyTree Genealogy Service",
    description="API for managing family trees, persons, relationships, and more.",
    version="1.0.0"
)
logger = setup_logging("GenealogyService")
app.include_router(get_healthcheck_router("GenealogyService"))

# --- Enums and Pydantic Models ---
class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"

class PrivacySetting(str, Enum):
    PUBLIC = "PUBLIC"
    FAMILY_TREE_ONLY = "FAMILY_TREE_ONLY"
    PRIVATE = "PRIVATE"

class PersonName(BaseModel):
    given_name: str
    surname: str
    nickname: Optional[str] = None

class PersonCreate(BaseModel):
    tree_ids: List[UUID]
    primary_name: PersonName
    gender: Gender
    is_living: bool
    birth_date_string: Optional[str] = None
    death_date_string: Optional[str] = None

class PersonResponse(PersonCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

class RelationshipCreate(BaseModel):
    tree_id: UUID
    person1_id: UUID
    person2_id: UUID
    relationship_type: str

class RelationshipResponse(RelationshipCreate):
    id: UUID

class FamilyTreeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    privacy: PrivacySetting
    root_person_id: UUID

class FamilyTreeResponse(FamilyTreeCreate):
    id: UUID
    owner_id: UUID

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
        return {"user_id": UUID(payload["sub"]), "roles": payload.get("roles", [])}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- API Endpoints ---
@app.post("/familytrees", response_model=FamilyTreeResponse, status_code=status.HTTP_201_CREATED)
async def create_family_tree(tree: FamilyTreeCreate, user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    query = """
        INSERT INTO family_trees (id, name, description, owner_id, root_person_id, privacy)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    """
    new_tree = await pool.fetchrow(
        query, uuid4(), tree.name, tree.description, user["user_id"], tree.root_person_id, tree.privacy.value
    )
    return new_tree

@app.get("/familytrees", response_model=List[FamilyTreeResponse])
async def get_family_trees(user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    # Simplified: returns all trees. A real implementation would check collaborators.
    query = "SELECT * FROM family_trees WHERE owner_id = $1"
    trees = await pool.fetch(query, user["user_id"])
    return trees

@app.post("/persons", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(person: PersonCreate, user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    now = datetime.utcnow()
    query = """
        INSERT INTO persons (id, primary_name, gender, is_living, birth_date_string, death_date_string, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *
    """
    # Note: `primary_name` should be stored as JSONB in a real scenario
    new_person = await pool.fetchrow(
        query, uuid4(), person.primary_name.json(), person.gender.value, person.is_living, person.birth_date_string, person.death_date_string, now
    )
    # Link person to trees
    for tree_id in person.tree_ids:
        await pool.execute("INSERT INTO person_tree_link (person_id, tree_id) VALUES ($1, $2)", new_person['id'], tree_id)

    # Reload to get all fields correctly formatted, this is a simplified approach
    # In a real app, you'd construct the response model more carefully
    person_data = dict(new_person)
    person_data['tree_ids'] = person.tree_ids
    person_data['primary_name'] = PersonName.parse_raw(person_data['primary_name'])
    return PersonResponse(**person_data)


@app.get("/persons/{person_id}", response_model=PersonResponse)
async def get_person(person_id: UUID, user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    query = "SELECT * FROM persons WHERE id = $1"
    person_record = await pool.fetchrow(query, person_id)
    if not person_record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")

    # Fetch linked trees
    tree_query = "SELECT tree_id FROM person_tree_link WHERE person_id = $1"
    tree_links = await pool.fetch(tree_query, person_id)

    person_data = dict(person_record)
    person_data['tree_ids'] = [link['tree_id'] for link in tree_links]
    person_data['primary_name'] = PersonName.parse_raw(person_data['primary_name']) # Assuming JSONB

    return PersonResponse(**person_data)

@app.post("/relationships", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_relationship(rel: RelationshipCreate, user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_db_pool)):
    query = """
        INSERT INTO relationships (id, tree_id, person1_id, person2_id, relationship_type)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
    """
    new_rel = await pool.fetchrow(
        query, uuid4(), rel.tree_id, rel.person1_id, rel.person2_id, rel.relationship_type
    )
    return new_rel

# Additional endpoints from the OpenAPI spec would be implemented here following a similar pattern.
# This includes GET/PUT/DELETE for each resource, search, merge suggestions, etc.
# Due to the complexity, this is a foundational implementation.
