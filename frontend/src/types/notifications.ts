// src/types/notifications.ts

export type NotificationType =
  | 'new_collaborator'
  | 'event_update'
  | 'new_comment'
  | 'invitation_accepted'
  | 'role_changed'
  | 'event_created_in_shared_tree'
  | string; // Allow for other types not explicitly listed

export interface NotificationData {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string; // URL path for navigation
  isRead: boolean;
  resourceId?: string;
  resourceType?: string;
  actorId?: string;
  actorName?: string; // Denormalized name of the actor
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface NotificationsApiResponse {
  data: NotificationData[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// For fetching unread count specifically
export interface UnreadNotificationsCountResponse {
    // The actual unread count will come from pagination.totalItems
    // when querying with isRead=false&limit=1 (or any limit)
    data: NotificationData[]; // The API might return a sample or no data if only count is needed
    pagination: {
        totalItems: number; // This is the key field for unread count
        page: number;
        limit: number;
        totalPages: number;
    };
}
