from elasticsearch import AsyncElasticsearch, ConnectionError, ElasticsearchException
from typing import Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

class ElasticsearchClientSingleton:
    client: Optional[AsyncElasticsearch] = None

    @classmethod
    async def initialize(cls):
        if cls.client is not None:
            logger.info("Elasticsearch client already initialized.")
            return

        logger.info("Initializing Elasticsearch client...", config=settings.ELASTICSEARCH_CLIENT_CONFIG)
        try:
            # ELASTICSEARCH_CLIENT_CONFIG is built in config.py from various env vars
            # (cloud_id, hosts, api_key, basic_auth)
            if not settings.ELASTICSEARCH_CLIENT_CONFIG:
                logger.error("Elasticsearch client configuration is empty. Cannot initialize.")
                # This indicates a problem with settings population, likely ELASTICSEARCH_URL/HOSTS not set.
                raise ValueError("Elasticsearch client configuration is empty.")

            cls.client = AsyncElasticsearch(**settings.ELASTICSEARCH_CLIENT_CONFIG)

            # Verify connection
            if not await cls.client.ping():
                logger.error("Elasticsearch ping failed. Client initialized but could not connect.")
                # Closing the client here might be too aggressive if it's a transient issue.
                # However, if ping fails, most operations will fail.
                await cls.client.close() # Attempt to close the non-functional client
                cls.client = None
                raise ConnectionError("Failed to ping Elasticsearch cluster after initialization.")

            logger.info("Elasticsearch client initialized and connection verified.")
        except ElasticsearchException as e:
            logger.error(f"Failed to initialize Elasticsearch client: {e}", exc_info=True)
            if cls.client: # If client was partially created before error
                try:
                    await cls.client.close()
                except Exception as close_err:
                    logger.error(f"Error closing Elasticsearch client after init failure: {close_err}", exc_info=True)
            cls.client = None # Ensure client is None if init fails
            raise # Re-raise the original exception to signal failure

    @classmethod
    async def close(cls):
        if cls.client:
            logger.info("Closing Elasticsearch client...")
            try:
                await cls.client.close()
                cls.client = None
                logger.info("Elasticsearch client closed.")
            except Exception as e:
                logger.error(f"Error closing Elasticsearch client: {e}", exc_info=True)
                # Even if close fails, set client to None to indicate it's no longer usable
                cls.client = None
        else:
            logger.info("Elasticsearch client was not initialized or already closed.")

    @classmethod
    def get_client(cls) -> AsyncElasticsearch:
        if cls.client is None:
            logger.error("Elasticsearch client accessed before initialization or after a failed initialization.")
            # This state should ideally be prevented by proper app lifecycle management.
            raise RuntimeError("Elasticsearch client is not available. Ensure it's initialized at application startup.")
        return cls.client

# Functions to be called from main.py startup/shutdown events
async def init_es_client():
    await ElasticsearchClientSingleton.initialize()

async def close_es_client():
    await ElasticsearchClientSingleton.close()

# Dependency for FastAPI endpoints to get the ES client
async def get_es_client_dependency() -> AsyncElasticsearch:
    return ElasticsearchClientSingleton.get_client()

# Example usage in a task or other non-request scope (if needed, carefully manage lifecycle)
# async def get_es_client_for_task() -> AsyncElasticsearch:
#     if ElasticsearchClientSingleton.client is None:
#         await ElasticsearchClientSingleton.initialize() # Or handle error if not expected to init here
#     return ElasticsearchClientSingleton.get_client()
