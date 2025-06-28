from elasticsearch import AsyncElasticsearch, ConflictError, NotFoundError
from app.core.config import settings
from app.utils.logger import logger

# --- Person Index ---
PERSON_INDEX_NAME = settings.PERSON_INDEX_NAME
PERSON_INDEX_MAPPINGS = {
    "properties": {
        "id": {"type": "keyword"}, # MongoDB ObjectId, stored as string
        "family_tree_id": {"type": "keyword"},
        "user_id": {"type": "keyword"}, # UUID, stored as string

        "first_name": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
        "middle_name": {"type": "text", "analyzer": "standard"},
        "last_name": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
        "surname_at_birth": {"type": "text", "analyzer": "standard"},
        "nickname": {"type": "text"},
        "full_name_searchable": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword", "ignore_above": 512}}}, # For exact matches / sorting
        "full_name_suggest": { # For autocomplete suggestions
            "type": "completion",
            "analyzer": "simple", # Or a custom analyzer for names
            "search_analyzer": "simple",
        },

        "gender": {"type": "keyword"},
        "living_status": {"type": "keyword"},

        "birth_date_exact": {"type": "date", "format": "yyyy-MM-dd||epoch_millis"},
        "birth_date_approximate": {"type": "text"},
        "birth_place": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},

        "death_date_exact": {"type": "date", "format": "yyyy-MM-dd||epoch_millis"},
        "death_date_approximate": {"type": "text"},
        "death_place": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},

        "biography": {"type": "text", "analyzer": "standard"},
        "notes": {"type": "text"},

        "profile_image_url": {"type": "keyword", "index": False}, # Usually not searched on directly

        "created_at": {"type": "date"},
        "updated_at": {"type": "date"},

        # Example for searching by relationships (denormalized or via nested/parent-child)
        # "parent_names": {"type": "text"},
        # "spouse_names": {"type": "text"},
    }
}

# --- Family Tree Index ---
FAMILY_TREE_INDEX_NAME = settings.FAMILY_TREE_INDEX_NAME
FAMILY_TREE_INDEX_MAPPINGS = {
    "properties": {
        "id": {"type": "keyword"}, # MongoDB ObjectId
        "owner_id": {"type": "keyword"}, # UUID
        "name": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
        "description": {"type": "text", "analyzer": "standard"},
        "collaborator_ids": {"type": "keyword"}, # List of UUIDs
        "visibility": {"type": "keyword"}, # From privacy_settings
        "member_count": {"type": "integer"},
        "created_at": {"type": "date"},
        "updated_at": {"type": "date"},
    }
}

# Add other index definitions (e.g., for historical records, media) as needed.

async def create_index_if_not_exists(es_client: AsyncElasticsearch, index_name: str, mappings: dict, settings: Optional[dict] = None):
    """
    Creates an Elasticsearch index with the given name, mappings, and settings if it doesn't already exist.
    """
    try:
        if not await es_client.indices.exists(index=index_name):
            logger.info(f"Index '{index_name}' not found. Creating...")
            index_body = {"mappings": mappings}
            if settings:
                index_body["settings"] = settings

            await es_client.indices.create(index=index_name, body=index_body)
            logger.info(f"Index '{index_name}' created successfully.")
        else:
            logger.info(f"Index '{index_name}' already exists.")
            # Optionally, update mappings if they've changed (can be complex and require reindexing)
            # await es_client.indices.put_mapping(index=index_name, body=mappings)
            # logger.info(f"Mappings for index '{index_name}' updated (if changed).")

    except ConflictError: # Can happen in race conditions if another process creates it
        logger.warning(f"Index '{index_name}' already exists (caught ConflictError).")
    except Exception as e:
        logger.error(f"Error creating or checking index '{index_name}': {e}", exc_info=True)
        raise # Re-raise to signal failure if critical

async def setup_elasticsearch_indices(es_client: AsyncElasticsearch):
    """
    Sets up all predefined Elasticsearch indices.
    Call this during application startup.
    """
    logger.info("Setting up Elasticsearch indices...")
    try:
        # Standard settings for text analysis (example)
        default_index_settings = {
            "analysis": {
                "analyzer": {
                    "default": { # Override default analyzer if needed
                        "type": "standard"
                    },
                    # Add custom analyzers here
                    # "my_custom_name_analyzer": { ... }
                }
            }
        }

        await create_index_if_not_exists(es_client, PERSON_INDEX_NAME, PERSON_INDEX_MAPPINGS, settings=default_index_settings)
        await create_index_if_not_exists(es_client, FAMILY_TREE_INDEX_NAME, FAMILY_TREE_INDEX_MAPPINGS, settings=default_index_settings)
        # Add calls for other indices here

        logger.info("Elasticsearch indices setup complete.")
    except Exception as e:
        logger.error(f"Failed to setup Elasticsearch indices: {e}", exc_info=True)
        # Depending on policy, might want to exit app if ES setup fails and is critical.

from typing import Optional # For settings type hint in create_index_if_not_exists
