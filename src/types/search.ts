// src/types/search.ts

// Basic structures for _source documents, can be expanded or imported from more specific type files
// It's assumed these align with what Elasticsearch indexes and what the `_source` field contains.

export interface PersonData {
  _id: string; // Usually, _id from MongoDB is used as ES document ID
  personId?: string; // Or use _id directly if it's the same as ES _id
  firstName?: string;
  lastName?: string;
  fullName?: string; // Often denormalized for searching
  birthDate?: string; // ISO string or object with date parts
  deathDate?: string; // ISO string or object with date parts
  biography?: string; // Snippet or full
  birthPlaceName?: string;
  deathPlaceName?: string;
  profileImageUrl?: string; // If indexed
  // other person fields
}

export interface EventData {
  _id: string;
  eventId?: string;
  title?: string;
  plainTextContent?: string; // Snippet or full, HTML stripped
  content?: string; // Original HTML, might not be in _source if large
  eventDate?: string; // ISO string
  endDate?: string;
  placeName?: string;
  category?: string;
  tags?: string[];
  // other event fields
}

export interface CommentData {
  _id: string;
  commentId?: string;
  content?: string; // Snippet or full
  userId?: string;
  userName?: string; // Denormalized author name
  resourceId?: string; // ID of the Event/Story it belongs to
  resourceType?: 'Event' | 'Story' | string;
  createdAt?: string; // ISO string
  // other comment fields
}


export interface SearchResultItem {
  _id: string; // Elasticsearch document ID
  _score: number | null;
  _index: 'persons' | 'events' | 'comments' | string; // Index name, indicates type
  _source: PersonData | EventData | CommentData | Record<string, any>; // Actual document
  // Highlighting can be added here if implemented in ES query
  // highlight?: { [key: string]: string[] };
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchResultsApiResponse {
  data: SearchResultItem[];
  pagination: PaginationData;
}

// For the useSearchResults hook parameters
export type SearchableTypeParam = 'person' | 'event' | 'comment';

export interface SearchParams {
  query: string;
  types?: SearchableTypeParam[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'name' | string;
  sortOrder?: 'asc' | 'desc' | string;
  eventDateFrom?: string;
  eventDateTo?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  deathDateFrom?: string;
  deathDateTo?: string;
  location?: string;
  tags?: string[]; // Array of strings from comma-separated query param
  category?: string;
}
