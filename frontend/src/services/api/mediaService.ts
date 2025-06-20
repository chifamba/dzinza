import { apiClient } from './client';
import { AxiosResponse } from 'axios';
import { PaginationInfo } from './genealogyService'; // Assuming PaginationInfo is exported here

// Define a basic structure for ApiFile. This should align with your backend's File model.
// Consider re-using or extending a type from another service if it's identical (e.g., from auth.ts if User has similar file refs)
export interface ApiFile {
  _id: string; // Or 'id' depending on backend
  userId: string;
  familyTreeId?: string;
  originalName: string;
  filename: string; // Usually the name on storage (e.g., S3 key)
  s3Key?: string; // If S3 specific
  url: string;
  size: number;
  mimeType: string;
  category: 'photo' | 'document' | 'audio' | 'video' | 'other';
  privacy: 'public' | 'private' | 'family'; // Assuming these levels
  metadata?: {
    description?: string;
    // Add other metadata fields your backend might store, e.g., dimensions for images
    [key: string]: any;
  };
  thumbnails?: Array<{
    size: string; // e.g., 'small', 'medium', 'large'
    width?: number;
    height?: number;
    key?: string;
    url: string;
  }>;
  tags?: string[];
  relatedPersons?: string[]; // Array of Person IDs
  relatedEvents?: string[];  // Array of Event IDs
  uploadedAt: string; // ISO Date string
  updatedAt: string;  // ISO Date string
}

export interface UpdateMediaMetadataPayload {
  description?: string;
  tags?: string[];
  relatedPersons?: string[];
  relatedEvents?: string[];
  familyTreeId?: string; // To change association or if it's part of metadata
  privacy?: ApiFile['privacy'];
  category?: ApiFile['category'];
}


class MediaService {
  private baseURL = '/api/files'; // Assuming '/api/files' is the base for storage-service via gateway

  async uploadMedia(formData: FormData): Promise<ApiFile> {
    // apiClient.uploadFile might be an option if it's already configured for FormData
    // and sets Content-Type to multipart/form-data.
    // Using apiClient.post for explicit control here.
    // The backend endpoint /api/files/upload should handle multipart/form-data
    const response: AxiosResponse<{data: ApiFile}> = await apiClient.post( // Assuming response is { data: ApiFile } like other services
      `${this.baseURL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data; // Adjust if backend returns ApiFile directly
  }

  async updateMediaMetadata(mediaId: string, metadata: UpdateMediaMetadataPayload): Promise<ApiFile> {
    // The backend endpoint for updating metadata might be PATCH or PUT.
    // Assuming PATCH /api/files/:id or a specific sub-route like /api/files/:id/metadata
    // The subtask specified PATCH /api/files/:id/metadata
    const response: AxiosResponse<{data: ApiFile}> = await apiClient.patch(
      `${this.baseURL}/${mediaId}/metadata`, // Using PATCH as specified
      metadata
    );
    return response.data.data; // Adjust if backend returns ApiFile directly
  }

  async getMediaDetails(mediaId: string): Promise<ApiFile> {
    const response: AxiosResponse<{data: ApiFile}> = await apiClient.get(`${this.baseURL}/${mediaId}`);
    return response.data.data; // Adjust if backend returns ApiFile directly
  }

  // Optional: Method to get a list of media items (gallery view)
  async listMedia(params?: {
    familyTreeId?: string;
    category?: string;
    page?: number;
    limit?: number;
    // Add other filter params as needed
  }): Promise<{ data: ApiFile[], meta: PaginationInfo }> { // Define a proper meta type
    const response: AxiosResponse<{ data: ApiFile[], meta: PaginationInfo }> = await apiClient.get(
      this.baseURL,
      { params }
    );
    return response.data;
  }

  // Optional: Method to delete media
  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${mediaId}`);
  }
}

export const mediaService = new MediaService();
