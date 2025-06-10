import React, { useState, FormEvent } from 'react';
import { useEvents, FilterState } from '../../hooks/useEvents';
import EventsListView from '../../components/events/EventsListView';
// Assuming common UI components are available
// import Input from '../../components/ui/Input';
// import Button from '../../components/ui/Button';
// import Select from '../../components/ui/Select'; // Assuming a Select component

// Dummy UI components if not available
const Input = ({ ...props }) => <input className="border border-gray-300 rounded px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500" {...props} />;
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string}) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="border border-gray-300 rounded px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500" {...props}>{children}</select>;


const EventsDisplayPage: React.FC = () => {
  const {
    events,
    pagination,
    sort,
    // filters, // filters from hook are the current applied ones
    isLoading,
    error,
    updateSort,
    updateFilters,
    changePage,
  } = useEvents({
    initialSort: { sortBy: 'date', sortOrder: 'desc' },
    initialPagination: { page: 1, limit: 10 },
  });

  // Local state for filter inputs before applying
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('');
  const [localTagsFilter, setLocalTagsFilter] = useState<string>('');

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newFilters: FilterState = {};
    if (localCategoryFilter.trim()) newFilters.category = localCategoryFilter.trim();
    if (localTagsFilter.trim()) newFilters.tags = localTagsFilter.trim();
    // To clear a filter, user would clear input and submit.
    // The hook handles empty strings vs undefined.
    updateFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLocalCategoryFilter('');
    setLocalTagsFilter('');
    updateFilters({ category: undefined, tags: undefined });
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Stories and Events</h1>
      </header>

      {/* Filter Controls */}
      <form onSubmit={handleFilterSubmit} className="mb-8 p-6 bg-white shadow rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Input
              type="text"
              id="category-filter"
              value={localCategoryFilter}
              onChange={(e) => setLocalCategoryFilter(e.target.value)}
              placeholder="e.g., Birth, Marriage"
            />
          </div>
          <div>
            <label htmlFor="tags-filter" className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <Input
              type="text"
              id="tags-filter"
              value={localTagsFilter}
              onChange={(e) => setLocalTagsFilter(e.target.value)}
              placeholder="e.g., holiday, reunion"
            />
          </div>
          <div className="flex items-end space-x-3 md:col-span-2 lg:col-span-1">
            <Button type="submit" className="w-full md:w-auto">Apply Filters</Button>
            <Button type="button" onClick={handleClearFilters} className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500">Clear Filters</Button>
          </div>
        </div>
      </form>

      {/* Sort Controls */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white shadow rounded-lg">
        <div className="flex items-center gap-3">
          <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort by:</label>
          <Select
            id="sort-by"
            value={sort.sortBy}
            onChange={(e) => updateSort({ sortBy: e.target.value as 'date' | 'createdAt' | 'title' })}
          >
            <option value="date">Date</option>
            <option value="createdAt">Created At</option>
            <option value="title">Title</option>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sort-order" className="text-sm font-medium text-gray-700">Order:</label>
          <Select
            id="sort-order"
            value={sort.sortOrder}
            onChange={(e) => updateSort({ sortOrder: e.target.value as 'asc' | 'desc' })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
        </div>
      </div>

      {/* Events List View */}
      <EventsListView events={events} isLoading={isLoading} error={error} />

      {/* Pagination Controls */}
      {!isLoading && !error && events.length > 0 && pagination.totalPages > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-700 p-4 bg-white shadow rounded-lg">
          <div className="mb-2 sm:mb-0">
            Page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span>
            <span className="hidden sm:inline"> | Total events: <span className="font-semibold">{pagination.totalItems}</span></span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="w-full sm:w-auto"
            >
              Previous
            </Button>
            <Button
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
        </div>
      )}
       {!isLoading && !error && events.length === 0 && pagination.totalPages === 0 && (
         <div className="mt-8 text-center text-gray-500">
            {/* Message already shown by EventsListView, but this can be a good spot for global actions if any */}
         </div>
       )}
    </div>
  );
};

export default EventsDisplayPage;
