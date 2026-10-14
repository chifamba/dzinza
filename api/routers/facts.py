"""Fact CRUD.

Facts are NOT Neo4j nodes — they're a JSON list stored in the `facts`
string property on the Person node. All operations read the person,
modify the list in Python, and write the JSON back.
"""

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from neo4j import Session

from ..auth import require_auth
from ..db import get_driver
from ..models import Fact

router = APIRouter(prefix="/api", tags=["facts"])


def _read_facts(session: Session, person_id: UUID) -> list[dict] | None:
    """Return the person's facts as a list of dicts, or None if no such person.

    Handles missing/empty/corrupt `facts` property defensively.
    """
    record = session.run(
        "MATCH (p:Person {id: $id}) RETURN p.facts AS facts_json",
        id=str(person_id),
    ).single()
    if not record:
        return None
    raw = record["facts_json"]
    if not raw:
        return []
    try:
        facts = json.loads(raw)
    except (json.JSONDecodeError, ValueError, TypeError):
        return []
    return facts if isinstance(facts, list) else []


def _write_facts(session: Session, person_id: UUID, facts: list[dict]) -> None:
    session.run(
        "MATCH (p:Person {id: $id}) SET p.facts = $json",
        id=str(person_id),
        json=json.dumps(facts),
    )


@router.get("/persons/{person_id}/facts", response_model=list[Fact])
def list_facts(person_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        facts = _read_facts(session, person_id)
        if facts is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        return [Fact.model_validate(f) for f in facts]


@router.post(
    "/persons/{person_id}/facts",
    response_model=Fact,
    status_code=status.HTTP_201_CREATED,
)
def create_fact(person_id: UUID, body: Fact, _: None = Depends(require_auth)):
    # body.id auto-generates via default_factory when the client omits it.
    with get_driver().session() as session:
        facts = _read_facts(session, person_id)
        if facts is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        facts.append(body.model_dump(mode="json"))
        _write_facts(session, person_id, facts)
        return body


@router.patch("/persons/{person_id}/facts/{fact_id}", response_model=Fact)
def update_fact(
    person_id: UUID, fact_id: UUID, body: Fact, _: None = Depends(require_auth)
):
    with get_driver().session() as session:
        facts = _read_facts(session, person_id)
        if facts is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        for i, f in enumerate(facts):
            if str(f.get("id")) == str(fact_id):
                body.id = fact_id  # the URL identifies the fact; ids don't change
                facts[i] = body.model_dump(mode="json")
                _write_facts(session, person_id, facts)
                return body
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fact not found")


@router.delete(
    "/persons/{person_id}/facts/{fact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_fact(person_id: UUID, fact_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        facts = _read_facts(session, person_id)
        if facts is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        kept = [f for f in facts if str(f.get("id")) != str(fact_id)]
        if len(kept) == len(facts):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fact not found")
        _write_facts(session, person_id, kept)
    return None
