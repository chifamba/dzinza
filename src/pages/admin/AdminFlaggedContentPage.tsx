import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFlaggedContent, FlaggedContentListParams } from '../../hooks/useFlaggedContent'; // Adjust path
import { FlaggedContentData, FlagStatus } from '../../types/moderation'; // Adjust path
import FlaggedContentItem from '../../components/admin/moderation/FlaggedContentItem'; // Adjust path
import { logger } from '@shared/utils/logger';

// Dummy UI Components
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {label?: string}) => (
    <div>
        {props.label && <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{props.label}</label>}
        <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props}>{children}</select>
    </div>
);
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                ${props.disabled ? 'text-gray-400 bg-gray-200 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const LoadingSpinner = () => <div className="text-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div><p className="mt-2">Loading flagged content...</p></div>;
// End Dummy UI Components

const flagStatusOptions: { value: FlaggedContentListParams['status'], label: string }[] = [
    { value: 'All', label: 'All Statuses' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'resolved_no_action', label: 'Resolved (No Action)' },
    { value: 'resolved_content_hidden', label: 'Resolved (Content Hidden)' },
    { value: 'resolved_content_deleted', label: 'Resolved (Content Deleted)' },
];


const AdminFlaggedContentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const listParams = useMemo<FlaggedContentListParams>(() => ({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '10', 10), // Smaller limit for moderation queue
    status: (searchParams.get('status') as FlagStatus | 'All') || 'pending_review',
  }), [searchParams]);

  const { flags, pagination, isLoading, error, fetchFlags, refreshFlags } = useFlaggedContent(listParams);

  useEffect(() => {
    // Hook's internal useEffect handles fetching based on initialParams (derived from listParams).
    // This effect ensures that if URL params change directly, we explicitly tell the hook to use them.
    fetchFlags(listParams);
  }, [listParams, fetchFlags]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as FlaggedContentListParams['status'];
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', '1'); // Reset to page 1 on filter change
    if (newStatus && newStatus !== 'All') {
      newParams.set('status', newStatus);
    } else {
      newParams.delete('status'); // Remove status if 'All' is selected
    }
    setSearchParams(newParams, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('page', newPage.toString());
      setSearchParams(newParams);
    }
  };

  const handleResolveSuccess = (updatedFlag: FlaggedContentData) => {
    logger.info(`Flag ${updatedFlag._id} resolved. Refreshing list or updating item.`);
    // Option 1: Simple refresh of the current page/filters
    refreshFlags();
    // Option 2: More complex - update the specific item in the list if desired,
    // but refresh is often simpler to ensure data consistency if resolution changes its status
    // and it might move out of the current filtered view.
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Content Moderation - Flagged Items</h1>

      {/* Filters */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-md sm:flex sm:space-x-4 items-center">
        <Select
          label="Filter by Status:"
          id="statusFilter"
          value={listParams.status || 'All'}
          onChange={handleStatusFilterChange}
          className="w-full sm:w-auto"
        >
          {flagStatusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        {/* Potentially add more filters here: resourceType, reportedBy, date range etc. */}
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <div className="p-3 bg-red-100 text-red-700 border-red-300 rounded-md">{error}</div>}

      {!isLoading && !error && flags.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
          No flagged items found matching your criteria.
        </p>
      )}

      {!isLoading && !error && flags.length > 0 && (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FlaggedContentItem
              key={flag._id}
              flag={flag}
              onResolveSuccess={handleResolveSuccess}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && !isLoading && (
        <div className="py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} variant="secondary">
            Previous
          </Button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {pagination.page} of {pagination.totalPages} (Total: {pagination.totalItems} flags)
          </span>
          <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} variant="secondary">
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminFlaggedContentPage;
