import { useState, useCallback, useEffect } from 'react';
import { logger } from '@shared/utils/logger'; // Assuming logger is available

// Define interfaces based on the provided backend structure
export interface EventFromAPI {
  _id: string;
  title: string;
  contentSnippet: string;
  date?: string; // ISO string
  endDate?: string; // ISO string
  place?: { name?: string }; // Adjusted to match typical Event model, access as event.place?.name
  category?: string;
  tags: string[];
  privacy: 'public' | 'private' | 'family';
  relatedPersons: Array<{ id: string; name: string }>;
  createdAt: string; // Assuming createdAt is available for sorting
  // familyTreeId?: string;
  // userId?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SortState {
  sortBy: 'date' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface FilterState {
  category?: string;
  tags?: string; // Comma-separated string
  familyTreeId?: string; // Optional, for future use or direct passing
}

interface UseEventsProps {
  initialSort?: SortState;
  initialPagination?: Pick<PaginationState, 'page' | 'limit'>;
  initialFilters?: FilterState;
}

const API_BASE_URL = '/api/events'; // Adjust if necessary

export const useEvents = ({
  initialSort = { sortBy: 'date', sortOrder: 'desc' },
  initialPagination = { page: 1, limit: 10 },
  initialFilters = {},
}: UseEventsProps = {}) => {
  const [events, setEvents] = useState<EventFromAPI[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    ...initialPagination,
    totalItems: 0,
    totalPages: 0,
  });
  const [sort, setSort] = useState<SortState>(initialSort);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      queryParams.append('sortBy', sort.sortBy);
      queryParams.append('sortOrder', sort.sortOrder);

      if (filters.category) {
        queryParams.append('category', filters.category);
      }
      if (filters.tags) {
        queryParams.append('tags', filters.tags); // Backend expects comma-separated
      }
      if (filters.familyTreeId) {
        queryParams.append('familyTreeId', filters.familyTreeId);
      }

      const response = await fetch(`${API_BASE_URL}?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch events' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setEvents(data.data || []);
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination.total || 0,
        totalPages: data.pagination.totalPages || 0,
        page: data.pagination.page || initialPagination.page, // Ensure page is updated from response
        limit: data.pagination.limit || initialPagination.limit, // Ensure limit is updated from response
      }));

    } catch (err) {
      logger.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setEvents([]); // Clear events on error
      setPagination({ // Reset pagination on error
        ...initialPagination,
        totalItems: 0,
        totalPages: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters, initialPagination.page, initialPagination.limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // fetchEvents is memoized and includes all dependencies

  const updateSort = (newSort: Partial<SortState>) => {
    setSort(prevSort => ({ ...prevSort, ...newSort }));
    // Reset to page 1 when sort changes, common UX pattern
    setPagination(prevPag => ({ ...prevPag, page: 1, totalItems: 0, totalPages: 0 }));
  };

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
    // Reset to page 1 when filters change
    setPagination(prevPag => ({ ...prevPag, page: 1, totalItems: 0, totalPages: 0 }));
  };

  const changePage = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      setPagination(prevPag => ({ ...prevPag, page: newPage }));
    } else if (pagination.totalPages === 0 && newPage === 1) { // Allow setting page 1 if totalPages is 0 (e.g. initial load or error)
       setPagination(prevPag => ({ ...prevPag, page: newPage }));
    }
  };

  const setPageLimit = (newLimit: number) => {
    setPagination(prevPag => ({
      ...prevPag,
      limit: newLimit,
      page: 1, // Reset to page 1 when limit changes
      totalItems: 0, // Reset these as they will be recalculated
      totalPages: 0,
    }));
  };


  return {
    events,
    pagination,
    sort,
    filters,
    isLoading,
    error,
    updateSort,
    updateFilters,
    changePage,
    setPageLimit, // Expose if needed for a page size selector
    retryFetch: fetchEvents, // Expose retry mechanism
  };
};
