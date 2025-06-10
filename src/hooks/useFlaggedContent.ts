import { useState, useEffect, useCallback } from 'react';
import {
    FlaggedContentData,
    PaginationData,
    FlaggedContentListParams,
    FlaggedContentApiResponse
} from '../types/moderation'; // Adjust path if necessary
import { logger } from '@shared/utils/logger';

interface UseFlaggedContentReturn {
  flags: FlaggedContentData[];
  pagination: PaginationData | null;
  isLoading: boolean;
  error: string | null;
  fetchFlags: (params?: FlaggedContentListParams) => void;
  refreshFlags: () => void;
}

const API_BASE_URL = '/api/admin/flags'; // Adjust if your API is hosted elsewhere

export const useFlaggedContent = (initialParams?: FlaggedContentListParams): UseFlaggedContentReturn => {
  const [flags, setFlags] = useState<FlaggedContentData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentParams, setCurrentParams] = useState<FlaggedContentListParams>(
    initialParams || { page: 1, limit: 15, status: 'pending_review' } // Default initial params
  );

  const buildQueryString = (params: FlaggedContentListParams): string => {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.status && params.status !== 'All') { // 'All' means no status filter
        queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    // Future: Add sortBy, sortOrder
    return queryParts.join('&');
  };

  const internalFetchFlags = useCallback(async (paramsToFetch: FlaggedContentListParams) => {
    setIsLoading(true);
    setError(null);
    // setCurrentParams(paramsToFetch); // Update currentParams when a fetch is initiated by explicit call

    try {
      const queryString = buildQueryString(paramsToFetch);
      const response = await fetch(`${API_BASE_URL}?${queryString}`); // Auth token handled by global fetch wrapper

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch flagged content.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: FlaggedContentApiResponse = await response.json();
      setFlags(data.data || []);
      setPagination(data.pagination || null);

    } catch (err) {
      logger.error('Error fetching flagged content:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setFlags([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch when currentParams changes (e.g., due to URL update in page component)
    internalFetchFlags(currentParams);
  }, [currentParams, internalFetchFlags]);

  // This function is called by the page component to update parameters (usually from URL)
  const fetchFlags = (params?: FlaggedContentListParams) => {
    const newParams = { ...(initialParams || { page: 1, limit: 15, status: 'pending_review' }), ...currentParams, ...(params || {}) };
    setCurrentParams(newParams); // This will trigger the useEffect above
  };

  const refreshFlags = () => {
    // Refetch with the last used parameters (currentParams)
    // The useEffect dependency on currentParams will handle this if currentParams is just re-set to itself,
    // but for clarity and to ensure a fetch if nothing else changed, call internalFetchFlags directly.
    internalFetchFlags(currentParams);
  };

  return {
    flags,
    pagination,
    isLoading,
    error,
    fetchFlags,   // Call this to update params and fetch
    refreshFlags, // Call this to refetch with current params
  };
};
