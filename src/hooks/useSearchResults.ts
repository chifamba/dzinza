import { useState, useEffect, useCallback } from 'react';
import {
    SearchResultItem,
    PaginationData,
    SearchParams,
    SearchResultsApiResponse
} from '../types/search'; // Adjust path if necessary
import { logger } from '@shared/utils/logger';

interface UseSearchResultsReturn {
  results: SearchResultItem[];
  pagination: PaginationData | null;
  isLoading: boolean;
  error: string | null;
  fetchSearchResults: (params: SearchParams) => void; // Allow manual refetch/update
}

const API_BASE_URL = '/api/search'; // Adjust if your API is hosted elsewhere or has a different base

export const useSearchResults = (initialParams?: SearchParams): UseSearchResultsReturn => {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<SearchParams | null>(initialParams || null);

  const buildQueryString = (params: SearchParams): string => {
    const queryParts: string[] = [];
    queryParts.push(`q=${encodeURIComponent(params.query)}`);

    if (params.types && params.types.length > 0) {
      queryParts.push(`type=${encodeURIComponent(params.types.join(','))}`);
    }
    if (params.page) {
      queryParts.push(`page=${params.page}`);
    }
    if (params.limit) {
      queryParts.push(`limit=${params.limit}`);
    }
    if (params.sortBy) {
      queryParts.push(`sortBy=${params.sortBy}`);
    }
    if (params.sortOrder) {
      queryParts.push(`sortOrder=${params.sortOrder}`);
    }
    // Add advanced filter params
    if (params.eventDateFrom) queryParts.push(`eventDateFrom=${params.eventDateFrom}`);
    if (params.eventDateTo) queryParts.push(`eventDateTo=${params.eventDateTo}`);
    if (params.birthDateFrom) queryParts.push(`birthDateFrom=${params.birthDateFrom}`);
    if (params.birthDateTo) queryParts.push(`birthDateTo=${params.birthDateTo}`);
    if (params.deathDateFrom) queryParts.push(`deathDateFrom=${params.deathDateFrom}`);
    if (params.deathDateTo) queryParts.push(`deathDateTo=${params.deathDateTo}`);
    if (params.location) queryParts.push(`location=${encodeURIComponent(params.location)}`);
    if (params.tags && params.tags.length > 0) queryParts.push(`tags=${encodeURIComponent(params.tags.join(','))}`);
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);

    return queryParts.join('&');
  };

  const internalFetch = useCallback(async (params: SearchParams | null) => {
    if (!params || !params.query) {
      setResults([]);
      setPagination(null);
      setIsLoading(false);
      setError(null); // Or set an error like "Search query is required"
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(params);
      const response = await fetch(`${API_BASE_URL}?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Search request failed.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: SearchResultsApiResponse = await response.json();
      setResults(data.data || []);
      setPagination(data.pagination || null);

    } catch (err) {
      logger.error('Error fetching search results:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching search results.';
      setError(errorMessage);
      setResults([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    // Only fetch if currentParams is set (e.g., by initialParams or by calling fetchSearchResults)
    if (currentParams) {
        internalFetch(currentParams);
    } else {
        // Handle case where hook is initialized without params and no search has been triggered yet
        setResults([]);
        setPagination(null);
        setIsLoading(false);
        setError(null);
    }
  }, [currentParams, internalFetch]);

  // Expose a function to allow parent component to trigger/update search
  const fetchSearchResults = (params: SearchParams) => {
    setCurrentParams(params);
  };

  return {
    results,
    pagination,
    isLoading,
    error,
    fetchSearchResults,
  };
};
