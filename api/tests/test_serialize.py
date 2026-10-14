"""Unit tests for Neo4j serialization. No database needed."""

from uuid import uuid4

from api.db.serialize import from_record, to_properties
from api.models import (
    Confidence,
    Fact,
    FamilyTree,
    Person,
    PersonCreate,
    PersonName,
    Relationship,
    RelationshipType,
    Source,
    SourceType,
)


def test_person_round_trip():
    person = Person(
        **PersonCreate(
            primary_name=PersonName(given_name="Test", surname="Gumbo"),
            clan="Gumbo",
            traditional_titles=["Chief"],
            facts=[
                Fact(type="migration", value="Musana to Gutu",
                     confidence=Confidence.INFERRED)
            ],
        ).model_dump(),
        tree_ids=[uuid4()],
    )
    props = to_properties(person)

    # UUIDs -> strings, enums -> values, nested -> JSON strings
    assert isinstance(props["id"], str)
    assert props["clan"] == "Gumbo"
    assert isinstance(props["facts"], str)  # JSON-encoded
    assert isinstance(props["traditional_titles"], list)  # native list

    restored = from_record(Person, props)
    assert restored.id == person.id
    assert restored.clan == "Gumbo"
    assert restored.facts[0].confidence == Confidence.INFERRED
    assert restored.facts[0].value == "Musana to Gutu"


def test_none_fields_skipped():
    person = Person(
        primary_name=PersonName(given_name="A", surname="B"),
    )
    props = to_properties(person)
    assert "biography" not in props  # None skipped
    assert "death_place" not in props


def test_empty_lists_stay_native():
    person = Person(primary_name=PersonName(given_name="A", surname="B"))
    props = to_properties(person)
    assert props["alternate_names"] == []
    restored = from_record(Person, props)
    assert restored.alternate_names == []


def test_tree_round_trip():
    tree = FamilyTree(name="Gumbo", description="Clan research")
    props = to_properties(tree)
    restored = from_record(FamilyTree, props)
    assert restored.name == "Gumbo"
    assert restored.id == tree.id


def test_source_round_trip():
    source = Source(
        tree_id=uuid4(),
        title="Interview",
        type=SourceType.ORAL_TESTIMONY,
        teller="Gogo",
    )
    props = to_properties(source)
    assert props["type"] == "oral_testimony"  # enum -> value
    restored = from_record(Source, props)
    assert restored.type == SourceType.ORAL_TESTIMONY
    assert restored.teller == "Gogo"


def test_relationship_edge_props():
    rel = Relationship(
        tree_id=uuid4(),
        person1_id=uuid4(),
        person2_id=uuid4(),
        relationship_type=RelationshipType.SPOUSE,
        place="Harare",
    )
    props = to_properties(rel)
    # These become edge properties in Cypher
    assert props["relationship_type"] == "SPOUSE"
    assert props["place"] == "Harare"
    assert isinstance(props["id"], str)
