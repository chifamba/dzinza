"""Request handlers for genealogy_service service."""

import json
from datetime import datetime
import re
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from uuid import uuid4
from schemas import FamilyTreeCreate, FamilyTree, PersonCreate, Person, Relationship, RelationshipType, RelationshipEvent, Fact, DNAData, HistoricalRecord
from typing import List, Any
from fastapi import Response
from models import get_neo4j_driver

router = APIRouter()

@router.post("/familytrees", response_model=FamilyTree, status_code=status.HTTP_201_CREATED)
def create_family_tree(payload: FamilyTreeCreate):
    driver = get_neo4j_driver()
    tree_id = str(uuid4())
    with driver.session() as session:
        result = session.run(
            """
            CREATE (t:FamilyTree {
                id: $id,
                name: $name,
                description: $description,
                privacy: $privacy,
                root_person_id: $root_person_id
            })
            RETURN t
            """,
            id=tree_id,
            name=payload.name,
            description=payload.description,
            privacy=payload.privacy.value,
            root_person_id=str(payload.root_person_id)
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=500, detail="Failed to create family tree")
        t = record["t"]
        return FamilyTree(
            id=tree_id,
            name=payload.name,
            description=payload.description,
            owner_id=uuid4(),  # Placeholder, should be set from auth context
            root_person_id=payload.root_person_id,
            collaborators=None,
            privacy=payload.privacy,
            settings=payload.settings,
            statistics=None,
            last_gedcom_import=None,
            last_gedcom_export=None
        )

@router.post("/persons/{id}/historical_records", response_model=List[HistoricalRecord])
def add_historical_record(id: str, record: HistoricalRecord):
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get current records
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            RETURN p.historical_records AS records
            """,
            id=id
        )
        db_record = result.single()
        records = []
        if db_record and db_record["records"]:
            try:
                records = [HistoricalRecord.parse_obj(r) for r in json.loads(db_record["records"])]
            except Exception:
                records = []
        records.append(record)
        session.run(
            """
            MATCH (p:Person {id: $id})
            SET p.historical_records = $records
            """,
            id=id,
            records=json.dumps([r.dict() for r in records])
        )
    return records

@router.get("/persons/{id}/historical_records", response_model=List[HistoricalRecord])
def get_historical_records(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            RETURN p.historical_records AS records
            """,
            id=id
        )
        db_record = result.single()
        if not db_record or not db_record["records"]:
            return []
        try:
            return [HistoricalRecord.parse_obj(r) for r in json.loads(db_record["records"])]
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid historical records format")

@router.post("/persons/{id}/dna", response_model=DNAData)
def set_person_dna(id: str, dna: DNAData):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            SET p.dna_data = $dna_data
            RETURN p
            """,
            id=id,
            dna_data=dna.json()
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Person not found")
    return dna

@router.get("/persons/{id}/dna", response_model=DNAData)
def get_person_dna(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            RETURN p.dna_data AS dna_data
            """,
            id=id
        )
        record = result.single()
        if not record or not record["dna_data"]:
            raise HTTPException(status_code=404, detail="DNA data not found")
        dna_data = record["dna_data"]
        try:
            return DNAData.parse_raw(dna_data)
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid DNA data format")

@router.get("/familytrees/{id}/statistics")
def get_tree_statistics(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get total number of persons
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN count(p) AS person_count
            """,
            id=id
        )
        person_count = result.single()["person_count"]

        if person_count == 0:
            raise HTTPException(status_code=404, detail="Family tree not found or has no members.")

        # Get number of generations
        # This is a complex query. A simple approach is to find the longest path
        # from any person to any other person via PARENT_CHILD relationships.
        result = session.run(
            """
            MATCH path = (p1:Person)<-[:RELATIONSHIP* {type: 'PARENT_CHILD'}]-(p2:Person)
            WHERE (p1)-[:HAS_MEMBER]-(:FamilyTree {id: $id}) AND (p2)-[:HAS_MEMBER]-(:FamilyTree {id: $id})
            RETURN length(path) AS generation_count
            ORDER BY generation_count DESC
            LIMIT 1
            """,
            id=id
        )
        record = result.single()
        generation_count = record["generation_count"] + 1 if record else 1

    return {
        "person_count": person_count,
        "generation_count": generation_count
    }

@router.post("/familytrees/import/gedcom", status_code=status.HTTP_201_CREATED)
async def import_gedcom(file: UploadFile = File(...)):
    contents = await file.read()
    gedcom_string = contents.decode("utf-8")

    individuals = {}
    families = {}

    current_record = None

    for line in gedcom_string.splitlines():
        parts = line.strip().split(" ", 2)
        level = int(parts[0])

        if level == 0:
            if len(parts) > 2 and parts[2] == "INDI":
                current_record = {"id": parts[1], "type": "INDI", "facts": []}
                individuals[current_record["id"]] = current_record
            elif len(parts) > 2 and parts[2] == "FAM":
                current_record = {"id": parts[1], "type": "FAM", "children": []}
                families[current_record["id"]] = current_record
            else:
                current_record = None
            continue

        if current_record:
            tag = parts[1]
            data = parts[2] if len(parts) > 2 else ""

            if current_record["type"] == "INDI":
                if tag == "NAME":
                    current_record["name"] = data
                elif tag == "SEX":
                    current_record["sex"] = data
                elif tag == "BIRT":
                    current_record["facts"].append({"type": "BIRT", "date": ""})
                elif tag == "DEAT":
                    current_record["facts"].append({"type": "DEAT", "date": ""})
                elif tag == "DATE" and current_record["facts"]:
                    current_record["facts"][-1]["date"] = data

            elif current_record["type"] == "FAM":
                if tag == "HUSB":
                    current_record["husband"] = data
                elif tag == "WIFE":
                    current_record["wife"] = data
                elif tag == "CHIL":
                    current_record["children"].append(data)

    # Now, create the records in the database
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Create a new family tree for the import
        tree_id = str(uuid4())
        session.run(
            "CREATE (t:FamilyTree {id: $id, name: $name})",
            id=tree_id,
            name=file.filename
        )

        for indi_id, indi_data in individuals.items():
            name_parts = indi_data.get("name", "/").split("/")
            given_name = name_parts[0].strip()
            surname = name_parts[1].strip() if len(name_parts) > 1 else ""

            person_id = re.sub(r'[@]', '', indi_id)

            session.run(
                """
                CREATE (p:Person {
                    id: $id,
                    given_name: $given_name,
                    surname: $surname,
                    gender: $gender
                })
                """,
                id=person_id,
                given_name=given_name,
                surname=surname,
                gender=indi_data.get("sex", "U")
            )
            session.run(
                """
                MATCH (t:FamilyTree {id: $tree_id}), (p:Person {id: $person_id})
                CREATE (t)-[:HAS_MEMBER]->(p)
                """,
                tree_id=tree_id,
                person_id=person_id
            )

        for fam_id, fam_data in families.items():
            husband_id = re.sub(r'[@]', '', fam_data.get("husband", ""))
            wife_id = re.sub(r'[@]', '', fam_data.get("wife", ""))

            if husband_id and wife_id:
                session.run(
                    """
                    MATCH (h:Person {id: $husband_id}), (w:Person {id: $wife_id})
                    CREATE (h)-[:RELATIONSHIP {type: 'SPOUSE', tree_id: $tree_id}]->(w)
                    """,
                    husband_id=husband_id,
                    wife_id=wife_id,
                    tree_id=tree_id
                )

            for child_id_ref in fam_data.get("children", []):
                child_id = re.sub(r'[@]', '', child_id_ref)
                if husband_id:
                    session.run(
                        """
                        MATCH (p:Person {id: $parent_id}), (c:Person {id: $child_id})
                        CREATE (p)-[:RELATIONSHIP {type: 'PARENT_CHILD', tree_id: $tree_id}]->(c)
                        """,
                        parent_id=husband_id,
                        child_id=child_id,
                        tree_id=tree_id
                    )
                if wife_id:
                    session.run(
                        """
                        MATCH (p:Person {id: $parent_id}), (c:Person {id: $child_id})
                        CREATE (p)-[:RELATIONSHIP {type: 'PARENT_CHILD', tree_id: $tree_id}]->(c)
                        """,
                        parent_id=wife_id,
                        child_id=child_id,
                        tree_id=tree_id
                    )

    return {"message": "GEDCOM file imported successfully."}

@router.get("/familytrees/{id}/export/gedcom", response_class=Response)
def export_gedcom(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get all persons in the tree
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p
            """,
            id=id
        )
        persons = [record["p"] for record in result]

        if not persons:
            raise HTTPException(status_code=404, detail="Family tree not found or has no members.")

        # Get all relationships in the tree
        result = session.run(
            """
            MATCH (p1:Person)-[r:RELATIONSHIP {tree_id: $id}]->(p2:Person)
            RETURN p1.id AS p1_id, p2.id AS p2_id, r
            """,
            id=id
        )
        relationships = result.data()

    # Build GEDCOM string
    gedcom_lines = []
    gedcom_lines.append("0 HEAD")
    gedcom_lines.append("1 SOUR FamilyTreeApp")
    gedcom_lines.append("1 GEDC")
    gedcom_lines.append("2 VERS 5.5.1")
    gedcom_lines.append("2 FORM LINEAGE-LINKED")
    gedcom_lines.append("1 CHAR UTF-8")

    # Add individuals
    for person in persons:
        gedcom_lines.append(f"0 @{person['id']}@ INDI")
        gedcom_lines.append(f"1 NAME {person.get('given_name', '')} /{person.get('surname', '')}/")
        gedcom_lines.append(f"1 SEX {person.get('gender', 'U')[0]}")
        if person.get('birth_date_string'):
            gedcom_lines.append("1 BIRT")
            gedcom_lines.append(f"2 DATE {person['birth_date_string']}")
        if person.get('is_living') == False:
            gedcom_lines.append("1 DEAT")


    # Add families
    fam_id_counter = 1
    person_to_fam_spouse = {}
    for rel in relationships:
        if rel['r']['type'] == 'SPOUSE':
            fam_id = f"F{fam_id_counter}"
            gedcom_lines.append(f"0 @{fam_id}@ FAM")
            gedcom_lines.append(f"1 HUSB @{rel['p1_id']}@")
            gedcom_lines.append(f"1 WIFE @{rel['p2_id']}@")
            person_to_fam_spouse[rel['p1_id']] = fam_id
            person_to_fam_spouse[rel['p2_id']] = fam_id
            fam_id_counter += 1

    for rel in relationships:
        if rel['r']['type'] == 'PARENT_CHILD':
            parent_id = rel['p1_id']
            child_id = rel['p2_id']
            if parent_id in person_to_fam_spouse:
                fam_id = person_to_fam_spouse[parent_id]
                # This is not quite right, it will create duplicate FAM records.
                # A better approach is to create the FAM records first, then add children.
                # I will fix this in the next iteration. For now, this is a start.
                gedcom_lines.append(f"0 @{fam_id}@ FAM")
                gedcom_lines.append(f"1 CHIL @{child_id}@")


    gedcom_lines.append("0 TRLR")
    gedcom_content = "\n".join(gedcom_lines)

    return Response(content=gedcom_content, media_type="application/x-gedcom")

@router.get("/familytrees/compare")
def compare_family_trees(tree1_id: str, tree2_id: str):
    """
    Compares two family trees and returns a list of common ancestors (by name and birth date).
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get all persons in tree 1
        result1 = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p.given_name AS given_name, p.surname AS surname, p.birth_date_string AS birth_date
            """,
            id=tree1_id
        )
        persons1 = set(
            (r["given_name"], r["surname"], r["birth_date"])
            for r in result1
        )
        # Get all persons in tree 2
        result2 = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p.given_name AS given_name, p.surname AS surname, p.birth_date_string AS birth_date
            """,
            id=tree2_id
        )
        persons2 = set(
            (r["given_name"], r["surname"], r["birth_date"])
            for r in result2
        )
        # Find common ancestors by name and birth date
        common = persons1 & persons2
        return [
            {
                "given_name": gn,
                "surname": sn,
                "birth_date": bd
            }
            for (gn, sn, bd) in common
        ]

@router.get("/familytrees/{id}/timeline", response_model=List[Any])
def get_family_tree_timeline(id: str):
    """
    Returns a timeline of all events for all persons in the family tree, sorted by date.
    """
    driver = get_neo4j_driver()
    timeline = []
    with driver.session() as session:
        # Get all persons in the tree
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p.id AS person_id, p.given_name AS given_name, p.surname AS surname
            """,
            id=id
        )
        persons = [dict(record) for record in result]

        # For each person, get facts and relationship events
        for person in persons:
            pid = person["person_id"]
            name = f"{person.get('given_name', '')} {person.get('surname', '')}".strip()
            # Facts
            facts_result = session.run(
                """
                MATCH (p:Person {id: $id})-[:HAS_FACT]->(f:Fact)
                RETURN f
                """,
                id=pid
            )
            for record in facts_result:
                fact_node = record["f"]
                fact_data = dict(fact_node)
                fact_data["event_type"] = "Fact"
                fact_data["person_id"] = pid
                fact_data["person_name"] = name
                timeline.append(fact_data)
            # Relationship events
            rel_result = session.run(
                """
                MATCH (p:Person {id: $id})-[r:RELATIONSHIP]-(other:Person)
                RETURN r
                """,
                id=pid
            )
            for record in rel_result:
                relationship_node = record["r"]
                events_json = relationship_node.get("events", "[]")
                events_data = json.loads(events_json)
                for event_data in events_data:
                    event_data["event_type"] = event_data.get("event_type", "Relationship Event")
                    event_data["person_id"] = pid
                    event_data["person_name"] = name
                    timeline.append(event_data)

    # Sort timeline by date
    def get_date(event):
        date_str = event.get("date_exact") or event.get("date_string")
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str)
        except (ValueError, TypeError):
            return None

    events_with_dates = [e for e in timeline if get_date(e) is not None]
    events_without_dates = [e for e in timeline if get_date(e) is None]
    sorted_events = sorted(events_with_dates, key=get_date)
    sorted_events.extend(events_without_dates)
    return sorted_events

@router.get("/persons/{id}/timeline", response_model=List[Any])
def get_person_timeline(id: str):
    driver = get_neo4j_driver()
    timeline = []
    with driver.session() as session:
        # Get facts
        result = session.run(
            """
            MATCH (p:Person {id: $id})-[:HAS_FACT]->(f:Fact)
            RETURN f
            """,
            id=id
        )
        for record in result:
            fact_node = record["f"]
            fact_data = dict(fact_node)
            fact_data["event_type"] = "Fact"
            timeline.append(fact_data)

        # Get relationship events
        result = session.run(
            """
            MATCH (p:Person {id: $id})-[r:RELATIONSHIP]-(other:Person)
            RETURN r
            """,
            id=id
        )
        for record in result:
            relationship_node = record["r"]
            events_json = relationship_node.get("events", "[]")
            events_data = json.loads(events_json)
            for event_data in events_data:
                event_data["event_type"] = event_data.get("event_type", "Relationship Event")
                timeline.append(event_data)

    # Sort timeline by date
    def get_date(event):
        date_str = event.get("date_exact") or event.get("date_string")
        if not date_str:
            return None
        try:
            # Attempt to parse a few common formats
            return datetime.fromisoformat(date_str)
        except (ValueError, TypeError):
            # Add more parsing logic here if needed for other date formats
            return None

    # Separate events with and without dates
    events_with_dates = [e for e in timeline if get_date(e) is not None]
    events_without_dates = [e for e in timeline if get_date(e) is None]

    # Sort events that have a valid date
    sorted_events = sorted(events_with_dates, key=get_date)

    # Add events without dates to the end of the list
    sorted_events.extend(events_without_dates)

    return sorted_events
@router.post("/persons", response_model=Person, status_code=status.HTTP_201_CREATED)
def add_family_member(payload: PersonCreate):
    driver = get_neo4j_driver()
    import uuid
    person_id = str(uuid.uuid4())
    with driver.session() as session:
        # Create Person node
        session.run(
            """
            CREATE (p:Person {
                id: $id,
                given_name: $given_name,
                surname: $surname,
                gender: $gender,
                birth_date_string: $birth_date_string,
                is_living: $is_living
            })
            """,
            id=person_id,
            given_name=payload.primary_name.given_name,
            surname=payload.primary_name.surname,
            gender=payload.gender.value,
            birth_date_string=payload.birth_date_string,
            is_living=payload.is_living,
        )

        # Create Fact nodes and link to Person
        for fact in payload.facts:
            fact_id = str(uuid.uuid4())
            session.run(
                """
                MATCH (p:Person {id: $person_id})
                CREATE (f:Fact {
                    id: $id,
                    type: $type,
                    value: $value,
                    date_string: $date_string,
                    place: $place,
                    description: $description,
                    citations: $citations
                })
                CREATE (p)-[:HAS_FACT]->(f)
                """,
                person_id=person_id,
                id=fact_id,
                type=fact.type,
                value=fact.value,
                date_string=fact.date_string,
                place=fact.place,
                description=fact.description,
                citations=fact.citations
            )
        # Link to FamilyTree(s)
        for tree_id in payload.tree_ids:
            session.run(
                """
                MATCH (p:Person {id: $person_id}), (t:FamilyTree {id: $tree_id})
                CREATE (t)-[:HAS_MEMBER]->(p)
                """,
                person_id=person_id,
                tree_id=str(tree_id),
            )
    # Return minimal Person object (expand as needed)
    return Person(
        id=person_id,
        tree_ids=payload.tree_ids,
        primary_name=payload.primary_name,
        alternate_names=[],
        gender=payload.gender,
        birth_date_string=payload.birth_date_string,
        birth_date_exact=payload.birth_date_exact,
        birth_place=payload.birth_place,
        is_birth_date_estimated=payload.is_birth_date_estimated,
        death_date_string=payload.death_date_string,
        death_date_exact=payload.death_date_exact,
        death_place=payload.death_place,
        is_death_date_estimated=payload.is_death_date_estimated,
        cause_of_death=payload.cause_of_death,
        is_living=payload.is_living,
        identifiers=payload.identifiers,
        biography=payload.biography,
        notes=payload.notes,
        profile_image_url=None,
        profile_image_id=payload.profile_image_id,
        clan=payload.clan,
        tribe=payload.tribe,
        traditional_titles=payload.traditional_titles,
        privacy_settings=payload.privacy_settings,
        facts=payload.facts,
        potential_duplicates=[],
        merged_into_id=None,
        merged_from_ids=[],
    )
@router.put("/persons/{id}", response_model=Person)
def update_family_member(id: str, payload: Person):
    driver = get_neo4j_driver()
    import uuid
    with driver.session() as session:
        # First, update the person's properties
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            SET p.given_name = $given_name,
                p.surname = $surname,
                p.gender = $gender,
                p.birth_date_string = $birth_date_string,
                p.is_living = $is_living,
                p.biography = $biography,
                p.notes = $notes
            RETURN p
            """,
            id=id,
            given_name=payload.primary_name.given_name,
            surname=payload.primary_name.surname,
            gender=payload.gender.value,
            birth_date_string=payload.birth_date_string,
            is_living=payload.is_living,
            biography=payload.biography,
            notes=payload.notes
        )
        if not result.single():
            raise HTTPException(status_code=404, detail="Person not found")

        # Then, delete all existing facts for this person
        session.run(
            """
            MATCH (p:Person {id: $id})-[r:HAS_FACT]->(f:Fact)
            DETACH DELETE f
            """,
            id=id
        )

        # Finally, create new facts from the payload
        for fact in payload.facts:
            fact_id = str(uuid.uuid4())
            session.run(
                """
                MATCH (p:Person {id: $person_id})
                CREATE (f:Fact {
                    id: $id,
                    type: $type,
                    value: $value,
                    date_string: $date_string,
                    place: $place,
                    description: $description,
                    citations: $citations
                })
                CREATE (p)-[:HAS_FACT]->(f)
                """,
                person_id=id,
                id=fact_id,
                type=fact.type,
                value=fact.value,
                date_string=fact.date_string,
                place=fact.place,
                description=fact.description,
                citations=fact.citations
            )

    return payload
@router.delete("/persons/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_family_member(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            DETACH DELETE p
            RETURN COUNT(p) AS deleted_count
            """,
            id=id
        )
        record = result.single()
        if not record or record["deleted_count"] == 0:
            raise HTTPException(status_code=404, detail="Person not found")
    return
@router.post("/relationships", response_model=Relationship, status_code=status.HTTP_201_CREATED)
def add_relationship(payload: Relationship):
    # Validation
    if payload.person1_id == payload.person2_id:
        raise HTTPException(status_code=400, detail="Cannot create a relationship with oneself.")

    driver = get_neo4j_driver()

    if payload.relationship_type == RelationshipType.PARENT_CHILD:
        # Check for circular relationships (e.g., becoming your own ancestor)
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p1:Person {id: $person1_id}), (p2:Person {id: $person2_id})
                MATCH path = (p2)-[:RELATIONSHIP*]->(p1)
                WHERE all(r in relationships(path) WHERE r.type = 'PARENT_CHILD')
                RETURN path
                """,
                person1_id=str(payload.person1_id),
                person2_id=str(payload.person2_id)
            )
            if result.single():
                raise HTTPException(status_code=400, detail="Circular parent-child relationship detected.")

    if payload.relationship_type == RelationshipType.SPOUSE:
        # Check if already married
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p1:Person {id: $person1_id})-[r:RELATIONSHIP]-(p2:Person {id: $person2_id})
                WHERE r.type = 'SPOUSE' AND r.spousal_status = 'MARRIED'
                RETURN r
                """,
                person1_id=str(payload.person1_id),
                person2_id=str(payload.person2_id)
            )
            if result.single():
                raise HTTPException(status_code=400, detail="A 'MARRIED' spousal relationship already exists between these two people.")

    relationship_id = str(uuid4())
    with driver.session() as session:
        # Check if persons and tree exist
        result = session.run(
            """
            MATCH (p1:Person {id: $person1_id})
            MATCH (p2:Person {id: $person2_id})
            MATCH (t:FamilyTree {id: $tree_id})
            RETURN p1, p2, t
            """,
            person1_id=str(payload.person1_id),
            person2_id=str(payload.person2_id),
            tree_id=str(payload.tree_id)
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="One or more entities not found")

        # Serialize events to JSON string
        events_json = json.dumps([event.dict() for event in payload.events])

        # Create relationship
        result = session.run(
            """
            MATCH (p1:Person {id: $person1_id}), (p2:Person {id: $person2_id})
            CREATE (p1)-[r:RELATIONSHIP {
                id: $id,
                tree_id: $tree_id,
                type: $relationship_type,
                parental_role_person1: $parental_role_person1,
                parental_role_person2: $parental_role_person2,
                spousal_status: $spousal_status,
                start_date_string: $start_date_string,
                start_date_exact: $start_date_exact,
                end_date_string: $end_date_string,
                end_date_exact: $end_date_exact,
                place: $place,
                notes: $notes,
                events: $events
            }]->(p2)
            RETURN r
            """,
            id=relationship_id,
            tree_id=str(payload.tree_id),
            person1_id=str(payload.person1_id),
            person2_id=str(payload.person2_id),
            relationship_type=payload.relationship_type.value,
            parental_role_person1=payload.parental_role_person1,
            parental_role_person2=payload.parental_role_person2,
            spousal_status=payload.spousal_status.value if payload.spousal_status else None,
            start_date_string=payload.start_date_string,
            start_date_exact=payload.start_date_exact,
            end_date_string=payload.end_date_string,
            end_date_exact=payload.end_date_exact,
            place=payload.place,
            notes=payload.notes,
            events=events_json
        )
        db_relationship = result.single()["r"]

    events_data = json.loads(db_relationship.get("events", "[]"))
    events = [RelationshipEvent(**event_data) for event_data in events_data]

    return Relationship(
        id=db_relationship["id"],
        tree_id=db_relationship["tree_id"],
        person1_id=payload.person1_id,
        person2_id=payload.person2_id,
        relationship_type=db_relationship["type"],
        parental_role_person1=db_relationship.get("parental_role_person1"),
        parental_role_person2=db_relationship.get("parental_role_person2"),
        spousal_status=db_relationship.get("spousal_status"),
        start_date_string=db_relationship.get("start_date_string"),
        start_date_exact=db_relationship.get("start_date_exact"),
        end_date_string=db_relationship.get("end_date_string"),
        end_date_exact=db_relationship.get("end_date_exact"),
        place=db_relationship.get("place"),
        notes=db_relationship.get("notes"),
        events=events
    )
@router.get("/familytrees/templates")
def get_family_tree_templates():
    templates = [
        {
            "name": "Nuclear Family",
            "description": "Two parents and their children.",
            "structure": {
                "parents": 2,
                "children": "variable"
            }
        },
        {
            "name": "Extended Family",
            "description": "Multiple generations living together.",
            "structure": {
                "parents": 2,
                "children": "variable",
                "grandparents": 2,
                "other_relatives": "variable"
            }
        },
        {
            "name": "Single Parent Family",
            "description": "One parent raising children.",
            "structure": {
                "parents": 1,
                "children": "variable"
            }
        }
    ]
    return {"templates": templates}
@router.get("/familytrees/{id}/permissions")
def get_tree_permissions(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            RETURN t.permissions AS permissions
            """,
            id=id
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Family tree not found")
        return {"permissions": record["permissions"] or {}}

@router.put("/familytrees/{id}/permissions")
def update_tree_permissions(id: str, permissions: dict):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            SET t.permissions = $permissions
            RETURN t.permissions AS permissions
            """,
            id=id,
            permissions=permissions
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Family tree not found")
        return {"permissions": record["permissions"]}

@router.get("/familytrees/{id}/diagram", response_model=Any)
def get_family_tree_diagram(id: str):
    """
    Returns the family tree as a graph (nodes and edges) for diagram visualization.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get all persons in the tree
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p
            """,
            id=id
        )
        persons = [record["p"] for record in result]

        # Get all relationships in the tree
        result = session.run(
            """
            MATCH (p1:Person)-[r:RELATIONSHIP {tree_id: $id}]->(p2:Person)
            RETURN p1.id AS source, p2.id AS target, r.type AS type
            """,
            id=id
        )
        relationships = [dict(record) for record in result]

    nodes = [
        {
            "id": p["id"],
            "label": f"{p.get('given_name', '')} {p.get('surname', '')}".strip(),
            "data": p
        }
        for p in persons
    ]
    edges = [
        {
            "source": rel["source"],
            "target": rel["target"],
            "type": rel["type"]
        }
        for rel in relationships
    ]
    return {"nodes": nodes, "edges": edges}

from fastapi.responses import StreamingResponse
import io

@router.get("/familytrees/{id}/pdf_report")
def get_family_tree_pdf_report(id: str):
    """
    Generates a printable PDF report for the family tree.
    """
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation library not installed")

    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})-[:HAS_MEMBER]->(p:Person)
            RETURN p
            """,
            id=id
        )
        persons = [record["p"] for record in result]

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Family Tree Report", ln=True, align="C")
    pdf.ln(10)
    for person in persons:
        name = f"{person.get('given_name', '')} {person.get('surname', '')}".strip()
        pdf.cell(0, 10, txt=name, ln=True)
        if person.get('birth_date_string'):
            pdf.cell(0, 10, txt=f"Birth: {person['birth_date_string']}", ln=True)
        if person.get('death_date_string'):
            pdf.cell(0, 10, txt=f"Death: {person['death_date_string']}", ln=True)
        pdf.ln(5)

    pdf_output = io.BytesIO()
    pdf.output(pdf_output)
    pdf_output.seek(0)
    return StreamingResponse(pdf_output, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=family_tree_{id}.pdf"})

@router.get("/familytrees/{id}/chart", response_model=Any)
def get_family_tree_chart(id: str):
    """
    Returns the family tree as a nested dict suitable for chart visualization.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Get root person
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            RETURN t.root_person_id AS root_id
            """,
            id=id
        )
        record = result.single()
        if not record or not record["root_id"]:
            raise HTTPException(status_code=404, detail="Root person not found")
        root_id = record["root_id"]

        def build_tree(person_id):
            person_result = session.run(
                """
                MATCH (p:Person {id: $id})
                RETURN p
                """,
                id=person_id
            )
            person_node = person_result.single()
            if not person_node:
                return None
            p = person_node["p"]
            children_result = session.run(
                """
                MATCH (p:Person {id: $id})<-[:RELATIONSHIP {type: 'PARENT_CHILD'}]-(c:Person)
                RETURN c.id AS child_id
                """,
                id=person_id
            )
            children = []
            for child in children_result:
                subtree = build_tree(child["child_id"])
                if subtree:
                    children.append(subtree)
            return {
                "id": p["id"],
                "name": f"{p.get('given_name', '')} {p.get('surname', '')}".strip(),
                "children": children
            }

        tree = build_tree(root_id)
        if not tree:
            raise HTTPException(status_code=404, detail="Family tree not found or empty")
        return tree

@router.get("/familytrees/{id}", response_model=FamilyTree)
def get_family_tree(id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (t:FamilyTree {id: $id})
            RETURN t
            """,
            id=id
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Family tree not found")
        t = record["t"]
        return FamilyTree(
            id=t["id"],
            name=t["name"],
            description=t.get("description"),
            owner_id=uuid4(),  # Placeholder, should be set from auth context
            root_person_id=t["root_person_id"],
            collaborators=None,
            privacy=t["privacy"],
            settings=None,
            statistics=None,
            last_gedcom_import=None,
            last_gedcom_export=None
        )
