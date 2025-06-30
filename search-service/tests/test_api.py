import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from elasticsearch import AsyncElasticsearch # For type hinting

from app.main import app # Main FastAPI app for TestClient
from app.schemas.search import SearchQuery, SearchResponse, SuggestionQuery, SuggestionResponse, SearchHit
from app.services import elasticsearch_client # To mock the singleton's get_client

client = TestClient(app)

@pytest_asyncio.fixture
def mock_es_client_singleton():
    # This fixture will mock ElasticsearchClientSingleton.get_client()
    # to return a controllable AsyncMock(spec=AsyncElasticsearch)
    mock_es = AsyncMock(spec=AsyncElasticsearch)
    with patch.object(elasticsearch_client.ElasticsearchClientSingleton, 'get_client', return_value=mock_es) as mock_get_client:
        # Also mock ping for health check if app startup calls it via get_client
        # However, app startup calls init_es_client which has its own ping.
        # For endpoint tests, we primarily care about the client used by the endpoint.
        # The health check in main.py uses get_client().ping()
        mock_es.ping = AsyncMock(return_value=True) # Default healthy ping
        yield mock_es # This is the mock AsyncElasticsearch instance

# --- Test /health endpoint ---
@pytest.mark.asyncio
async def test_health_check_es_connected(mock_es_client_singleton: AsyncMock):
    mock_es_client_singleton.ping.return_value = True
    response = client.get("/health")
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["status"] == "healthy"
    assert json_response["dependencies"]["elasticsearch"]["status"] == "connected"

@pytest.mark.asyncio
async def test_health_check_es_disconnected(mock_es_client_singleton: AsyncMock):
    mock_es_client_singleton.ping.return_value = False
    response = client.get("/health")
    assert response.status_code == 503 # Service Unavailable
    json_response = response.json()
    assert json_response["status"] == "unhealthy"
    assert json_response["dependencies"]["elasticsearch"]["status"] == "disconnected"

# --- Test POST /api/v1/search/ endpoint ---
@pytest.mark.asyncio
async def test_perform_search_success(mock_es_client_singleton: AsyncMock):
    mock_es_response = {
        "took": 5,
        "hits": {
            "total": {"value": 1, "relation": "eq"},
            "hits": [{
                "_id": "doc1", "_score": 1.2, "_source": {"record_type": "person", "title": "Found Person"}
            }]
        }
    }
    mock_es_client_singleton.search = AsyncMock(return_value=mock_es_response)

    query_data = SearchQuery(query_string="test").model_dump()

    # Mock analytics DB and logging if they were active and required a DB
    with patch("app.api.api_v1.endpoints.search.crud_search_analytics.log_search_event", new_callable=AsyncMock) as mock_log_event:
        response = client.post("/api/v1/search/", json=query_data)

    assert response.status_code == 200
    json_response = response.json()

    assert json_response["total_hits"] == 1
    assert len(json_response["hits"]) == 1
    assert json_response["hits"][0]["id"] == "doc1"
    assert json_response["hits"][0]["source"]["title"] == "Found Person"
    mock_es_client_singleton.search.assert_called_once()
    # mock_log_event.assert_called_once() # if analytics enabled by default in test settings

@pytest.mark.asyncio
async def test_perform_search_with_highlight_and_facets(mock_es_client_singleton: AsyncMock):
    mock_es_response = {
        "took": 8,
        "hits": {
            "total": {"value": 1},
            "hits": [{
                "_id": "doc1", "_score": 1.5,
                "_source": {"record_type": "person", "title": "Test with Highlight"},
                "highlight": {"title": ["<em>Test</em> with Highlight"]}
            }]
        },
        "aggregations": {
            "record_type_counts": { # Name used in build_elasticsearch_query
                "buckets": [{"key": "person", "doc_count": 1}]
            }
        }
    }
    mock_es_client_singleton.search = AsyncMock(return_value=mock_es_response)

    query_data = SearchQuery(
        query_string="Test",
        request_highlighting=True,
        request_facets=["record_type.keyword"]
    ).model_dump()

    with patch("app.api.api_v1.endpoints.search.crud_search_analytics.log_search_event", new_callable=AsyncMock):
        response = client.post("/api/v1/search/", json=query_data)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["hits"][0]["highlighted_fields"]["title"] == ["<em>Test</em> with Highlight"]
    assert "record_type.keyword" in json_response["facets"]
    assert json_response["facets"]["record_type.keyword"]["person"] == 1
    assert json_response["took_ms"] == 8


# --- Test GET /api/v1/search/suggest endpoint ---
@pytest.mark.asyncio
async def test_get_suggestions_success(mock_es_client_singleton: AsyncMock):
    mock_es_response = {
        "hits": {
            "hits": [
                {"_id": "p1", "_source": {"record_type": "person", "title": "Johnathan Doe"}},
                {"_id": "e1", "_source": {"record_type": "event", "name": "John's Birthday Party"}}
            ]
        }
    }
    mock_es_client_singleton.search = AsyncMock(return_value=mock_es_response)

    response = client.get("/api/v1/search/suggest", params={"text": "John", "limit": 5})

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["query_text"] == "John"
    assert len(json_response["suggestions"]) == 2
    assert json_response["suggestions"][0]["text"] == "Johnathan Doe"
    mock_es_client_singleton.search.assert_called_once()


@pytest.mark.asyncio
async def test_get_suggestions_short_query(mock_es_client_singleton: AsyncMock):
    # Query text less than min_length (2) defined in search_logic.get_suggestions
    response = client.get("/api/v1/search/suggest", params={"text": "J", "limit": 5})
    assert response.status_code == 200 # Endpoint itself doesn't validate length, service logic does
    json_response = response.json()
    assert json_response["query_text"] == "J"
    assert len(json_response["suggestions"]) == 0
    mock_es_client_singleton.search.assert_not_called() # search_logic should return early

# Cleanup dependency overrides after tests if necessary
# This can be done with a module-scoped fixture and finalizer if preferred.
def teardown_module(module):
    app.dependency_overrides.clear()
