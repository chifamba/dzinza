"""Unit tests for data models. No database needed."""

from uuid import uuid4

import pytest

from api.models import (
    Confidence,
    Fact,
    FamilyTree,
    FamilyTreeCreate,
    Person,
    PersonCreate,
    PersonName,
    Relationship,
    RelationshipCreate,
    RelationshipType,
    Source,
    SourceCreate,
    SourceType,
)


def test_person_with_clan_metadata():
    p = PersonCreate(
        primary_name=PersonName(given_name="Test", surname="Gumbo"),
        alternate_names=[PersonName(given_name="Madyirapazhe", surname="")],
        clan="Gumbo",
        tribe="Karanga",
        traditional_titles=["Chief"],
        birth_date_string="early 1900s",
        is_birth_date_estimated=True,
    )
    person = Person(**p.model_dump(), tree_ids=[uuid4()])
    assert person.clan == "Gumbo"
    assert person.traditional_titles == ["Chief"]
    assert person.is_birth_date_estimated is True
    assert person.alternate_names[0].given_name == "Madyirapazhe"


def test_fact_confidence_is_optional_and_loose():
    # No confidence, no sources — fully accepted, no nagging.
    loose = Fact(type="note", value="someone said this once")
    assert loose.confidence is None
    assert loose.source_ids == []

    strict = Fact(
        type="migration",
        value="Musana to Gutu",
        confidence=Confidence.ATTESTED,
        source_ids=[uuid4()],
    )
    assert strict.confidence == Confidence.ATTESTED


def test_fact_id_auto_generated():
    f1 = Fact(type="a", value="b")
    f2 = Fact(type="a", value="b")
    assert f1.id != f2.id


def test_source_types():
    s = Source(
        tree_id=uuid4(),
        title="Interview with Gogo",
        type=SourceType.ORAL_TESTIMONY,
        teller="Gogo",
        date_recorded="2024-03-15",
    )
    assert s.type == SourceType.ORAL_TESTIMONY
    assert s.teller == "Gogo"


def test_source_create_defaults():
    sc = SourceCreate(title="x")
    assert sc.type == SourceType.OTHER


def test_tree_create_defaults_private():
    t = FamilyTreeCreate(name="Gumbo")
    assert t.privacy.value == "PRIVATE"
    tree = FamilyTree(**t.model_dump())
    assert tree.root_person_id is None  # root optional in v2


def test_relationship_create():
    r = RelationshipCreate(
        person1_id=uuid4(),
        person2_id=uuid4(),
        relationship_type=RelationshipType.PARENT_CHILD,
    )
    rel = Relationship(tree_id=uuid4(), **r.model_dump())
    assert rel.relationship_type == RelationshipType.PARENT_CHILD


def test_rejects_self_relationship_at_model_level():
    # The API rejects this with 422; the model itself is permissive.
    # Documenting the contract: validation lives in the router.
    pid = uuid4()
    r = RelationshipCreate(
        person1_id=pid,
        person2_id=pid,
        relationship_type=RelationshipType.SPOUSE,
    )
    assert r.person1_id == r.person2_id  # router must reject
