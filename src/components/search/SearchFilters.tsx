import React, { useState, useEffect, FormEvent } from 'react';
import { SearchParams, SearchableTypeParam } from '../../types/search'; // Adjust path

// Dummy UI components
const Input = ({ ...props }) => <input className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600" {...props} />;
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string}) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-400' :
                   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500')}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);


// FilterState for the form. Tags is a string here for input, converted to array on submit.
export interface FilterFormState {
  location?: string;
  category?: string;
  tags?: string; // Comma-separated string for input
  eventDateFrom?: string;
  eventDateTo?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  deathDateFrom?: string;
  deathDateTo?: string;
}

interface SearchFiltersProps {
  initialFilters: Partial<FilterFormState>; // Initial values from URL params
  activeSearchTypes: SearchableTypeParam[]; // To conditionally show filters
  onSubmit: (newFilters: Partial<FilterFormState>) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ initialFilters, activeSearchTypes, onSubmit }) => {
  const [filters, setFilters] = useState<Partial<FilterFormState>>(initialFilters);

  useEffect(() => {
    // Update local state if initialFilters from URL change
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: Partial<FilterFormState> = {
        location: '', category: '', tags: '',
        eventDateFrom: '', eventDateTo: '',
        birthDateFrom: '', birthDateTo: '',
        deathDateFrom: '', deathDateTo: ''
    };
    setFilters(clearedFilters);
    onSubmit(clearedFilters); // Submit empty strings to clear URL params
  };

  const showEventFilters = activeSearchTypes.length === 0 || activeSearchTypes.includes('event');
  const showPersonFilters = activeSearchTypes.length === 0 || activeSearchTypes.includes('person');

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow space-y-4 md:space-y-6">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Filters</h3>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
        <Input type="text" name="location" id="location" value={filters.location || ''} onChange={handleChange} placeholder="e.g., City, Country" />
      </div>

      {showEventFilters && (
        <>
          <h4 className="text-md font-medium text-gray-600 dark:text-gray-400 pt-2">Event Filters</h4>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <Input type="text" name="category" id="category" value={filters.category || ''} onChange={handleChange} placeholder="e.g., Birth, Marriage" />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
            <Input type="text" name="tags" id="tags" value={filters.tags || ''} onChange={handleChange} placeholder="e.g., holiday, reunion" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="eventDateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Date From</label>
              <Input type="date" name="eventDateFrom" id="eventDateFrom" value={filters.eventDateFrom || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="eventDateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Date To</label>
              <Input type="date" name="eventDateTo" id="eventDateTo" value={filters.eventDateTo || ''} onChange={handleChange} />
            </div>
          </div>
        </>
      )}

      {showPersonFilters && (
        <>
          <h4 className="text-md font-medium text-gray-600 dark:text-gray-400 pt-2">Person Filters</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="birthDateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Birth Date From</label>
              <Input type="date" name="birthDateFrom" id="birthDateFrom" value={filters.birthDateFrom || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="birthDateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Birth Date To</label>
              <Input type="date" name="birthDateTo" id="birthDateTo" value={filters.birthDateTo || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="deathDateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Death Date From</label>
              <Input type="date" name="deathDateFrom" id="deathDateFrom" value={filters.deathDateFrom || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="deathDateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Death Date To</label>
              <Input type="date" name="deathDateTo" id="deathDateTo" value={filters.deathDateTo || ''} onChange={handleChange} />
            </div>
          </div>
        </>
      )}

      <div className="flex space-x-3 pt-2">
        <Button type="submit" className="flex-1">Apply Filters</Button>
        <Button type="button" variant="secondary" onClick={handleClearFilters} className="flex-1">Clear Filters</Button>
      </div>
    </form>
  );
};

export default SearchFilters;
