// src/types/admin.ts

// User data as returned by GET /api/admin/users
export interface AdminUserData {
  _id: string;
  id?: string; // Often _id is mapped to id in frontend representations or from toJSON
  firstName?: string;
  lastName?: string;
  email: string;
  roles: string[]; // e.g., ['user', 'admin']
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Add any other fields the admin list might need from the User model
  // For example, lastLogin, profileImageUrl, etc.
  profileImageUrl?: string;
}

// Re-using PaginationData from search or defining a generic one
// If not already defined globally, define it here or import
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUsersApiResponse {
  data: AdminUserData[];
  pagination: PaginationData;
}

// For the useAdminUsers hook parameters
export interface AdminUserListParams {
  page?: number;
  limit?: number;
  email?: string; // filter
  role?: string;  // filter
  sortBy?: string; // e.g., 'createdAt', 'email', 'lastName'
  sortOrder?: 'asc' | 'desc';
}

// --- System Health Types ---

// Details for a specific dependency of a service
export interface DependencyHealth {
  status: 'UP' | 'DOWN' | 'UNKNOWN' | string; // Allow other strings for flexibility from backend
  reason?: string;
}

// Details for an individual service's health check
export interface ServiceHealthDetail {
  serviceName?: string; // Sometimes the nested details repeat service name
  timestamp?: string;   // Sometimes nested details have their own timestamp
  dependencies?: Record<string, DependencyHealth | string>; // e.g. { database: "UP" } or { database: { status: "UP" }}
  [key: string]: any; // Allow other arbitrary details from backend
}

// Structure for each service in the aggregated health check
export interface ServiceHealth {
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN' | string; // Allow other strings
  details?: ServiceHealthDetail | Record<string, any>; // Can be the direct health response of the service or a structured error
}

// Overall structure for the /api/admin/system-health response
export interface SystemHealthData {
  overallStatus: 'UP' | 'DEGRADED' | 'DOWN' | string; // Allow other strings
  timestamp: string; // ISO date string for when the aggregated check was performed
  services: ServiceHealth[];
}
