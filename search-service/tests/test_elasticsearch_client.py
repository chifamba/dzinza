import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from elasticsearch import AsyncElasticsearch, ConnectionError as ESConnectionError, ElasticsearchException

# Module to test
from app.services import elasticsearch_client
from app.core.config import Settings # To override settings for testing

@pytest_asyncio.fixture
async def mock_es_ping_success(monkeypatch):
    """Mocks AsyncElasticsearch.ping to return True."""
    mock_ping = AsyncMock(return_value=True)
    monkeypatch.setattr(AsyncElasticsearch, "ping", mock_ping)
    return mock_ping

@pytest_asyncio.fixture
async def mock_es_ping_failure(monkeypatch):
    """Mocks AsyncElasticsearch.ping to return False."""
    mock_ping = AsyncMock(return_value=False)
    monkeypatch.setattr(AsyncElasticsearch, "ping", mock_ping)
    return mock_ping

@pytest_asyncio.fixture
async def mock_es_ping_raises_connection_error(monkeypatch):
    """Mocks AsyncElasticsearch.ping to raise ConnectionError."""
    mock_ping = AsyncMock(side_effect=ESConnectionError("Ping failed"))
    monkeypatch.setattr(AsyncElasticsearch, "ping", mock_ping)
    return mock_ping

@pytest_asyncio.fixture
async def mock_es_constructor(monkeypatch):
    """Mocks AsyncElasticsearch constructor."""
    mock_instance = AsyncMock(spec=AsyncElasticsearch)
    # We need to mock methods called on the instance, like close() and ping() if not mocked separately
    mock_instance.ping = AsyncMock(return_value=True) # Default to successful ping
    mock_instance.close = AsyncMock()

    mock_constructor = MagicMock(return_value=mock_instance)
    monkeypatch.setattr(elasticsearch_client, "AsyncElasticsearch", mock_constructor) # Patch where it's imported
    return mock_constructor, mock_instance


# Test successful initialization
@pytest.mark.asyncio
async def test_initialize_success(mock_es_constructor, monkeypatch):
    # Ensure client is None initially for a clean test run
    elasticsearch_client.ElasticsearchClientSingleton.client = None

    # Mock settings to provide a valid config
    mock_settings = Settings(ELASTICSEARCH_CLIENT_CONFIG={"hosts": ["http://localhost:9200"]})
    monkeypatch.setattr(elasticsearch_client, "settings", mock_settings)

    _, mock_es_instance = mock_es_constructor

    await elasticsearch_client.ElasticsearchClientSingleton.initialize()

    assert elasticsearch_client.ElasticsearchClientSingleton.client is not None
    mock_es_constructor.assert_called_once_with(**mock_settings.ELASTICSEARCH_CLIENT_CONFIG)
    mock_es_instance.ping.assert_called_once()

    # Cleanup for other tests
    await elasticsearch_client.ElasticsearchClientSingleton.close()


@pytest.mark.asyncio
async def test_initialize_ping_fails(mock_es_constructor, mock_es_ping_failure, monkeypatch):
    elasticsearch_client.ElasticsearchClientSingleton.client = None
    mock_settings = Settings(ELASTICSEARCH_CLIENT_CONFIG={"hosts": ["http://localhost:9200"]})
    monkeypatch.setattr(elasticsearch_client, "settings", mock_settings)

    mock_constructor, mock_es_instance = mock_es_constructor
    # Override the ping specifically for this test if mock_es_constructor's default ping isn't what we want
    mock_es_instance.ping = mock_es_ping_failure


    with pytest.raises(ESConnectionError, match="Failed to ping Elasticsearch cluster after initialization."):
        await elasticsearch_client.ElasticsearchClientSingleton.initialize()

    assert elasticsearch_client.ElasticsearchClientSingleton.client is None
    mock_es_instance.ping.assert_called_once()
    mock_es_instance.close.assert_called_once() # Should attempt to close if ping fails after init


@pytest.mark.asyncio
async def test_initialize_constructor_fails(monkeypatch):
    elasticsearch_client.ElasticsearchClientSingleton.client = None
    mock_settings = Settings(ELASTICSEARCH_CLIENT_CONFIG={"hosts": ["http://localhost:9200"]})
    monkeypatch.setattr(elasticsearch_client, "settings", mock_settings)

    # Mock AsyncElasticsearch constructor to raise an exception
    mock_failing_constructor = MagicMock(side_effect=ElasticsearchException("Constructor failed"))
    monkeypatch.setattr(elasticsearch_client, "AsyncElasticsearch", mock_failing_constructor)

    with pytest.raises(ElasticsearchException, match="Constructor failed"):
        await elasticsearch_client.ElasticsearchClientSingleton.initialize()

    assert elasticsearch_client.ElasticsearchClientSingleton.client is None


@pytest.mark.asyncio
async def test_get_client_not_initialized():
    elasticsearch_client.ElasticsearchClientSingleton.client = None # Ensure it's not initialized
    with pytest.raises(RuntimeError, match="Elasticsearch client is not available."):
        elasticsearch_client.ElasticsearchClientSingleton.get_client()

@pytest.mark.asyncio
async def test_get_client_success(mock_es_constructor, monkeypatch):
    # Initialize first
    elasticsearch_client.ElasticsearchClientSingleton.client = None
    mock_settings = Settings(ELASTICSEARCH_CLIENT_CONFIG={"hosts": ["http://localhost:9200"]})
    monkeypatch.setattr(elasticsearch_client, "settings", mock_settings)

    await elasticsearch_client.ElasticsearchClientSingleton.initialize()

    client_instance = elasticsearch_client.ElasticsearchClientSingleton.get_client()
    assert client_instance is not None
    assert isinstance(client_instance, AsyncMock) # Because mock_es_constructor returns an AsyncMock instance

    await elasticsearch_client.ElasticsearchClientSingleton.close()


@pytest.mark.asyncio
async def test_close_client(mock_es_constructor, monkeypatch):
    elasticsearch_client.ElasticsearchClientSingleton.client = None
    mock_settings = Settings(ELASTICSEARCH_CLIENT_CONFIG={"hosts": ["http://localhost:9200"]})
    monkeypatch.setattr(elasticsearch_client, "settings", mock_settings)

    _, mock_es_instance = mock_es_constructor

    await elasticsearch_client.ElasticsearchClientSingleton.initialize()
    assert elasticsearch_client.ElasticsearchClientSingleton.client is not None

    await elasticsearch_client.ElasticsearchClientSingleton.close()
    assert elasticsearch_client.ElasticsearchClientSingleton.client is None
    mock_es_instance.close.assert_called_once()

@pytest.mark.asyncio
async def test_close_already_closed_or_uninitialized():
    elasticsearch_client.ElasticsearchClientSingleton.client = None
    # Should not raise an error, just log
    await elasticsearch_client.ElasticsearchClientSingleton.close()
    # No specific assertion other than it doesn't crash

# Test the helper functions for main.py
@pytest.mark.asyncio
@patch("app.services.elasticsearch_client.ElasticsearchClientSingleton.initialize", new_callable=AsyncMock)
async def test_init_es_client_calls_singleton_initialize(mock_singleton_init):
    await elasticsearch_client.init_es_client()
    mock_singleton_init.assert_called_once()

@pytest.mark.asyncio
@patch("app.services.elasticsearch_client.ElasticsearchClientSingleton.close", new_callable=AsyncMock)
async def test_close_es_client_calls_singleton_close(mock_singleton_close):
    await elasticsearch_client.close_es_client()
    mock_singleton_close.assert_called_once()

@pytest.mark.asyncio
@patch("app.services.elasticsearch_client.ElasticsearchClientSingleton.get_client")
async def test_get_es_client_dependency_calls_singleton_get_client(mock_singleton_get_client):
    mock_singleton_get_client.return_value = AsyncMock(spec=AsyncElasticsearch)
    await elasticsearch_client.get_es_client_dependency()
    mock_singleton_get_client.assert_called_once()
