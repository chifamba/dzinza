import { Client } from "@elastic/elasticsearch";
import { getElasticsearchClient } from "../config/elasticsearch";
import { logger } from "../utils/logger";

interface IndexDocumentParams {
  indexName: string;
  documentId: string;
  documentBody: object;
}

interface BulkIndexDocument {
  id: string;
  body: object;
}

interface BulkIndexDocumentsParams {
  indexName: string;
  documents: BulkIndexDocument[];
}

// --- Search Service Interfaces ---
export type SearchableType = "person" | "event" | "comment";
export type SortByType = "relevance" | "date" | "name";
export type SortOrderType = "asc" | "desc";

export interface SearchParams {
  query: string;
  types?: SearchableType[]; // e.g. ['person', 'event']
  page?: number;
  limit?: number;
  sortBy?: SortByType;
  sortOrder?: SortOrderType;
  // New filter fields
  eventDateFrom?: string;
  eventDateTo?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  deathDateFrom?: string;
  deathDateTo?: string;
  location?: string;
  tags?: string[]; // Expect an array of strings
  category?: string;
  // familyTreeId?: string; // Example of a more specific cross-cutting filter
}

export interface SearchResultHit {
  _id: string;
  _score: number | null; // Score might be null if sorting by field
  _index: string; // To know the type of the document
  _source: any; // The actual document
  highlight?: Record<string, string[]>; // Key is field name, value is array of HTML snippets
}

export interface SearchResults {
  data: SearchResultHit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class SearchAndIndexingService {
  private client: Client;

  constructor() {
    try {
      this.client = getElasticsearchClient();
    } catch (error) {
      logger.error(
        "Failed to get Elasticsearch client in SearchAndIndexingService:",
        error
      );
      throw error;
    }
  }

  async indexDocument({
    indexName,
    documentId,
    documentBody,
  }: IndexDocumentParams): Promise<void> {
    if (!this.client) {
      logger.error(
        "Elasticsearch client not available. Cannot index document."
      );
      throw new Error("Elasticsearch client not available.");
    }
    try {
      await this.client.index({
        index: indexName,
        id: documentId,
        body: documentBody,
        refresh: "wait_for", // Or true for immediate visibility, 'wait_for' is a good compromise
      });
      logger.info(
        `Document ${documentId} indexed successfully in ${indexName}.`
      );
    } catch (error) {
      logger.error(
        `Error indexing document ${documentId} in ${indexName}:`,
        error
      );
      // Consider rethrowing or specific error handling based on application needs
      throw error;
    }
  }

  async deleteDocument(indexName: string, documentId: string): Promise<void> {
    if (!this.client) {
      logger.error(
        "Elasticsearch client not available. Cannot delete document."
      );
      throw new Error("Elasticsearch client not available.");
    }
    try {
      await this.client.delete({
        index: indexName,
        id: documentId,
        refresh: "wait_for",
      });
      logger.info(
        `Document ${documentId} deleted successfully from ${indexName}.`
      );
    } catch (error: any) {
      // It's common for delete to fail if doc doesn't exist, ES returns 404.
      // Check if error is a 404, which might not be a "failure" in some contexts.
      if (error.meta && error.meta.statusCode === 404) {
        logger.warn(
          `Document ${documentId} not found in ${indexName} for deletion, but considered successful.`
        );
        return; // Or handle as desired
      }
      logger.error(
        `Error deleting document ${documentId} from ${indexName}:`,
        error
      );
      throw error;
    }
  }

  async bulkIndexDocuments({
    indexName,
    documents,
  }: BulkIndexDocumentsParams): Promise<void> {
    if (!this.client) {
      logger.error(
        "Elasticsearch client not available. Cannot bulk index documents."
      );
      throw new Error("Elasticsearch client not available.");
    }
    if (documents.length === 0) {
      logger.info("No documents provided for bulk indexing.");
      return;
    }

    const operations = documents.flatMap((doc) => [
      { index: { _index: indexName, _id: doc.id } },
      doc.body,
    ]);

    try {
      const bulkResponse = await this.client.bulk({
        refresh: "wait_for",
        operations,
      });

      if (bulkResponse.errors) {
        const erroredDocuments: any[] = [];
        // The items array directly Corresponds to the operations array
        bulkResponse.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0]; // e.g., "index", "create"
          if (operation && action[operation] && action[operation].error) {
            erroredDocuments.push({
              // Operation i relates to document at index i in the original documents array
              // Since operations are [action, docBody, action, docBody...], this needs care.
              // Each document corresponds to two operations items.
              id: documents[Math.floor(i / 2)]?.id || `unknown-${i}`,
              error: action[operation].error,
            });
          }
        });
        logger.error(
          `Errors during bulk indexing in ${indexName}:`,
          erroredDocuments
        );
        throw new Error(
          `Bulk indexing completed with errors. ${erroredDocuments.length} documents failed.`
        );
      } else {
        logger.info(
          `Bulk indexing of ${documents.length} documents to ${indexName} completed successfully.`
        );
      }
    } catch (error) {
      logger.error(
        `Error during bulk indexing operation in ${indexName}:`,
        error
      );
      throw error;
    }
  }

  // Helper to strip HTML for plain text content
  stripHtml(html: string): string {
    if (!html || typeof html !== "string") return "";
    return html.replace(/<[^>]+>/g, "");
  }

  // --- Search Method ---
  async performSearch(params: SearchParams): Promise<SearchResults> {
    if (!this.client) {
      logger.error(
        "Elasticsearch client not available. Cannot perform search."
      );
      throw new Error("Elasticsearch client not available.");
    }

    const {
      query,
      types = [], // Default to empty array, meaning search all configured default indices
      page = 1,
      limit = 10,
      sortBy = "relevance",
      sortOrder = "desc",
      // Destructure new filter params
      eventDateFrom,
      eventDateTo,
      birthDateFrom,
      birthDateTo,
      deathDateFrom,
      deathDateTo,
      location,
      tags,
      category,
    } = params;

    const from = (page - 1) * limit;

    // Determine target indices and fields for multi_match
    let targetIndices: string[] = [];
    let multiMatchFields: string[] = [];

    const defaultSearchIndices = ["persons", "events", "comments"]; // Default if no types specified

    const typeToDefinitionMap: Record<
      SearchableType,
      {
        index: string;
        fields: string[];
        highlightFields: Record<string, object>;
      }
    > = {
      person: {
        index: "persons",
        fields: [
          "firstName^3",
          "lastName^3",
          "fullName^3",
          "biography",
          "birthPlaceName",
          "deathPlaceName",
        ],
        highlightFields: {
          firstName: {},
          lastName: {},
          fullName: {},
          biography: { fragment_size: 150, number_of_fragments: 1 },
        },
      },
      event: {
        index: "events",
        fields: [
          "title^3",
          "plainTextContent",
          "placeName",
          "category^2",
          "tags^2",
        ],
        highlightFields: {
          title: {},
          plainTextContent: { fragment_size: 150, number_of_fragments: 1 },
          tags: {},
          category: {},
        },
      },
      comment: {
        index: "comments",
        fields: ["content", "userName"],
        highlightFields: {
          content: { fragment_size: 150, number_of_fragments: 1 },
          userName: {},
        },
      },
    };

    let highlightFieldsConfig: Record<string, object> = {};

    if (types.length > 0) {
      types.forEach((type) => {
        if (typeToDefinitionMap[type]) {
          targetIndices.push(typeToDefinitionMap[type].index);
          multiMatchFields.push(...typeToDefinitionMap[type].fields);
          highlightFieldsConfig = {
            ...highlightFieldsConfig,
            ...typeToDefinitionMap[type].highlightFields,
          };
        }
      });
    } else {
      // Default to all types
      targetIndices = defaultSearchIndices;
      defaultSearchIndices.forEach((indexName) => {
        const typeEntry = Object.entries(typeToDefinitionMap).find(
          ([, val]) => val.index === indexName
        );
        if (typeEntry) {
          const typeDef = typeEntry[1];
          multiMatchFields.push(...typeDef.fields);
          highlightFieldsConfig = {
            ...highlightFieldsConfig,
            ...typeDef.highlightFields,
          };
        }
      });
    }

    multiMatchFields = [...new Set(multiMatchFields)]; // Ensure unique fields for query

    if (targetIndices.length === 0) {
      logger.warn(
        "Search attempted with no valid types or default indices. Returning empty results."
      );
      return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
    if (multiMatchFields.length === 0) {
      logger.warn(
        "Search attempted with no fields to search on. Returning empty results."
      );
      return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }

    // --- Build Filter Clauses ---
    const filterClauses: any[] = [];

    // Event Date Range Filter
    if (eventDateFrom || eventDateTo) {
      if (types.length === 0 || types.includes("event")) {
        const rangeQuery: any = { eventDate: {} }; // Assuming 'eventDate' is the ES field for Events
        if (eventDateFrom) rangeQuery.eventDate.gte = eventDateFrom;
        if (eventDateTo) rangeQuery.eventDate.lte = eventDateTo;
        filterClauses.push({ range: rangeQuery });
      }
    }
    // Person Birth Date Range Filter
    if (birthDateFrom || birthDateTo) {
      if (types.length === 0 || types.includes("person")) {
        const rangeQuery: any = { birthDate: {} }; // Assuming 'birthDate' is the ES field for Persons
        if (birthDateFrom) rangeQuery.birthDate.gte = birthDateFrom;
        if (birthDateTo) rangeQuery.birthDate.lte = birthDateTo;
        filterClauses.push({ range: rangeQuery });
      }
    }
    // Person Death Date Range Filter
    if (deathDateFrom || deathDateTo) {
      if (types.length === 0 || types.includes("person")) {
        const rangeQuery: any = { deathDate: {} }; // Assuming 'deathDate' is the ES field for Persons
        if (deathDateFrom) rangeQuery.deathDate.gte = deathDateFrom;
        if (deathDateTo) rangeQuery.deathDate.lte = deathDateTo;
        filterClauses.push({ range: rangeQuery });
      }
    }
    // Location Filter
    if (location) {
      // Apply to relevant location fields across specified types or all default types
      const locationFields: string[] = [];
      const effectiveTypes = types.length > 0 ? types : ["person", "event"]; // Default types for location search

      if (effectiveTypes.includes("person")) {
        locationFields.push("birthPlaceName", "deathPlaceName");
      }
      if (effectiveTypes.includes("event")) {
        locationFields.push("placeName");
      }
      if (locationFields.length > 0) {
        filterClauses.push({
          multi_match: {
            query: location,
            fields: [...new Set(locationFields)], // Ensure unique fields
            type: "best_fields", // Or "phrase" for more exact matching
          },
        });
      }
    }
    // Tags Filter (for Events)
    if (tags && tags.length > 0) {
      if (types.length === 0 || types.includes("event")) {
        // Assuming 'tags' is indexed as a keyword or an array of keywords in ES for events
        filterClauses.push({ terms: { "tags.keyword": tags } }); // Use .keyword for exact match on array items
      }
    }
    // Category Filter (for Events)
    if (category) {
      if (types.length === 0 || types.includes("event")) {
        // Assuming 'category' is indexed as a keyword in ES for events
        filterClauses.push({ term: { "category.keyword": category } }); // Use .keyword for exact match
      }
    }

    // --- Construct Main Query ---
    const multiMatchClause = {
      multi_match: {
        query: query,
        fields: multiMatchFields,
        fuzziness: "AUTO",
        operator: "and",
      },
    };

    const esQuery: any = {
      bool: {
        must: [multiMatchClause],
      },
    };

    if (filterClauses.length > 0) {
      esQuery.bool.filter = filterClauses;
    }

    // Construct sort order
    const sortClause: any[] = [];
    if (sortBy === "relevance") {
      sortClause.push({ _score: { order: sortOrder } }); // Default sort by relevance
    } else if (sortBy === "date") {
      // Assuming 'createdAt' is a common, sortable date field.
      // This might need to be more sophisticated if date fields vary by index.
      sortClause.push({
        createdAt: { order: sortOrder, unmapped_type: "date" },
      });
    } else if (sortBy === "name") {
      // Assuming common keyword fields for name/title. This is tricky across multiple indices.
      // For simplicity, we might need to pick one or have a default sort field.
      // This example assumes a field like 'name.keyword' or 'title.keyword' might exist.
      // A more robust way is to use a multi-field in the sort or allow type-specific sort fields.
      // For now, let's use a placeholder or make it conditional.
      // This is a simplification; a real app might need specific sort fields per type or a common denormalized sort_title field.
      if (targetIndices.includes("persons")) {
        sortClause.push({
          "fullName.keyword": {
            order: sortOrder,
            unmapped_type: "keyword",
            missing: "_last",
          },
        });
      }
      if (targetIndices.includes("events")) {
        sortClause.push({
          "title.keyword": {
            order: sortOrder,
            unmapped_type: "keyword",
            missing: "_last",
          },
        });
      }
      // If only comments, or no specific name field, it might fall back to _score or default ES sort.
      // Adding a fallback to _doc to ensure consistent sort when scores are equal or field is missing.
      if (sortClause.length === 0) {
        // if no specific sort field was added for name
        sortClause.push({ _score: { order: sortOrder } }); // Fallback to score if name sort is ambiguous
      }
    }
    sortClause.push({ _doc: { order: sortOrder } }); // Tie-breaker for consistent pagination

    try {
      const searchBody: any = {
        query: esQuery,
        sort: sortClause,
      };

      // Only add highlight if we have highlight fields configured
      if (Object.keys(highlightFieldsConfig).length > 0) {
        searchBody.highlight = {
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"],
          encoder: "html",
          fields: highlightFieldsConfig,
        };
      }

      const response = await this.client.search({
        index: targetIndices.join(","),
        from: from,
        size: limit,
        body: searchBody,
      });

      const totalHits = response.hits.total;
      const total =
        typeof totalHits === "number" ? totalHits : totalHits?.value || 0;

      const mappedResults: SearchResultHit[] = response.hits.hits.map(
        (hit: any) => ({
          _id: hit._id,
          _score: hit._score,
          _index: hit._index,
          _source: hit._source,
          highlight: hit.highlight, // Add highlight object to the result
        })
      );

      return {
        data: mappedResults,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Error performing Elasticsearch search:", error);
      // Check for specific ES errors, like index_not_found_exception
      if (
        (error as any).meta?.body?.error?.type === "index_not_found_exception"
      ) {
        logger.warn(
          `Search failed because one or more indices were not found: ${targetIndices.join(
            ","
          )}. Returning empty results.`
        );
        return {
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        };
      }
      throw error; // Rethrow for generic error handling by the route
    }
  }
}

// Export an instance or the class itself depending on usage pattern
export const searchAndIndexingService = new SearchAndIndexingService();
