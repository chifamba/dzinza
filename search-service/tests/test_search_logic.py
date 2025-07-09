import pytest
import pytest_asyncio
from unittest.mock import AsyncMock
from elasticsearch import AsyncElasticsearch # For type hinting mocked client

from app.services import search_logic
from app.schemas.search import SearchQuery, SearchFilter

# --- Tests for build_elasticsearch_query ---

def test_build_es_query_match_all():
    query_in = SearchQuery(query_string="*", page=1, size=10)
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert "match_all" in es_query["query"]["bool"]["must"][0]
    assert es_query["from"] == 0
    assert es_query["size"] == 10

def test_build_es_query_with_query_string():
    query_in = SearchQuery(query_string="hello world", page=2, size=5)
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert "multi_match" in es_query["query"]["bool"]["must"][0]
    assert es_query["query"]["bool"]["must"][0]["multi_match"]["query"] == "hello world"
    assert es_query["from"] == 5 # (2-1)*5
    assert es_query["size"] == 5

def test_build_es_query_with_record_types_filter():
    query_in = SearchQuery(record_types=["person", "event"])
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert {"terms": {"record_type.keyword": ["person", "event"]}} in es_query["query"]["bool"]["filter"]

def test_build_es_query_with_field_filters():
    filters = [SearchFilter(field="tags.keyword", value="history"), SearchFilter(field="year", value=2023)]
    query_in = SearchQuery(filters=filters)
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert {"term": {"tags.keyword": "history"}} in es_query["query"]["bool"]["filter"]
    assert {"term": {"year": 2023}} in es_query["query"]["bool"]["filter"]

def test_build_es_query_with_sorting():
    query_in = SearchQuery(sort_by="created_at", sort_order="asc")
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert es_query["sort"] == [{"created_at": {"order": "asc"}}]

def test_build_es_query_no_sort_by_score_on_match_all():
    query_in = SearchQuery(query_string="*", sort_by="_score") # _score is irrelevant for match_all
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert "sort" not in es_query # Should default to doc order or be absent

def test_build_es_query_with_highlighting():
    query_in = SearchQuery(request_highlighting=True)
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert "highlight" in es_query
    assert "title" in es_query["highlight"]["fields"]
    assert "*.full_name" in es_query["highlight"]["fields"]

def test_build_es_query_with_facets():
    query_in = SearchQuery(request_facets=["record_type.keyword", "tags.keyword"])
    es_query = search_logic.build_elasticsearch_query(query_in)
    assert "aggs" in es_query
    assert "record_type_counts" in es_query["aggs"] # Based on ".keyword" stripping
    assert es_query["aggs"]["record_type_counts"]["terms"]["field"] == "record_type.keyword"
    assert "tags_counts" in es_query["aggs"]
    assert es_query["aggs"]["tags_counts"]["terms"]["field"] == "tags.keyword"

# --- Tests for execute_search ---

@pytest_asyncio.fixture
async def mock_es_client() -> AsyncMock:
    client = AsyncMock(spec=AsyncElasticsearch)
    return client

@pytest.mark.asyncio
async def test_execute_search_success(mock_es_client: AsyncMock):
    query_in = SearchQuery(query_string="test query", page=1, size=10)

    mock_es_response = {
        "took": 10,
        "hits": {
            "total": {"value": 1, "relation": "eq"},
            "max_score": 1.0,
            "hits": [
                {
                    "_index": "persons",
                    "_id": "person1",
                    "_score": 1.0,
                    "_source": {"record_type": "person", "title": "Test Person"},
                    "highlight": {"title": ["<em>Test</em> Person"]}
                }
            ]
        },
        "aggregations": {
            "record_type_counts": {
                "buckets": [{"key": "person", "doc_count": 1}]
            }
        }
    }
    mock_es_client.search = AsyncMock(return_value=mock_es_response)

    # Simulate that facets and highlighting were requested
    query_in.request_facets = ["record_type.keyword"]
    query_in.request_highlighting = True

    response = await search_logic.execute_search(es_client=mock_es_client, query_in=query_in)

    assert response.total_hits == 1
    assert len(response.hits) == 1
    assert response.hits[0].id == "person1"
    assert response.hits[0].source["title"] == "Test Person"
    assert response.hits[0].highlighted_fields["title"] == ["<em>Test</em> Person"]
    assert response.facets is not None
    assert "record_type.keyword" in response.facets # Key is original field name
    assert response.facets["record_type.keyword"]["person"] == 1
    assert response.took_ms == 10
    assert response.total_pages == 1
    mock_es_client.search.assert_called_once()


@pytest.mark.asyncio
async def test_execute_search_handles_es_not_found_error(mock_es_client: AsyncMock):
    from elasticsearch import NotFoundError # Import specific exception
    query_in = SearchQuery(query_string="test")

    # Simulate Elasticsearch raising NotFoundError (e.g., index missing)
    mock_es_client.search = AsyncMock(side_effect=NotFoundError({}, meta=None, body={}))

    response = await search_logic.execute_search(es_client=mock_es_client, query_in=query_in)

    assert response.total_hits == 0
    assert len(response.hits) == 0
    assert response.page == query_in.page
    assert response.size == query_in.size

# --- Tests for get_suggestions ---

@pytest.mark.asyncio
async def test_get_suggestions_success(mock_es_client: AsyncMock):
    mock_es_response = {
        "hits": {
            "hits": [
                {"_id": "person1", "_source": {"record_type": "person", "title": "John Doe Suggestion"}},
                {"_id": "event1", "_source": {"record_type": "event", "name": "Annual Doe Gathering"}},
            ]
        }
    }
    mock_es_client.search = AsyncMock(return_value=mock_es_response)

    suggestions = await search_logic.get_suggestions(es_client=mock_es_client, query_text="Doe", limit=5)

    assert len(suggestions) == 2
    assert suggestions[0].text == "John Doe Suggestion"
    assert suggestions[0].record_type == "person"
    assert suggestions[0].record_id == "person1"
    assert suggestions[1].text == "Annual Doe Gathering"
    assert suggestions[1].record_type == "event"
    assert suggestions[1].record_id == "event1"
    mock_es_client.search.assert_called_once()
    # We can also assert the query body passed to es_client.search if needed

@pytest.mark.asyncio
async def test_get_suggestions_empty_query(mock_es_client: AsyncMock):
    suggestions = await search_logic.get_suggestions(es_client=mock_es_client, query_text="", limit=5)
    assert len(suggestions) == 0
    mock_es_client.search.assert_not_called()

@pytest.mark.asyncio
async def test_get_suggestions_short_query(mock_es_client: AsyncMock):
    suggestions = await search_logic.get_suggestions(es_client=mock_es_client, query_text="D", limit=5)
    assert len(suggestions) == 0
    mock_es_client.search.assert_not_called()

@pytest.mark.asyncio
async def test_get_suggestions_es_error(mock_es_client: AsyncMock):
    from elasticsearch import ElasticsearchException # Import generic ES exception
    mock_es_client.search = AsyncMock(side_effect=ElasticsearchException("Suggestion query failed"))

    suggestions = await search_logic.get_suggestions(es_client=mock_es_client, query_text="Error Test", limit=5)
    assert len(suggestions) == 0 # Should return empty list on error
    mock_es_client.search.assert_called_once()
