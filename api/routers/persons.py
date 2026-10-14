"""Person CRUD.

Pattern follows routers/trees.py:
  - Every route depends on `require_auth`.
  - Cypher is parameterized (no string interpolation).
  - `to_properties` / `from_record` handle Pydantic <-> Neo4j conversion.
  - 404 when the node doesn't exist; 201 on create.

Note: `given_name` / `surname` are stored as native node properties (in
addition to the JSON-encoded `primary_name`) so listing can ORDER BY them
and search can match them with toLower/CONTAINS without parsing JSON.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..auth import require_auth
from ..db import get_driver
from ..db.serialize import from_record, to_properties
from ..models import Person, PersonCreate, PersonName

router = APIRouter(prefix="/api", tags=["persons"])


class RelationshipSummary(BaseModel):
    """A RELATIONSHIP edge, summarized from the other person's perspective."""

    id: Optional[UUID] = None
    type: str
    other_person_id: UUID
    other_person_name: str


class PersonDetail(Person):
    """Person with their relationships summarized."""

    relationships: List[RelationshipSummary] = []


def _with_search_props(props: dict, primary_name: PersonName) -> dict:
    """Denormalize given/surname as native props for ORDER BY + search."""
    props["given_name"] = primary_name.given_name
    props["surname"] = primary_name.surname
    return props


@router.post(
    "/trees/{tree_id}/persons",
    response_model=Person,
    status_code=status.HTTP_201_CREATED,
)
def create_person(
    tree_id: UUID, body: PersonCreate, _: None = Depends(require_auth)
):
    person = Person(**body.model_dump(), tree_ids=[tree_id])
    props = _with_search_props(to_properties(person), person.primary_name)
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (t:FamilyTree {id: $tree_id})
            CREATE (p:Person $props)
            CREATE (t)-[:HAS_MEMBER]->(p)
            RETURN p
            """,
            tree_id=str(tree_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        return from_record(Person, dict(record["p"]))


@router.get("/trees/{tree_id}/persons", response_model=List[Person])
def list_persons(tree_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $tree_id})-[:HAS_MEMBER]->(p:Person)
            RETURN p ORDER BY p.surname, p.given_name
            """,
            tree_id=str(tree_id),
        )
        return [from_record(Person, dict(r["p"])) for r in result]


@router.get("/trees/{tree_id}/persons/search", response_model=List[Person])
def search_persons(
    tree_id: UUID, q: str = Query(...), _: None = Depends(require_auth)
):
    """Case-insensitive substring match on names.

    given_name/surname hit the native props; nickname and praise names /
    aliases live inside the JSON-encoded primary_name / alternate_names,
    so those are matched via toString (empty lists stay native, hence the
    toString guard).
    """
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $tree_id})-[:HAS_MEMBER]->(p:Person)
            WHERE toLower(p.given_name) CONTAINS toLower($q)
               OR toLower(p.surname) CONTAINS toLower($q)
               OR toLower(toString(p.primary_name)) CONTAINS toLower($q)
               OR toLower(toString(p.alternate_names)) CONTAINS toLower($q)
            RETURN p ORDER BY p.surname, p.given_name
            """,
            tree_id=str(tree_id),
            q=q,
        )
        return [from_record(Person, dict(r["p"])) for r in result]


@router.get("/persons/{person_id}", response_model=PersonDetail)
def get_person(person_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $id})
            OPTIONAL MATCH (p)-[r:RELATIONSHIP]-(other:Person)
            RETURN p, collect({
                id: r.id,
                type: r.type,
                other_person_id: other.id,
                other_person_name: coalesce(
                    other.given_name + ' ' + other.surname, 'Unknown'
                )
            }) AS rel_data
            """,
            id=str(person_id),
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        person = from_record(Person, dict(record["p"]))
        summaries = [
            RelationshipSummary(**d)
            for d in record["rel_data"]
            if d["type"] is not None
        ]
        return PersonDetail(**person.model_dump(), relationships=summaries)


@router.patch("/persons/{person_id}", response_model=Person)
def update_person(
    person_id: UUID, body: PersonCreate, _: None = Depends(require_auth)
):
    """Update a person. Only PersonCreate fields are writable — id, tree
    membership, and merge lineage are never touched. The facts list is
    replaced wholesale when provided.
    """
    props = _with_search_props(to_properties(body), body.primary_name)
    with get_driver().session() as session:
        record = session.run(
            "MATCH (p:Person {id: $id}) SET p += $props RETURN p",
            id=str(person_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        return from_record(Person, dict(record["p"]))


@router.delete("/persons/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: UUID, _: None = Depends(require_auth)):
    """Delete a person and their life events.

    RELATIONSHIP edges and tree membership are edges and go with the node
    via DETACH DELETE. Destructive and irreversible — the UI must confirm.
    """
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $id})
            OPTIONAL MATCH (p)-[:HAS_EVENT]->(e:LifeEvent)
            DETACH DELETE p, e
            RETURN count(p) AS deleted
            """,
            id=str(person_id),
        ).single()
        if not record or record["deleted"] == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    return None
