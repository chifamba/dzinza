import { useState, useEffect, useCallback } from 'react';
import {
    AdminUserData,
    PaginationData,
    AdminUserListParams,
    AdminUsersApiResponse
} from '../types/admin'; // Adjust path if necessary
import { logger } from '@shared/utils/logger';

interface UseAdminUsersReturn {
  users: AdminUserData[];
  pagination: PaginationData | null;
  isLoading: boolean;
  error: string | null;
  fetchUsers: (params?: AdminUserListParams) => void; // Allow manual refetch/update with new params
  refreshUsers: () => void; // Simple refetch with current params
}

const API_BASE_URL = '/api/admin/users'; // Adjust if your API is hosted elsewhere

export const useAdminUsers = (initialParams?: AdminUserListParams): UseAdminUsersReturn => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store current parameters to allow refetching with the same set of filters/sort/page
  const [currentParams, setCurrentParams] = useState<AdminUserListParams>(
    initialParams || { page: 1, limit: 20 } // Default initial params
  );

  const buildQueryString = (params: AdminUserListParams): string => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.email) queryParts.push(`email=${encodeURIComponent(params.email)}`);
    if (params.role) queryParts.push(`role=${encodeURIComponent(params.role)}`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);
    return queryParts.join('&');
  };

  const internalFetchUsers = useCallback(async (paramsToFetch: AdminUserListParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentParams(paramsToFetch); // Update currentParams whenever a fetch is made

    try {
      const queryString = buildQueryString(paramsToFetch);
      const response = await fetch(`${API_BASE_URL}?${queryString}`); // Auth token handled by global fetch wrapper

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch users.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: AdminUsersApiResponse = await response.json();
      setUsers(data.data || []);
      setPagination(data.pagination || null);

    } catch (err) {
      logger.error('Error fetching admin users:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setUsers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array as it uses params passed to it

  useEffect(() => {
    // Initial fetch when component mounts with initialParams or default params
    internalFetchUsers(currentParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalFetchUsers]); // currentParams is managed by internalFetchUsers and fetchUsers calls
                           // Adding it here might cause loops if not handled carefully. The comment indicates intentional omission.

  const fetchUsers = (params?: AdminUserListParams) => {
    const newParams = { ...(initialParams || { page: 1, limit: 20 }), ...currentParams, ...(params || {}) };
    internalFetchUsers(newParams);
  };

  const refreshUsers = () => {
    // Refetch with the last used parameters
    internalFetchUsers(currentParams);
  };

  return {
    users,
    pagination,
    isLoading,
    error,
    fetchUsers, // Use this to change params and fetch
    refreshUsers, // Use this to refetch with existing params
  };
};
