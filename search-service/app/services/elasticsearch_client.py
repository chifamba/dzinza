"""
Elasticsearch client singleton for search service.
"""
from typing import Optional
import structlog
from elasticsearch import Elasticsearch, NotFoundError
from fastapi import HTTPException, status

from ..core.config import settings

logger = structlog.get_logger(__name__)

class ElasticsearchClientSingleton:
    """Singleton pattern for Elasticsearch client management."""
    
    _instance = None
    _client: Optional[Elasticsearch] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def initialize(self):
        """Initialize Elasticsearch client."""
        try:
            self._client = Elasticsearch(
                hosts=[settings.ELASTICSEARCH_URL],
                basic_auth=(
                    settings.ELASTICSEARCH_USERNAME, 
                    settings.ELASTICSEARCH_PASSWORD
                ),
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
                max_retries=settings.ELASTICSEARCH_MAX_RETRIES,
                retry_on_timeout=settings.ELASTICSEARCH_RETRY_ON_TIMEOUT,
            )
            
            if self._client.ping():
                logger.info("Successfully connected to Elasticsearch")
                self._create_indices()
                return True
            else:
                logger.error("Failed to connect to Elasticsearch")
                return False
                
        except Exception as e:
            logger.error("Error initializing Elasticsearch client", error=str(e))
            return False
    
    def get_client(self) -> Elasticsearch:
        """Get Elasticsearch client instance."""
        if not self._client or not self._client.ping():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Elasticsearch service unavailable"
            )
        return self._client
    
    def _create_indices(self):
        """Create Elasticsearch indices with proper mappings."""
        indices = {
            settings.ELASTICSEARCH_INDEX_PERSONS: {
                "mappings": {
                    "properties": {
                        "first_name": {
                            "type": "text", 
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "last_name": {
                            "type": "text", 
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "full_name": {"type": "text"},
                        "birth_date": {"type": "date"},
                        "death_date": {"type": "date"},
                        "place_of_birth": {"type": "text"},
                        "place_of_death": {"type": "text"},
                        "bio": {"type": "text"},
                        "privacy_level": {"type": "keyword"},
                        "family_tree_id": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "created_by": {"type": "keyword"},
                        "document_type": {"type": "keyword"},
                        "title": {"type": "text"},
                        "content": {"type": "text"},
                        "metadata": {"type": "object"}
                    }
                }
            },
            settings.ELASTICSEARCH_INDEX_EVENTS: {
                "mappings": {
                    "properties": {
                        "title": {
                            "type": "text", 
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "description": {"type": "text"},
                        "content": {"type": "text"},
                        "event_date": {"type": "date"},
                        "location": {"type": "text"},
                        "privacy_level": {"type": "keyword"},
                        "family_tree_id": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "created_by": {"type": "keyword"},
                        "document_type": {"type": "keyword"},
                        "metadata": {"type": "object"}
                    }
                }
            },
            settings.ELASTICSEARCH_INDEX_COMMENTS: {
                "mappings": {
                    "properties": {
                        "content": {"type": "text"},
                        "title": {"type": "text"},
                        "author": {"type": "keyword"},
                        "privacy_level": {"type": "keyword"},
                        "family_tree_id": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "created_by": {"type": "keyword"},
                        "document_type": {"type": "keyword"},
                        "metadata": {"type": "object"}
                    }
                }
            }
        }
        
        for index_name, mapping in indices.items():
            try:
                if not self._client.indices.exists(index=index_name):
                    self._client.indices.create(index=index_name, **mapping)
                    logger.info(f"Created index: {index_name}")
                else:
                    logger.info(f"Index already exists: {index_name}")
            except Exception as e:
                logger.error(f"Error creating index {index_name}", error=str(e))
    
    def close(self):
        """Close Elasticsearch client."""
        if self._client:
            self._client.close()
            logger.info("Elasticsearch connection closed")
