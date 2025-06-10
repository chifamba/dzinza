import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react'; // Using lucide-react for search icon

interface GlobalSearchBarProps {
  placeholder?: string;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  placeholder = "Search events, people, comments...",
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm) {
      navigate(`/search?q=${encodeURIComponent(trimmedSearchTerm)}`);
      // Optionally clear search term after navigation:
      // setSearchTerm('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search">
      <div className="relative flex items-center text-gray-400 focus-within:text-gray-600">
        <input
          type="search"
          name="q" // Name attribute is good practice for forms
          id="global-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="block w-full py-2 px-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-400"
          aria-label="Global search"
        />
        <button
          type="submit"
          className="absolute right-0 top-0 bottom-0 px-3 text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 rounded-r-lg"
          aria-label="Submit search"
        >
          <SearchIcon size={18} />
        </button>
      </div>
    </form>
  );
};

export default GlobalSearchBar;
