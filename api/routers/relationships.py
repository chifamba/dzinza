"""Relationship CRUD.

Relationships are Neo4j edges: `(:Person)-[r:RELATIONSHIP]->(:Person)`.
The edge carries the Relationship model's properties (id, type, tree_id,
spousal_status, dates, place, notes) via `to_properties`.

Conventions:
  - SIBLING edges are stored in one direction only; reads query both directions.
  - POST verifies both persons are members of the tree (404 otherwise).
  - Every route depends on `require_auth`. Cypher is parameterized.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_auth
from ..db import get_driver
from ..db.serialize import from_record, to_properties
from ..models import Person, Relationship, RelationshipCreate

router = APIRouter(prefix="/api", tags=["relationships"])


class RelationshipDetail(Relationship):
    """Relationship edge with resolved person display names.

    `other_person_id` / `other_person_name` are populated by person-scoped
    queries (the person on the far end of the edge); they stay None for
    tree-scoped listings.
    """

    person1_name: Optional[str] = None
    person2_name: Optional[str] = None
    other_person_id: Optional[UUID] = None
    other_person_name: Optional[str] = None


def _display_name(person: Person) -> str:
    return f"{person.primary_name.given_name} {person.primary_name.surname}".strip()


def _detail(
    rel: Relationship,
    p1: Person,
    p2: Person,
    focus_id: Optional[UUID] = None,
) -> RelationshipDetail:
    """Assemble a RelationshipDetail from the edge and its endpoint persons."""
    detail = RelationshipDetail(
        **rel.model_dump(),
        person1_name=_display_name(p1),
        person2_name=_display_name(p2),
    )
    if focus_id is not None:
        other = p2 if rel.person1_id == focus_id else p1
        detail.other_person_id = other.id
        detail.other_person_name = _display_name(other)
    return detail


@router.post(
    "/trees/{tree_id}/relationships",
    response_model=Relationship,
    status_code=status.HTTP_201_CREATED,
)
def create_relationship(
    tree_id: UUID, body: RelationshipCreate, _: None = Depends(require_auth)
):
    if body.person1_id == body.person2_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "A person cannot have a relationship with themselves",
        )
    rel = Relationship(tree_id=tree_id, **body.model_dump())
    props = to_properties(rel)
    with get_driver().session() as session:
        # Both persons must be members of the tree; otherwise the MATCH
        # finds nothing and we 404.
        record = session.run(
            """
            MATCH (t:FamilyTree {id: $tree_id})-[:HAS_MEMBER]->(p1:Person {id: $p1}),
                  (t)-[:HAS_MEMBER]->(p2:Person {id: $p2})
            CREATE (p1)-[r:RELATIONSHIP $props]->(p2)
            RETURN r
            """,
            tree_id=str(tree_id),
            p1=str(body.person1_id),
            p2=str(body.person2_id),
            props=props,
        ).single()
        if not record:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Tree not found or one/both persons are not members of it",
            )
        return from_record(Relationship, dict(record["r"]))


@router.get(
    "/trees/{tree_id}/relationships",
    response_model=list[RelationshipDetail],
)
def list_tree_relationships(tree_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        tree = session.run(
            "MATCH (t:FamilyTree {id: $id}) RETURN t",
            id=str(tree_id),
        ).single()
        if not tree:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")

        result = session.run(
            """
            MATCH (t:FamilyTree {id: $tid})-[:HAS_MEMBER]->(p1:Person)
                  -[r:RELATIONSHIP]->(p2:Person)<-[:HAS_MEMBER]-(t)
            WHERE r.tree_id = $tid
            RETURN r, p1, p2
            """,
            tid=str(tree_id),
        )
        details = [
            _detail(
                from_record(Relationship, dict(row["r"])),
                from_record(Person, dict(row["p1"])),
                from_record(Person, dict(row["p2"])),
            )
            for row in result
        ]
        details.sort(key=lambda d: (d.person1_name or "", d.person2_name or ""))
        return details


@router.get(
    "/persons/{person_id}/relationships",
    response_model=list[RelationshipDetail],
)
def list_person_relationships(person_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        person = session.run(
            "MATCH (p:Person {id: $id}) RETURN p",
            id=str(person_id),
        ).single()
        if not person:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")

        # Undirected match: returns each edge once, regardless of direction.
        # This is what makes one-direction SIBLING edges read correctly.
        result = session.run(
            """
            MATCH (p:Person {id: $pid})-[r:RELATIONSHIP]-(other:Person)
            RETURN r, p, other
            """,
            pid=str(person_id),
        )
        details = []
        for row in result:
            rel = from_record(Relationship, dict(row["r"]))
            me = from_record(Person, dict(row["p"]))
            other = from_record(Person, dict(row["other"]))
            # Normalize so person1/person2 always reflect the stored edge
            # direction, then resolve names from the right nodes.
            if rel.person1_id == person_id:
                p1, p2 = me, other
            else:
                p1, p2 = other, me
            details.append(_detail(rel, p1, p2, focus_id=person_id))
        details.sort(key=lambda d: (d.other_person_name or "", d.person1_name or ""))
        return details


@router.delete(
    "/relationships/{rel_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_relationship(rel_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        record = session.run(
            """
            MATCH ()-[r:RELATIONSHIP {id: $rid}]->()
            DELETE r
            RETURN count(r) AS deleted
            """,
            rid=str(rel_id),
        ).single()
        if not record or record["deleted"] == 0:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Relationship not found"
            )
    return None
