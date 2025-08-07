"""Request handlers for genealogy_service service."""

from fastapi import APIRouter, HTTPException, status, Depends
from uuid import uuid4
from .schemas import FamilyTreeCreate, FamilyTree, PersonCreate, Person, RelationshipType
from fastapi import Response
from .models import get_neo4j_driver

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
def update_family_member(id: str, payload: PersonCreate):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (p:Person {id: $id})
            SET p.given_name = $given_name,
                p.surname = $surname,
                p.gender = $gender,
                p.birth_date_string = $birth_date_string,
                p.is_living = $is_living
            RETURN p
            """,
            id=id,
            given_name=payload.primary_name.given_name,
            surname=payload.primary_name.surname,
            gender=payload.gender.value,
            birth_date_string=payload.birth_date_string,
            is_living=payload.is_living,
        )
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Person not found")
    return Person(
        id=id,
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
@router.post("/relationships", status_code=status.HTTP_201_CREATED)
def add_relationship(tree_id: str, person1_id: str, person2_id: str, relationship_type: RelationshipType):
    driver = get_neo4j_driver()
    with driver.session() as session:
        session.run(
            """
            MATCH (p1:Person {id: $person1_id}), (p2:Person {id: $person2_id}), (t:FamilyTree {id: $tree_id})
            CREATE (p1)-[r:RELATIONSHIP {
                type: $relationship_type,
                tree_id: $tree_id
            }]->(p2)
            """,
            person1_id=person1_id,
            person2_id=person2_id,
            tree_id=tree_id,
            relationship_type=relationship_type.value,
        )
    return {"message": "Relationship created"}
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
