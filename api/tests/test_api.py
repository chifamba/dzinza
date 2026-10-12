"""API integration tests. Require a running Neo4j (docker compose up).

Run:  pytest api/tests/test_api.py
Skip: automatically skipped when Neo4j is unreachable.
"""

import os
import uuid

import pytest

try:
    from neo4j import GraphDatabase

    _driver = GraphDatabase.driver(
        os.environ.get("NEO4J_URI", "bolt://localhost:7687"),
        auth=(
            os.environ.get("NEO4J_USER", "neo4j"),
            os.environ.get("NEO4J_PASSWORD", "dzinza-dev-password"),
        ),
    )
    _driver.verify_connectivity()
    NEO4J_AVAILABLE = True
except Exception:  # noqa: BLE001
    NEO4J_AVAILABLE = False

pytestmark = pytest.mark.skipif(
    not NEO4J_AVAILABLE, reason="Neo4j not available"
)

from fastapi.testclient import TestClient  # noqa: E402

from ..main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    os.environ["DZINZA_DEV"] = "1"
    with TestClient(app) as c:
        # Login via dev password
        r = c.post("/auth/login", json={"password": "dzinza-dev"})
        assert r.status_code == 200, r.text
        yield c


@pytest.fixture(scope="module")
def tree_id(client):
    r = client.post("/api/trees", json={"name": "Test Tree"})
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    yield tid
    client.delete(f"/api/trees/{tid}")


def test_health():
    # Unauthenticated health check
    import fastapi.testclient

    c = fastapi.testclient.TestClient(app)
    r = c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_required(client):
    import fastapi.testclient

    anon = fastapi.testclient.TestClient(app)
    r = anon.get("/api/trees")
    assert r.status_code == 401


def test_tree_crud(client):
    # create
    r = client.post("/api/trees", json={"name": "CRUD Tree", "description": "d"})
    assert r.status_code == 201
    tid = r.json()["id"]

    # get
    r = client.get(f"/api/trees/{tid}")
    assert r.status_code == 200
    assert r.json()["name"] == "CRUD Tree"

    # update
    r = client.patch(f"/api/trees/{tid}", json={"name": "Renamed"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"

    # stats
    r = client.get(f"/api/trees/{tid}/stats")
    assert r.status_code == 200
    assert r.json()["persons"] == 0

    # delete
    r = client.delete(f"/api/trees/{tid}")
    assert r.status_code == 204

    # gone
    r = client.get(f"/api/trees/{tid}")
    assert r.status_code == 404


def test_person_crud_and_search(client, tree_id):
    # create
    r = client.post(
        f"/api/trees/{tree_id}/persons",
        json={
            "primary_name": {"given_name": "Tendai", "surname": "Gumbo"},
            "clan": "Gumbo",
            "birth_date_string": "early 1900s",
            "is_birth_date_estimated": True,
        },
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["clan"] == "Gumbo"

    # search finds them
    r = client.get(f"/api/trees/{tree_id}/persons/search", params={"q": "tendai"})
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json())

    # get with relationship summary
    r = client.get(f"/api/persons/{pid}")
    assert r.status_code == 200
    assert r.json()["relationships"] == []

    # delete
    r = client.delete(f"/api/persons/{pid}")
    assert r.status_code == 204


def test_relationship_crud(client, tree_id):
    # two people
    p1 = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"primary_name": {"given_name": "A", "surname": "Gumbo"}},
    ).json()["id"]
    p2 = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"primary_name": {"given_name": "B", "surname": "Gumbo"}},
    ).json()["id"]

    # link parent->child
    r = client.post(
        f"/api/trees/{tree_id}/relationships",
        json={
            "person1_id": p1,
            "person2_id": p2,
            "relationship_type": "PARENT_CHILD",
        },
    )
    assert r.status_code == 201, r.text
    rid = r.json()["id"]

    # visible from child's side
    r = client.get(f"/api/persons/{p2}/relationships")
    assert r.status_code == 200
    assert any(x["id"] == rid for x in r.json())

    # self-relationship rejected
    r = client.post(
        f"/api/trees/{tree_id}/relationships",
        json={
            "person1_id": p1,
            "person2_id": p1,
            "relationship_type": "SPOUSE",
        },
    )
    assert r.status_code == 422

    # delete edge
    r = client.delete(f"/api/relationships/{rid}")
    assert r.status_code == 204


def test_source_and_fact_flow(client, tree_id):
    # source
    r = client.post(
        f"/api/trees/{tree_id}/sources",
        json={
            "title": "Interview with Gogo",
            "type": "oral_testimony",
            "teller": "Gogo",
        },
    )
    assert r.status_code == 201, r.text
    sid = r.json()["id"]

    # person
    pid = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"primary_name": {"given_name": "C", "surname": "Gumbo"}},
    ).json()["id"]

    # fact linked to source (with confidence)
    r = client.post(
        f"/api/persons/{pid}/facts",
        json={
            "type": "title",
            "value": "Chief",
            "confidence": "single_source",
            "source_ids": [sid],
        },
    )
    assert r.status_code == 201, r.text
    fid = r.json()["id"]

    # loose fact without confidence also fine
    r = client.post(
        f"/api/persons/{pid}/facts",
        json={"type": "note", "value": "mentioned in passing"},
    )
    assert r.status_code == 201

    # list facts
    r = client.get(f"/api/persons/{pid}/facts")
    assert r.status_code == 200
    assert len(r.json()) == 2

    # delete fact
    r = client.delete(f"/api/persons/{pid}/facts/{fid}")
    assert r.status_code == 204


def test_event_crud(client, tree_id):
    pid = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"primary_name": {"given_name": "D", "surname": "Gumbo"}},
    ).json()["id"]

    r = client.post(
        f"/api/persons/{pid}/events",
        json={
            "event_type": "migration",
            "date_string": "c. 1850",
            "place": "Musana to Gutu",
            "description": "Clan migration",
        },
    )
    assert r.status_code == 201, r.text
    eid = r.json()["id"]

    r = client.get(f"/api/persons/{pid}/events")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.delete(f"/api/events/{eid}")
    assert r.status_code == 204
