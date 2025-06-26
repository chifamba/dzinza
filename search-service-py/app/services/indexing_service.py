from elasticsearch import AsyncElasticsearch, helpers as es_helpers
from typing import List, Dict, Any, AsyncGenerator
import httpx # For fetching data from other services
import asyncio # For batching and concurrent processing

from app.core.config import settings
from app.utils.logger import logger
from app.elasticsearch.client import get_es_client_dependency # To get ES client if not passed
from app.elasticsearch.documents import ESPersonDocument, ESFamilyTreeDocument # ES Pydantic models
# Assume data models from other services (e.g., genealogy) are available or defined as Pydantic models here
# For example, if fetching from genealogy-service API:
# from app.schemas.external.genealogy_schemas import PersonResponseSchema as GenealogyPerson, FamilyTreeResponseSchema as GenealogyFamilyTree

# --- Data Transformation Helpers (Conceptual) ---
# These would transform data from source service's format to ESPersonDocument/ESFamilyTreeDocument format.
# These are highly dependent on the actual structure of data from source services.

def transform_genealogy_person_to_es_person(source_person_data: Dict[str, Any]) -> Optional[ESPersonDocument]:
    """Transforms person data fetched from genealogy service to ESPersonDocument."""
    try:
        # Example transformation (adjust based on actual source_person_data structure)
        name_details = source_person_data.get("name_details", {})
        full_name = name_details.get("full_name_override") # Assume generate_full_name was done by source or here
        if not full_name:
             parts = [name_details.get("title"), name_details.get("first_name"), name_details.get("middle_name"), name_details.get("last_name"), name_details.get("suffix")]
             full_name = " ".join(filter(None, parts)).strip() or "Unknown"

        name_suggest_input = list(filter(None, [
            name_details.get("first_name"),
            name_details.get("last_name"),
            name_details.get("nickname")
        ]))

        return ESPersonDocument(
            id=str(source_person_data["_id"]), # Assuming _id from MongoDB source
            family_tree_id=str(source_person_data.get("family_tree_id")),
            user_id=str(source_person_data.get("user_id")), # Assuming user_id (uploader/owner) is present

            first_name=name_details.get("first_name"),
            middle_name=name_details.get("middle_name"),
            last_name=name_details.get("last_name"),
            surname_at_birth=name_details.get("surname_at_birth"),
            nickname=name_details.get("nickname"),
            full_name_searchable=full_name.lower(),
            full_name_suggest={"input": name_suggest_input, "weight": 10}, # Example weight

            gender=source_person_data.get("gender"), # Assumes already string value
            living_status=source_person_data.get("living_status"),

            birth_date_exact=source_person_data.get("birth", {}).get("date_exact"),
            birth_date_approximate=source_person_data.get("birth", {}).get("date_approximate"),
            birth_place=source_person_data.get("birth", {}).get("place"),

            death_date_exact=source_person_data.get("death", {}).get("date_exact"),
            death_date_approximate=source_person_data.get("death", {}).get("date_approximate"),
            death_place=source_person_data.get("death", {}).get("place"),

            biography=source_person_data.get("biography"),
            notes=source_person_data.get("notes"),
            profile_image_url=source_person_data.get("profile_image_url"),

            created_at=source_person_data.get("created_at"),
            updated_at=source_person_data.get("updated_at"),
        )
    except Exception as e:
        logger.error(f"Error transforming person data for ES: {source_person_data.get('_id', 'Unknown ID')}, Error: {e}", exc_info=True)
        return None

# Similar transform_genealogy_family_tree_to_es_family_tree would be needed.


class IndexingService:
    def __init__(self, es_client: AsyncElasticsearch):
        self.es_client = es_client
        self.genealogy_service_url = str(settings.GENEALOGY_SERVICE_BASE_URL) if settings.GENEALOGY_SERVICE_BASE_URL else None
        # Initialize other service URLs if needed

    async def _fetch_paginated_data_from_service(self, service_base_url: str, endpoint: str, params: Optional[Dict] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Helper to fetch paginated data from another service."""
        if not service_base_url:
            logger.error(f"Service base URL not configured for fetching data for endpoint {endpoint}.")
            return

        page = 1
        size = settings.INDEXING_BATCH_SIZE # Use configured batch size for fetching

        async with httpx.AsyncClient(base_url=service_base_url, timeout=30.0) as client:
            while True:
                current_params = (params or {}).copy()
                current_params.update({"page": page, "size": size})
                try:
                    logger.debug(f"Fetching data: {service_base_url}{endpoint} with params {current_params}")
                    response = await client.get(endpoint, params=current_params)
                    response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                    data = response.json()

                    items = data.get("items", [])
                    if not items:
                        break

                    for item in items:
                        yield item

                    # Check for pagination: if items fetched < size, assume last page
                    if len(items) < size or (data.get("total") and page * size >= data.get("total")):
                        break
                    page += 1
                    await asyncio.sleep(0.1) # Small delay to be nice to the source service

                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error fetching data from {e.request.url}: {e.response.status_code} - {e.response.text}", exc_info=True)
                    break # Stop fetching on error
                except httpx.RequestError as e:
                    logger.error(f"Request error fetching data from {e.request.url}: {e}", exc_info=True)
                    break # Stop fetching on error
                except Exception as e:
                    logger.error(f"Unexpected error fetching paginated data: {e}", exc_info=True)
                    break


    async def _bulk_index_documents(self, index_name: str, documents: List[Dict[str, Any]]):
        """Uses Elasticsearch bulk helper to index a list of documents."""
        if not documents:
            return {"success_count": 0, "errors": []}

        actions = [
            {
                "_index": index_name,
                "_id": doc.pop("id") if "id" in doc else None, # Use 'id' field from doc as ES _id
                "_source": doc
            } for doc in documents if doc # Ensure doc is not None
        ]

        try:
            successes, errors = await es_helpers.async_bulk(self.es_client, actions, raise_on_error=False, stats_only=False)
            logger.info(f"Bulk indexing to '{index_name}': {successes} successes, {len(errors)} errors.")
            if errors:
                logger.error(f"Bulk indexing errors for '{index_name}': {errors[:5]}") # Log first 5 errors
            return {"success_count": successes, "errors": errors}
        except Exception as e:
            logger.error(f"Error during bulk indexing to '{index_name}': {e}", exc_info=True)
            return {"success_count": 0, "errors": [{"error_summary": str(e)}]}


    async def index_all_persons_from_genealogy_service(self, family_tree_id_filter: Optional[str] = None):
        """Fetches all persons from genealogy service and indexes them into Elasticsearch."""
        logger.info(f"Starting indexing of all persons from genealogy service. Filter by tree: {family_tree_id_filter or 'None'}")
        if not self.genealogy_service_url:
            logger.error("Genealogy service URL not configured. Cannot index persons.")
            return {"total_processed": 0, "total_indexed": 0, "total_errors": 0}

        # The genealogy service list persons endpoint needs to support pagination and optionally filtering by tree.
        # Assuming an endpoint like /api/v1/persons/all-for-indexing (needs to be created in genealogy-service)
        # Or, iterate through all family trees, then all persons in each tree.

        # Simplified: Assuming a direct /persons endpoint that lists all persons with pagination
        # This is not ideal as it fetches all persons. A more targeted approach or event-driven is better.
        # For now, demonstrating the fetch and index pattern.

        # This conceptual endpoint would need to exist in genealogy-service and be admin-protected or use service-to-service auth.
        # It should return person data in a format that transform_genealogy_person_to_es_person expects.
        person_data_endpoint = "/api/v1/persons/internal/all" # Example internal endpoint
        params = {}
        if family_tree_id_filter:
            params["family_tree_id"] = family_tree_id_filter

        es_documents_batch: List[Dict[str, Any]] = []
        total_processed = 0
        total_indexed_successfully = 0
        total_transform_errors = 0
        total_bulk_errors = 0

        async for person_data in self._fetch_paginated_data_from_service(self.genealogy_service_url, person_data_endpoint, params=params):
            total_processed += 1
            es_person_doc_model = transform_genealogy_person_to_es_person(person_data)
            if es_person_doc_model:
                es_documents_batch.append(es_person_doc_model.model_dump(exclude_none=True))
            else:
                total_transform_errors +=1

            if len(es_documents_batch) >= settings.INDEXING_BATCH_SIZE:
                bulk_result = await self._bulk_index_documents(settings.PERSON_INDEX_NAME, es_documents_batch)
                total_indexed_successfully += bulk_result["success_count"]
                total_bulk_errors += len(bulk_result["errors"])
                es_documents_batch = [] # Clear batch

        if es_documents_batch: # Process any remaining documents
            bulk_result = await self._bulk_index_documents(settings.PERSON_INDEX_NAME, es_documents_batch)
            total_indexed_successfully += bulk_result["success_count"]
            total_bulk_errors += len(bulk_result["errors"])

        logger.info(f"Person indexing complete. Processed: {total_processed}, Transformed successfully: {total_processed - total_transform_errors}, Indexed to ES: {total_indexed_successfully}, Bulk Errors: {total_bulk_errors}")
        return {
            "total_processed_from_source": total_processed,
            "total_transformed_successfully": total_processed - total_transform_errors,
            "total_indexed_to_es": total_indexed_successfully,
            "total_bulk_operation_errors": total_bulk_errors
        }

    async def index_single_document(self, index_name: str, document_id: str, document_body: Dict[str, Any]):
        """Indexes or updates a single document in Elasticsearch."""
        try:
            await self.es_client.index(index=index_name, id=document_id, document=document_body)
            logger.info(f"Document {document_id} indexed successfully in '{index_name}'.")
            return True
        except Exception as e:
            logger.error(f"Error indexing document {document_id} in '{index_name}': {e}", exc_info=True)
            return False

    async def delete_document_from_index(self, index_name: str, document_id: str):
        """Deletes a single document from Elasticsearch."""
        try:
            await self.es_client.delete(index=index_name, id=document_id)
            logger.info(f"Document {document_id} deleted successfully from '{index_name}'.")
            return True
        except es_exceptions.NotFoundError:
            logger.warning(f"Document {document_id} not found in '{index_name}' for deletion.")
            return False # Or True if idempotent delete is fine
        except Exception as e:
            logger.error(f"Error deleting document {document_id} from '{index_name}': {e}", exc_info=True)
            return False

# This service would be instantiated and used by admin endpoints or scheduled tasks (Celery).
# Example:
# async def run_full_person_reindex():
#     es_client_instance = await get_es_client_dependency() # If called from FastAPI context
#     # Or: es_client_instance = es_client_manager.get_client() if es_client_manager is global and connected
#     service = IndexingService(es_client_instance)
#     await service.index_all_persons_from_genealogy_service()

# Note: For event-driven indexing (e.g., when a person is updated in genealogy-service),
# that service would publish an event (e.g., to RabbitMQ, Kafka).
# Search-service would then have a consumer that listens to these events,
# fetches the updated data for that specific person_id, transforms it,
# and calls `index_single_document`. This is generally preferred over full periodic re-indexing for freshness.
# Full re-indexing is useful for initial setup or recovering from inconsistencies.
