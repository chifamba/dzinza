// src/types/moderation.ts

// Re-using PaginationData or defining a generic one if not already global
// For this example, assuming PaginationData might be defined elsewhere (e.g., in admin.ts or a shared types file)
// If not, it should be:
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type FlaggedResourceType = 'Event' | 'Comment';
export type FlagReason = 'spam' | 'offensive' | 'hate_speech' | 'misinformation' | 'illegal' | 'other';
export type FlagStatus = 'pending_review' | 'resolved_no_action' | 'resolved_content_hidden' | 'resolved_content_deleted';

export interface FlaggedContentData {
  _id: string;
  resourceId: string; // ObjectId as string
  resourceType: FlaggedResourceType;
  // Optional: include snippet of content for quick view, populated by backend if possible
  // resourcePreview?: string;
  // resourceLink?: string; // Direct link to view the actual content in its context
  reportedByUserId: string;
  // Optional: reportedByUserName?: string;
  reason: FlagReason;
  customReason?: string;
  status: FlagStatus;
  moderatorUserId?: string;
  // Optional: moderatorUserName?: string;
  moderatorNotes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface FlaggedContentApiResponse {
  data: FlaggedContentData[];
  pagination: PaginationData;
}

// For the useFlaggedContent hook parameters
export interface FlaggedContentListParams {
  page?: number;
  limit?: number;
  status?: FlagStatus | 'All' | string; // 'All' to fetch all, string for specific status
  // Future: sortBy, sortOrder, resourceType filter
}

// For resolving a flag
export type ResolutionAction = 'dismiss' | 'hide_content' | 'delete_content';
export interface FlagResolutionPayload {
  resolutionAction: ResolutionAction;
  moderatorNotes?: string;
}
