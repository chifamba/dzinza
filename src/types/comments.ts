// src/types/comments.ts

import mongoose from "mongoose"; // Only for type if directly using ObjectId from backend models, otherwise string

export type CommentResourceType = 'Event' | 'Story';

export interface CommentData {
  _id: string; // Or mongoose.Types.ObjectId if frontend handles it
  resourceId: string; // Or mongoose.Types.ObjectId
  resourceType: CommentResourceType;
  userId: string; // User ID from auth service
  userName: string; // Denormalized from req.user at creation
  userProfileImageUrl?: string; // Denormalized from req.user at creation
  content: string;
  parentId?: string | null; // Or mongoose.Types.ObjectId | null
  edited: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Optional: for frontend state management if replies are nested
  replies?: CommentData[];
  // Optional: for frontend state if user data is fetched separately for display
  // userData?: { name: string; avatarUrl?: string; }
}

export interface CommentsApiResponse {
  data: CommentData[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
