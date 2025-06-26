from elasticsearch import AsyncElasticsearch, ConnectionError, AuthenticationException, TransportError
from typing import Optional

from app.core.config import settings
from app.utils.logger import logger

class ElasticsearchClientSingleton:
    client: Optional[AsyncElasticsearch] = None

    async def connect(self):
        if self.client is not None:
            logger.info("Elasticsearch client already connected.")
            return

        logger.info(f"Connecting to Elasticsearch at {settings.ELASTICSEARCH_URL}...")
        try:
            # Basic Auth example:
            # auth = (settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD) if settings.ELASTICSEARCH_USERNAME else None
            # API Key example:
            # api_key = (settings.ELASTICSEARCH_API_KEY_ID, settings.ELASTICSEARCH_API_KEY) if settings.ELASTICSEARCH_API_KEY_ID else None
            # ca_certs = settings.ELASTICSEARCH_CA_CERTS if settings.ELASTICSEARCH_CA_CERTS else None

            # Determine connection parameters based on settings
            connection_params = {
                "hosts": [str(settings.ELASTICSEARCH_URL)],
                # "basic_auth": auth, # Uncomment and use if basic auth configured
                # "api_key": api_key,   # Uncomment and use if API key configured
                # "ca_certs": ca_certs, # For custom CA certs with HTTPS
                # "verify_certs": True if ca_certs else False, # Adjust based on SSL setup
                # "ssl_show_warn": False, # Suppress SSL warnings if using self-signed certs with verify_certs=False (not for prod)
            }
            # Remove None params
            connection_params = {k: v for k, v in connection_params.items() if v is not None}

            self.client = AsyncElasticsearch(**connection_params)

            if not await self.client.ping():
                logger.error("Failed to ping Elasticsearch. Connection unsuccessful.")
                self.client = None # Reset client on failed ping
                raise ConnectionError("Failed to connect to Elasticsearch: Ping failed")

            logger.info("Successfully connected to Elasticsearch.")

            # Optionally, log cluster info
            # cluster_info = await self.client.info()
            # logger.info(f"Elasticsearch cluster info: {cluster_info.body}")

        except AuthenticationException as e:
            logger.error(f"Elasticsearch authentication failed: {e}", exc_info=True)
            self.client = None
            raise
        except ConnectionError as e:
            logger.error(f"Elasticsearch connection failed: {e}", exc_info=True)
            self.client = None
            raise
        except TransportError as e: # More generic transport errors
            logger.error(f"Elasticsearch transport error: {e}", exc_info=True)
            self.client = None
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to Elasticsearch: {e}", exc_info=True)
            self.client = None
            raise

    async def close(self):
        if self.client:
            logger.info("Closing Elasticsearch connection...")
            await self.client.close()
            self.client = None # Clear the client instance
            logger.info("Elasticsearch connection closed.")

    def get_client(self) -> AsyncElasticsearch:
        if self.client is None:
            logger.error("Elasticsearch client is not available. Ensure connect_to_elasticsearch was called and succeeded.")
            raise RuntimeError("Elasticsearch client not initialized.")
        return self.client

# Global instance of the client wrapper
es_client_manager = ElasticsearchClientSingleton()

# Functions to be used in lifespan or elsewhere
async def connect_to_elasticsearch():
    await es_client_manager.connect()

async def close_elasticsearch_connection():
    await es_client_manager.close()

# Dependency for FastAPI routes
async def get_es_client_dependency() -> AsyncElasticsearch:
    return es_client_manager.get_client()

# Alias for easier import in other modules
es_client: AsyncElasticsearch = es_client_manager.get_client # This provides the method, not the client directly.
# To use: client = await es_client() in an async function, or client = Depends(get_es_client_dependency) in routes.
# Or, more directly:
# from app.elasticsearch.client import es_client_manager
# client = es_client_manager.get_client() (but this needs connect to have been called)
# The dependency `get_es_client_dependency` is the safest for routes.
