"""FamilyTree CRUD.

Pattern for all routers:
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
from ..models import FamilyTree, FamilyTreeCreate

router = APIRouter(prefix="/api/trees", tags=["trees"])


@router.post("", response_model=FamilyTree, status_code=status.HTTP_201_CREATED)
def create_tree(body: FamilyTreeCreate, _: None = Depends(require_auth)):
    tree = FamilyTree(**body.model_dump())
    props = to_properties(tree)
    with get_driver().session() as session:
        record = session.run(
            "CREATE (t:FamilyTree $props) RETURN t",
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Create failed")
        return from_record(FamilyTree, dict(record["t"]))


@router.get("", response_model=list[FamilyTree])
def list_trees(_: None = Depends(require_auth)):
    with get_driver().session() as session:
        result = session.run(
            "MATCH (t:FamilyTree) RETURN t ORDER BY t.name"
        )
        return [from_record(FamilyTree, dict(r["t"])) for r in result]


@router.get("/{tree_id}", response_model=FamilyTree)
def get_tree(tree_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        record = session.run(
            "MATCH (t:FamilyTree {id: $id}) RETURN t",
            id=str(tree_id),
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        return from_record(FamilyTree, dict(record["t"]))


@router.patch("/{tree_id}", response_model=FamilyTree)
def update_tree(tree_id: UUID, body: FamilyTreeCreate, _: None = Depends(require_auth)):
    props = to_properties(FamilyTree(**body.model_dump()))
    props.pop("id", None)  # never change the id
    with get_driver().session() as session:
        record = session.run(
            "MATCH (t:FamilyTree {id: $id}) SET t += $props RETURN t",
            id=str(tree_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        return from_record(FamilyTree, dict(record["t"]))


@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree(tree_id: UUID, _: None = Depends(require_auth)):
    """Delete a tree and everything in it (members, sources, events).

    Relationships between members are edges and go with the nodes.
    This is destructive and irreversible — the UI must confirm.
    """
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            OPTIONAL MATCH (t)-[:HAS_MEMBER]->(p:Person)
            OPTIONAL MATCH (t)-[:HAS_SOURCE]->(s:Source)
            OPTIONAL MATCH (p)-[:HAS_EVENT]->(e:LifeEvent)
            DETACH DELETE t, p, s, e
            RETURN count(t) AS deleted
            """,
            id=str(tree_id),
        ).single()
        if not record or record["deleted"] == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
    return None


@router.get("/{tree_id}/stats")
def tree_stats(tree_id: UUID, _: None = Depends(require_auth)):
    """Member/relationship/source counts for the dashboard."""
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            OPTIONAL MATCH (t)-[:HAS_MEMBER]->(p:Person)
            OPTIONAL MATCH (p)-[r:RELATIONSHIP]->()
            OPTIONAL MATCH (t)-[:HAS_SOURCE]->(s:Source)
            RETURN count(DISTINCT p) AS persons,
                   count(DISTINCT r) AS relationships,
                   count(DISTINCT s) AS sources
            """,
            id=str(tree_id),
        ).single()
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        return {
            "tree_id": str(tree_id),
            "persons": record["persons"],
            "relationships": record["relationships"],
            "sources": record["sources"],
        }
