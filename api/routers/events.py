"""LifeEvent CRUD.

LifeEvents are Neo4j nodes linked to their person:
  (:Person)-[:HAS_EVENT]->(:LifeEvent)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_auth
from ..db import get_driver
from ..db.serialize import from_record, to_properties
from ..models import LifeEvent, LifeEventCreate

router = APIRouter(prefix="/api", tags=["events"])


@router.post(
    "/persons/{person_id}/events",
    response_model=LifeEvent,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    person_id: UUID, body: LifeEventCreate, _: None = Depends(require_auth)
):
    event = LifeEvent(person_id=person_id, **body.model_dump())
    props = to_properties(event)
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (p:Person {id: $person_id})
            CREATE (e:LifeEvent $props)
            CREATE (p)-[:HAS_EVENT]->(e)
            RETURN e
            """,
            person_id=str(person_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
        return from_record(LifeEvent, dict(record["e"]))


@router.get("/persons/{person_id}/events", response_model=list[LifeEvent])
def list_events(person_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})-[:HAS_EVENT]->(e:LifeEvent)
            RETURN e ORDER BY e.date_exact, e.date_string
            """,
            id=str(person_id),
        )
        return [from_record(LifeEvent, dict(r["e"])) for r in result]


@router.patch("/events/{event_id}", response_model=LifeEvent)
def update_event(
    event_id: UUID, body: LifeEventCreate, _: None = Depends(require_auth)
):
    props = to_properties(body)
    props.pop("id", None)  # never change the id
    with get_driver().session() as session:
        record = session.run(
            "MATCH (e:LifeEvent {id: $id}) SET e += $props RETURN e",
            id=str(event_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
        return from_record(LifeEvent, dict(record["e"]))


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        record = session.run(
            "MATCH (e:LifeEvent {id: $id}) DETACH DELETE e RETURN count(e) AS deleted",
            id=str(event_id),
        ).single()
        if not record or record["deleted"] == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return None
