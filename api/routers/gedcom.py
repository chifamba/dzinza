"""GEDCOM import/export.

Import parses with the `python-gedcom` library (no hand-rolled parser):
  - INDI records -> Person nodes (+ HAS_MEMBER edges)
  - FAM records  -> SPOUSE + PARENT_CHILD relationship edges
  - SOUR records -> Source nodes (+ HAS_SOURCE edges)

Export generates valid GEDCOM 5.5 text: one FAM record per family
(spouse pair, or single parent with children) — never duplicated.

Pattern follows routers/trees.py: require_auth on every route,
parameterized Cypher, to_properties for model -> node conversion.
"""

import os
import tempfile
from collections import defaultdict
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response

try:
    from gedcom.parser import Parser  # provided by python-gedcom
except ImportError:  # pragma: no cover - only when dep missing
    Parser = None  # type: ignore[assignment]


def _require_parser():
    if Parser is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "GEDCOM support unavailable: python-gedcom is not installed",
        )
    return Parser()

from ..auth import require_auth
from ..db import get_driver
from ..db.serialize import from_record, to_properties
from ..models import (
    FamilyTree,
    Gender,
    Person,
    PersonName,
    Relationship,
    RelationshipType,
    Source,
    SourceType,
)

router = APIRouter(prefix="/api", tags=["gedcom"])

MAX_GEDCOM_BYTES = 50 * 1024 * 1024  # 50 MB sanity cap on uploads


# ---------------------------------------------------------------------------
# python-gedcom element helpers (stable low-level API: tag/value/children)
# ---------------------------------------------------------------------------

def _child_value(element, tag: str) -> str | None:
    for child in element.get_child_elements():
        if child.get_tag() == tag:
            return child.get_value() or None
    return None


def _event_data(element, tag: str) -> tuple[str | None, str | None]:
    """(DATE, PLAC) for a BIRT/DEAT-style sub-record, or (None, None)."""
    for child in element.get_child_elements():
        if child.get_tag() == tag:
            return _child_value(child, "DATE"), _child_value(child, "PLAC")
    return None, None


def _note_text(element) -> str | None:
    """Concatenate NOTE children, honoring CONT/CONC continuations."""
    texts: list[str] = []
    for child in element.get_child_elements():
        if child.get_tag() == "NOTE":
            val = child.get_value() or ""
            for sub in child.get_child_elements():
                if sub.get_tag() == "CONT":
                    val += "\n" + (sub.get_value() or "")
                elif sub.get_tag() == "CONC":
                    val += sub.get_value() or ""
            if val.strip():
                texts.append(val.strip())
    return "\n\n".join(texts) or None


def _parse_name(value: str | None) -> PersonName:
    """GEDCOM 'John /Smith/' -> PersonName(given='John', surname='Smith')."""
    value = (value or "").strip()
    if "/" in value:
        parts = value.split("/")
        given = parts[0].strip()
        surname = parts[1].strip() if len(parts) > 1 else ""
    else:
        given, surname = value, ""
    return PersonName(given_name=given or "Unknown", surname=surname)


def _parse_gender(value: str | None) -> Gender:
    v = (value or "").strip().upper()
    if v == "M":
        return Gender.MALE
    if v == "F":
        return Gender.FEMALE
    return Gender.UNKNOWN


def _is_pointer(value: str | None) -> bool:
    return bool(value) and value.startswith("@") and value.endswith("@") and len(value) > 2


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

@router.post("/trees/import/gedcom", status_code=status.HTTP_201_CREATED)
async def import_gedcom(
    file: UploadFile = File(...), _: None = Depends(require_auth)
):
    raw = await file.read()
    if not raw:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Uploaded file is empty"
        )
    if len(raw) > MAX_GEDCOM_BYTES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"File too large (max {MAX_GEDCOM_BYTES // (1024 * 1024)} MB)",
        )

    # python-gedcom reads from a path, so stage the upload in a temp file.
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".ged", delete=False
        ) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name

        parser = _require_parser()
        try:
            parser.parse_file(tmp_path, strict=False)
        except Exception as exc:  # noqa: BLE001 - malformed input is a 422
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Could not parse GEDCOM file: {exc}",
            ) from exc

        elements = parser.get_root_child_elements()
        individuals = [e for e in elements if e.get_tag() == "INDI"]
        families = [e for e in elements if e.get_tag() == "FAM"]
        source_records = [e for e in elements if e.get_tag() == "SOUR"]

        if not individuals:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "No individuals (INDI records) found in this GEDCOM file",
            )

        element_by_pointer = {
            e.get_pointer(): e for e in elements if e.get_pointer()
        }

        # ---- Build Person models -------------------------------------
        tree_id = uuid4()
        persons: list[Person] = []
        pointer_to_id: dict[str, UUID] = {}
        for indi in individuals:
            pid = uuid4()
            pointer_to_id[indi.get_pointer()] = pid
            birth_date, birth_place = _event_data(indi, "BIRT")
            death_date, death_place = _event_data(indi, "DEAT")
            persons.append(
                Person(
                    id=pid,
                    tree_ids=[tree_id],
                    primary_name=_parse_name(_child_value(indi, "NAME")),
                    gender=_parse_gender(_child_value(indi, "SEX")),
                    birth_date_string=birth_date,
                    birth_place=birth_place,
                    death_date_string=death_date,
                    death_place=death_place,
                    is_living=not death_date,
                    notes=_note_text(indi),
                )
            )

        # ---- Build Relationship models --------------------------------
        relationships: list[Relationship] = []
        seen_pairs: set[tuple[str, str, str]] = set()  # (p1, p2, type) dedup

        def add_rel(p1: UUID, p2: UUID, rtype: RelationshipType):
            if p1 == p2:
                return
            key = (str(p1), str(p2), rtype.value)
            if key in seen_pairs:
                return
            seen_pairs.add(key)
            relationships.append(
                Relationship(
                    tree_id=tree_id,
                    person1_id=p1,
                    person2_id=p2,
                    relationship_type=rtype,
                )
            )

        for fam in families:
            husb = wife = None
            children: list[str] = []
            for child in fam.get_child_elements():
                tag = child.get_tag()
                if tag == "HUSB":
                    husb = child.get_value()
                elif tag == "WIFE":
                    wife = child.get_value()
                elif tag == "CHIL":
                    children.append(child.get_value())
            husb_id = pointer_to_id.get(husb) if _is_pointer(husb) else None
            wife_id = pointer_to_id.get(wife) if _is_pointer(wife) else None
            if husb_id and wife_id:
                add_rel(husb_id, wife_id, RelationshipType.SPOUSE)
            for child_ptr in children:
                if not _is_pointer(child_ptr):
                    continue
                child_id = pointer_to_id.get(child_ptr)
                if not child_id:
                    continue
                if husb_id:
                    add_rel(husb_id, child_id, RelationshipType.PARENT_CHILD)
                if wife_id:
                    add_rel(wife_id, child_id, RelationshipType.PARENT_CHILD)

        # ---- Build Source models ---------------------------------------
        sources: list[Source] = []
        seen_titles: set[str] = set()

        def add_source(title: str | None):
            title = (title or "").strip()
            if not title or title in seen_titles:
                return
            seen_titles.add(title)
            sources.append(
                Source(tree_id=tree_id, title=title, type=SourceType.OTHER)
            )

        for src in source_records:
            add_source(_child_value(src, "TITL") or _child_value(src, "AUTH"))
        # Inline (non-pointer) SOUR text on individuals becomes a source too.
        for indi in individuals:
            for child in indi.get_child_elements():
                if child.get_tag() == "SOUR" and not _is_pointer(child.get_value()):
                    add_source(child.get_value())

        # ---- Persist ----------------------------------------------------
        filename = (file.filename or "GEDCOM import").strip() or "GEDCOM import"
        tree = FamilyTree(
            id=tree_id, name=filename[:200], description="Imported from GEDCOM"
        )
        with get_driver().session() as session:
            session.run(
                "CREATE (t:FamilyTree $props)",
                props=to_properties(tree),
            )
            if persons:
                session.run(
                    """
                    UNWIND $persons AS props
                    CREATE (p:Person)
                    SET p = props
                    WITH p
                    MATCH (t:FamilyTree {id: $tid})
                    CREATE (t)-[:HAS_MEMBER]->(p)
                    """,
                    persons=[to_properties(p) for p in persons],
                    tid=str(tree_id),
                )
            if relationships:
                session.run(
                    """
                    UNWIND $rels AS props
                    MATCH (t:FamilyTree {id: $tid})-[:HAS_MEMBER]->(p1:Person {id: props.person1_id}),
                          (t)-[:HAS_MEMBER]->(p2:Person {id: props.person2_id})
                    CREATE (p1)-[r:RELATIONSHIP]->(p2)
                    SET r = props
                    """,
                    rels=[to_properties(r) for r in relationships],
                    tid=str(tree_id),
                )
            if sources:
                session.run(
                    """
                    UNWIND $sources AS props
                    CREATE (s:Source)
                    SET s = props
                    WITH s
                    MATCH (t:FamilyTree {id: $tid})
                    CREATE (t)-[:HAS_SOURCE]->(s)
                    """,
                    sources=[to_properties(s) for s in sources],
                    tid=str(tree_id),
                )

        return {
            "tree_id": str(tree_id),
            "persons_imported": len(persons),
            "relationships_imported": len(relationships),
            "sources_imported": len(sources),
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def _ged_escape(value: str | None) -> str:
    # '@' is the GEDCOM escape character; a literal '@' is written '@@'.
    return (value or "").replace("@", "@@")


def _ged_name(person: Person) -> str:
    given = _ged_escape(person.primary_name.given_name).replace("/", "").strip()
    surname = _ged_escape(person.primary_name.surname).replace("/", "").strip()
    return f"{given} /{surname}/".strip()


def _ged_sex(person: Person) -> str:
    return {"MALE": "M", "FEMALE": "F"}.get(person.gender.value, "U")


def _ged_date_block(tag: str, date: str | None, place: str | None) -> list[str]:
    if not date and not place:
        return []
    lines = [f"1 {tag}"]
    if date:
        lines.append(f"2 DATE {_ged_escape(date)}")
    if place:
        lines.append(f"2 PLAC {_ged_escape(place)}")
    return lines


def _ged_note_lines(note: str | None) -> list[str]:
    if not note or not note.strip():
        return []
    parts = note.split("\n")
    lines = [f"1 NOTE {_ged_escape(parts[0])}"]
    lines.extend(f"2 CONT {_ged_escape(p)}" for p in parts[1:])
    return lines


@router.get("/trees/{tree_id}/export/gedcom")
def export_gedcom(tree_id: UUID, _: None = Depends(require_auth)):
    with get_driver().session() as session:
        tree_rec = session.run(
            "MATCH (t:FamilyTree {id: $id}) RETURN t",
            id=str(tree_id),
        ).single()
        if not tree_rec:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tree not found")
        tree = from_record(FamilyTree, dict(tree_rec["t"]))

        person_rows = session.run(
            """
            MATCH (t:FamilyTree {id: $tid})-[:HAS_MEMBER]->(p:Person)
            RETURN p
            """,
            tid=str(tree_id),
        )
        persons = [from_record(Person, dict(r["p"])) for r in person_rows]

        rel_rows = session.run(
            """
            MATCH (:FamilyTree {id: $tid})-[:HAS_MEMBER]->(p1:Person)
                  -[r:RELATIONSHIP]->(p2:Person)
            WHERE r.tree_id = $tid
            RETURN r
            """,
            tid=str(tree_id),
        )
        relationships = [from_record(Relationship, dict(r["r"])) for r in rel_rows]

    # Stable pointers: @I1@, @I2@ ... (GEDCOM pointers must be alphanumeric,
    # so UUIDs are mapped to sequential ids, sorted by name for determinism).
    persons.sort(
        key=lambda p: (
            p.primary_name.surname or "",
            p.primary_name.given_name or "",
        )
    )
    ptr = {str(p.id): f"@I{i}@" for i, p in enumerate(persons, start=1)}

    # Group into families: one FAM per spouse pair; single parents with
    # children get their own FAM. Children attach to the family containing
    # either parent. No duplicate FAM records.
    spouse_pairs: dict[frozenset, tuple[UUID, UUID]] = {}
    children_of: dict[str, set[str]] = defaultdict(set)
    for rel in relationships:
        if rel.relationship_type == RelationshipType.SPOUSE:
            if rel.person1_id == rel.person2_id:
                continue
            key = frozenset({str(rel.person1_id), str(rel.person2_id)})
            spouse_pairs.setdefault(key, (rel.person1_id, rel.person2_id))
        elif rel.relationship_type == RelationshipType.PARENT_CHILD:
            children_of[str(rel.person1_id)].add(str(rel.person2_id))

    families: list[tuple[UUID | None, UUID | None, list[str]]] = []
    assigned_children: set[str] = set()
    paired_persons: set[str] = set()
    for key, (a, b) in spouse_pairs.items():
        kids = sorted(
            (children_of.get(str(a), set()) | children_of.get(str(b), set()))
            - {str(a), str(b)}
        )
        # Keep only children that are actually members of this tree.
        kids = [k for k in kids if k in ptr]
        families.append((a, b, kids))
        assigned_children.update(kids)
        paired_persons.update(key)

    person_by_id = {str(p.id): p for p in persons}
    for pid, kids in sorted(children_of.items()):
        if pid in paired_persons:
            continue
        remaining = sorted((set(kids) - assigned_children) & set(ptr))
        if remaining and pid in ptr:
            # Single parent: HUSB or WIFE slot by gender (default WIFE).
            parent = person_by_id.get(pid)
            if parent is not None and parent.gender == Gender.MALE:
                families.append((UUID(pid), None, remaining))
            else:
                families.append((None, UUID(pid), remaining))
            assigned_children.update(remaining)

    lines = [
        "0 HEAD",
        "1 SOUR DZINZA",
        "2 VERS 2.0",
        "2 NAME Dzinza",
        "1 GEDC",
        "2 VERS 5.5",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
    ]
    for p in persons:
        lines.append(f"0 {ptr[str(p.id)]} INDI")
        lines.append(f"1 NAME {_ged_name(p)}")
        lines.append(f"1 SEX {_ged_sex(p)}")
        lines.extend(
            _ged_date_block(
                "BIRT",
                p.birth_date_exact or p.birth_date_string,
                p.birth_place,
            )
        )
        lines.extend(
            _ged_date_block(
                "DEAT",
                p.death_date_exact or p.death_date_string,
                p.death_place,
            )
        )
        lines.extend(_ged_note_lines(p.notes))
    for i, (husb, wife, kids) in enumerate(families, start=1):
        lines.append(f"0 @F{i}@ FAM")
        if husb is not None:
            lines.append(f"1 HUSB {ptr[str(husb)]}")
        if wife is not None:
            lines.append(f"1 WIFE {ptr[str(wife)]}")
        for kid in kids:
            lines.append(f"1 CHIL {ptr[kid]}")
    lines.append("0 TRLR")
    gedcom_text = "\n".join(lines) + "\n"

    # Sanitize the tree name for the Content-Disposition header.
    safe_name = (tree.name or "family-tree").replace('"', "").replace("\n", " ")[:120]
    return Response(
        content=gedcom_text,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}.ged"'
        },
    )
