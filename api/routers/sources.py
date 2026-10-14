"""Source CRUD.

Sources are first-class nodes: (:Source) linked via (:FamilyTree)-[:HAS_SOURCE]->(:Source).
Facts reference sources by id (stored on the Person node); deleting a source
leaves those references dangling, which is acceptable — no cascade.

Pattern follows trees.py:
  - Every route depends on `require_auth`.
  - Cypher is parameterized (no string interpolation).
  - `to_properties` / `from_record` handle Pydantic <-> Neo4j conversion.
  - 404 when the node doesn't exist; 201 on create.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_auth
from ..db import get_driver
from ..db.serialize import from_record, to_properties
from ..models import Source, SourceCreate

router = APIRouter(prefix="/api", tags=["sources"])


@router.post(
    "/trees/{tree_id}/sources",
    response_model=Source,
    status_code=status.HTTP_201_CREATED,
)
def create_source(
    tree_id: UUID, body: SourceCreate, _: None = Depends(require_auth)
):
    source = Source(tree_id=tree_id, **body.model_dump())
    props = to_properties(source)
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (t:FamilyTree {id: $tree_id})
            CREATE (s:Source $props)
            CREATE (t)-[:HAS_SOURCE]->(s)
            RETURN s
            """,
            tree_id=str(tree_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        return from_record(Source, dict(record["s"]))


@router.get("/trees/{tree_id}/sources", response_model=list[Source])
def list_sources(tree_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (:FamilyTree {id: $id})-[:HAS_SOURCE]->(s:Source)
            RETURN s ORDER BY s.title
            """,
            id=str(tree_id),
        )
        return [from_record(Source, dict(r["s"])) for r in result]


@router.get("/sources/{source_id}", response_model=Source)
def get_source(source_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        record = session.run(
            "MATCH (s:Source {id: $id}) RETURN s",
            id=str(source_id),
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
        return from_record(Source, dict(record["s"]))


@router.patch("/sources/{source_id}", response_model=Source)
def update_source(
    source_id: UUID, body: SourceCreate, _: None = Depends(require_auth)
):
    with get_driver().session() as session:
        record = session.run(
            "MATCH (s:Source {id: $id}) RETURN s",
            id=str(source_id),
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
        existing = from_record(Source, dict(record["s"]))
        merged = existing.model_copy(update=body.model_dump())
        props = to_properties(merged)
        props.pop("id", None)  # never change the id
        props.pop("tree_id", None)  # never move a source between trees
        record = session.run(
            "MATCH (s:Source {id: $id}) SET s += $props RETURN s",
            id=str(source_id),
            props=props,
        ).single()
        return from_record(Source, dict(record["s"]))


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(source_id: UUID, _: None = Depends(require_auth)):
    """Detach-delete the source node.

    Facts that referenced this source keep the (now-dangling) source_id —
    no cascade, by design.
    """
    with get_driver().session() as session:
        record = session.run(
            "MATCH (s:Source {id: $id}) DETACH DELETE s RETURN count(s) AS deleted",
            id=str(source_id),
        ).single()
        if not record or record["deleted"] == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
    return None
