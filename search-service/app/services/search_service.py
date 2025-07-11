"""
Main search service with business logic for all search operations.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import structlog
from elasticsearch import Elasticsearch, NotFoundError
from fastapi import HTTPException, status

from ..core.config import settings
from ..schemas.search import (
    SearchQuery, PersonSearchQuery, SuggestQuery, 
    IndexDocumentRequest, UpdateDocumentRequest,
    SearchResponse, SearchResultItem, SuggestResponse, IndexResponse
)
from .analytics import AnalyticsDataStorage

logger = structlog.get_logger(__name__)

class SearchService:
    """Main search service with business logic."""
    
    def __init__(self, es_client: Elasticsearch, analytics: AnalyticsDataStorage):
        self.es_client = es_client
        self.analytics = analytics
    
    async def general_search(
        self, 
        query: SearchQuery, 
        user_claims: Dict[str, Any]
    ) -> SearchResponse:
        """Perform general search across all document types."""
        start_time = datetime.now()
        
        # Build Elasticsearch query
        es_query = self._build_general_query(query, user_claims)
        
        # Execute search
        try:
            response = self.es_client.search(
                index=self._get_search_indices(query.document_types),
                body={
                    "query": es_query,
                    "highlight": {
                        "fields": {
                            "title": {},
                            "content": {},
                            "first_name": {},
                            "last_name": {},
                        }
                    },
                    "sort": [
                        {query.sort_by: {"order": query.sort_order}}
                    ] if query.sort_by != "_score" else [],
                },
                from_=query.skip,
                size=query.limit,
            )
            
            # Process results
            results = []
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                result = SearchResultItem(
                    id=hit["_id"],
                    score=hit["_score"],
                    document_type=source.get("document_type", "unknown"),
                    title=source.get("title", ""),
                    content=source.get("content", ""),
                    privacy_level=source.get("privacy_level", "public"),
                    family_tree_id=source.get("family_tree_id"),
                    metadata=source.get("metadata"),
                    highlights=hit.get("highlight"),
                    created_at=source.get("created_at"),
                    updated_at=source.get("updated_at"),
                )
                results.append(result)
            
            total = response["hits"]["total"]["value"]
            query_time_ms = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            
            # Log analytics
            await self.analytics.log_search(
                query=query.model_dump(),
                results_count=total,
                response_time_ms=query_time_ms
            )
            
            return SearchResponse(
                results=results,
                total=total,
                page=(query.skip // query.limit) + 1,
                per_page=query.limit,
                total_pages=(total + query.limit - 1) // query.limit,
                query_time_ms=query_time_ms,
            )
            
        except Exception as e:
            logger.error("Search failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Search operation failed"
            )
    
    async def person_search(
        self, 
        query: PersonSearchQuery, 
        user_claims: Dict[str, Any]
    ) -> SearchResponse:
        """Perform specialized search for people."""
        start_time = datetime.now()
        
        # Build person-specific query
        es_query = self._build_person_query(query, user_claims)
        
        try:
            response = self.es_client.search(
                index=settings.ELASTICSEARCH_INDEX_PERSONS,
                body={
                    "query": es_query,
                    "highlight": {
                        "fields": {
                            "first_name": {},
                            "last_name": {},
                            "full_name": {},
                            "bio": {},
                        }
                    },
                },
                from_=query.skip,
                size=query.limit,
            )
            
            # Process results
            results = []
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                full_name = (
                    f"{source.get('first_name', '')} "
                    f"{source.get('last_name', '')}"
                ).strip()
                result = SearchResultItem(
                    id=hit["_id"],
                    score=hit["_score"],
                    document_type="person",
                    title=full_name,
                    content=source.get("bio", ""),
                    privacy_level=source.get("privacy_level", "public"),
                    family_tree_id=source.get("family_tree_id"),
                    metadata=source,
                    highlights=hit.get("highlight"),
                    created_at=source.get("created_at"),
                    updated_at=source.get("updated_at"),
                )
                results.append(result)
            
            total = response["hits"]["total"]["value"]
            query_time_ms = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            
            # Log analytics
            await self.analytics.log_search(
                query=query.model_dump(),
                results_count=total,
                response_time_ms=query_time_ms
            )
            
            return SearchResponse(
                results=results,
                total=total,
                page=(query.skip // query.limit) + 1,
                per_page=query.limit,
                total_pages=(total + query.limit - 1) // query.limit,
                query_time_ms=query_time_ms,
            )
            
        except Exception as e:
            logger.error("Person search failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Person search operation failed"
            )
    
    async def get_suggestions(
        self, 
        query: SuggestQuery, 
        user_claims: Dict[str, Any]
    ) -> SuggestResponse:
        """Get type-ahead suggestions."""
        try:
            # Use simple term search for suggestions
            response = self.es_client.search(
                index=self._get_search_indices(),
                body={
                    "query": {
                        "multi_match": {
                            "query": query.query,
                            "fields": ["title^3", "first_name^2", "last_name^2"],
                            "type": "phrase_prefix",
                            "max_expansions": 50
                        }
                    },
                    "_source": ["title", "first_name", "last_name"],
                    "size": query.limit * 2,  # Get more to filter duplicates
                }
            )
            
            suggestions = set()
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                if source.get("title"):
                    suggestions.add(source["title"])
                if source.get("first_name") and source.get("last_name"):
                    full_name = f"{source['first_name']} {source['last_name']}"
                    suggestions.add(full_name)
            
            suggestions_list = list(suggestions)[:query.limit]
            
            return SuggestResponse(
                suggestions=suggestions_list,
                query=query.query,
                total=len(suggestions_list)
            )
            
        except Exception as e:
            logger.error("Suggestions failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Suggestions operation failed"
            )
    
    async def index_document(
        self, 
        document: IndexDocumentRequest, 
        user_claims: Dict[str, Any]
    ) -> IndexResponse:
        """Index a new document."""
        try:
            doc_id = str(uuid4())
            doc_body = {
                "title": document.title,
                "content": document.content,
                "document_type": document.document_type,
                "privacy_level": document.privacy_level,
                "family_tree_id": document.family_tree_id,
                "metadata": document.metadata or {},
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "created_by": user_claims.get("sub"),
            }
            
            # Determine target index
            index_name = self._get_index_for_document_type(document.document_type)
            
            self.es_client.index(
                index=index_name,
                id=doc_id,
                body=doc_body,
                refresh=True,
            )
            
            return IndexResponse(
                id=doc_id,
                status="created",
                message="Document indexed successfully"
            )
            
        except Exception as e:
            logger.error("Document indexing failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document indexing failed"
            )
    
    async def update_document(
        self, 
        doc_id: str, 
        updates: UpdateDocumentRequest, 
        user_claims: Dict[str, Any]
    ) -> IndexResponse:
        """Update an existing document."""
        try:
            # Build update body
            update_body = {"updated_at": datetime.now(timezone.utc)}
            if updates.title:
                update_body["title"] = updates.title
            if updates.content:
                update_body["content"] = updates.content
            if updates.privacy_level:
                update_body["privacy_level"] = updates.privacy_level
            if updates.metadata:
                update_body["metadata"] = updates.metadata
            
            # Try to update in all indices
            updated = False
            for index_name in self._get_search_indices():
                try:
                    self.es_client.update(
                        index=index_name,
                        id=doc_id,
                        body={"doc": update_body},
                        refresh=True,
                    )
                    updated = True
                    break
                except NotFoundError:
                    continue
            
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            return IndexResponse(
                id=doc_id,
                status="updated",
                message="Document updated successfully"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Document update failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document update failed"
            )
    
    async def delete_document(
        self, 
        doc_id: str, 
        user_claims: Dict[str, Any]
    ) -> IndexResponse:
        """Delete a document from the search index."""
        try:
            # Try to delete from all indices
            deleted = False
            for index_name in self._get_search_indices():
                try:
                    self.es_client.delete(
                        index=index_name,
                        id=doc_id,
                        refresh=True,
                    )
                    deleted = True
                    break
                except NotFoundError:
                    continue
            
            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            return IndexResponse(
                id=doc_id,
                status="deleted",
                message="Document deleted successfully"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Document deletion failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document deletion failed"
            )
    
    def _build_general_query(
        self, 
        query: SearchQuery, 
        user_claims: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build Elasticsearch query for general search."""
        must_clauses = []
        filter_clauses = []
        
        # Main query
        if query.query:
            must_clauses.append({
                "multi_match": {
                    "query": query.query,
                    "fields": [
                        "title^2", "content", "first_name^2", "last_name^2"
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })
        
        # Document type filter
        if query.document_types:
            filter_clauses.append({
                "terms": {"document_type": query.document_types}
            })
        
        # Privacy level filter
        if query.privacy_levels:
            filter_clauses.append({
                "terms": {"privacy_level": query.privacy_levels}
            })
        
        # Family tree filter
        if query.family_tree_id:
            filter_clauses.append({
                "term": {"family_tree_id": query.family_tree_id}
            })
        
        # Date range filter
        if query.date_range:
            date_filter = {}
            if query.date_range.start_date:
                date_filter["gte"] = query.date_range.start_date
            if query.date_range.end_date:
                date_filter["lte"] = query.date_range.end_date
            if date_filter:
                filter_clauses.append({"range": {"created_at": date_filter}})
        
        # Privacy-aware filtering based on user permissions
        privacy_filter = self._build_privacy_filter(user_claims)
        if privacy_filter:
            filter_clauses.append(privacy_filter)
        
        if not must_clauses:
            must_clauses.append({"match_all": {}})
        
        return {
            "bool": {
                "must": must_clauses,
                "filter": filter_clauses,
            }
        }
    
    def _build_person_query(
        self, 
        query: PersonSearchQuery, 
        user_claims: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build Elasticsearch query for person search."""
        must_clauses = []
        filter_clauses = []
        should_clauses = []
        
        # Name searches
        if query.first_name:
            must_clauses.append({
                "match": {
                    "first_name": {
                        "query": query.first_name,
                        "fuzziness": "AUTO" if query.fuzzy_matching else "0"
                    }
                }
            })
        
        if query.last_name:
            must_clauses.append({
                "match": {
                    "last_name": {
                        "query": query.last_name,
                        "fuzziness": "AUTO" if query.fuzzy_matching else "0"
                    }
                }
            })
        
        if query.full_name:
            must_clauses.append({
                "match": {
                    "full_name": {
                        "query": query.full_name,
                        "fuzziness": "AUTO" if query.fuzzy_matching else "0"
                    }
                }
            })
        
        # Date filters
        if query.birth_date:
            filter_clauses.append({"term": {"birth_date": query.birth_date}})
        elif query.birth_date_range:
            date_filter = {}
            if query.birth_date_range.start_date:
                date_filter["gte"] = query.birth_date_range.start_date
            if query.birth_date_range.end_date:
                date_filter["lte"] = query.birth_date_range.end_date
            if date_filter:
                filter_clauses.append({"range": {"birth_date": date_filter}})
        
        if query.death_date:
            filter_clauses.append({"term": {"death_date": query.death_date}})
        elif query.death_date_range:
            date_filter = {}
            if query.death_date_range.start_date:
                date_filter["gte"] = query.death_date_range.start_date
            if query.death_date_range.end_date:
                date_filter["lte"] = query.death_date_range.end_date
            if date_filter:
                filter_clauses.append({"range": {"death_date": date_filter}})
        
        # Place searches
        if query.place_of_birth:
            should_clauses.append({
                "match": {
                    "place_of_birth": {
                        "query": query.place_of_birth,
                        "boost": 1.5
                    }
                }
            })
        
        if query.place_of_death:
            should_clauses.append({
                "match": {
                    "place_of_death": {
                        "query": query.place_of_death,
                        "boost": 1.5
                    }
                }
            })
        
        # Family tree filter
        if query.family_tree_id:
            filter_clauses.append({
                "term": {"family_tree_id": query.family_tree_id}
            })
        
        # Privacy-aware filtering
        privacy_filter = self._build_privacy_filter(user_claims)
        if privacy_filter:
            filter_clauses.append(privacy_filter)
        
        if not must_clauses and not should_clauses:
            must_clauses.append({"match_all": {}})
        
        return {
            "bool": {
                "must": must_clauses,
                "should": should_clauses,
                "filter": filter_clauses,
                "minimum_should_match": (
                    1 if should_clauses and not must_clauses else 0
                )
            }
        }
    
    def _build_privacy_filter(
        self, 
        user_claims: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Build privacy filter based on user permissions."""
        user_id = user_claims.get("sub")
        user_family_trees = user_claims.get("family_trees", [])
        
        # Admin users can see everything
        if user_claims.get("role") == "admin":
            return None
        
        # Build privacy filter
        privacy_conditions = [
            {"term": {"privacy_level": "public"}},
        ]
        
        # Add family-level access
        if user_family_trees:
            privacy_conditions.append({
                "bool": {
                    "must": [
                        {"term": {"privacy_level": "family"}},
                        {"terms": {"family_tree_id": user_family_trees}}
                    ]
                }
            })
        
        # Add private access for own documents
        if user_id:
            privacy_conditions.append({
                "bool": {
                    "must": [
                        {"term": {"privacy_level": "private"}},
                        {"term": {"created_by": user_id}}
                    ]
                }
            })
        
        return {"bool": {"should": privacy_conditions}}
    
    def _get_search_indices(
        self, 
        document_types: Optional[List[str]] = None
    ) -> List[str]:
        """Get list of indices to search based on document types."""
        all_indices = [
            settings.ELASTICSEARCH_INDEX_PERSONS,
            settings.ELASTICSEARCH_INDEX_EVENTS,
            settings.ELASTICSEARCH_INDEX_COMMENTS,
        ]
        
        if not document_types:
            return all_indices
        
        indices = []
        for doc_type in document_types:
            index_name = self._get_index_for_document_type(doc_type)
            if index_name and index_name not in indices:
                indices.append(index_name)
        
        return indices if indices else all_indices
    
    def _get_index_for_document_type(self, document_type: str) -> str:
        """Get index name for a specific document type."""
        mapping = {
            "person": settings.ELASTICSEARCH_INDEX_PERSONS,
            "event": settings.ELASTICSEARCH_INDEX_EVENTS,
            "comment": settings.ELASTICSEARCH_INDEX_COMMENTS,
        }
        return mapping.get(document_type, settings.ELASTICSEARCH_INDEX_PERSONS)
