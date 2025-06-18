import React, { useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; // Link might not be needed, removed useNavigate
import { useSearchResults } from "../hooks/useSearchResults"; // Adjust path
import {
  SearchResultItem,
  SearchableTypeParam,
  SearchParams,
} from "../types/search"; // Adjust path

import PersonSearchResultItem from "../components/search/PersonSearchResultItem"; // Adjust path
import EventSearchResultItem from "../components/search/EventSearchResultItem"; // Adjust path
import CommentSearchResultItem from "../components/search/CommentSearchResultItem"; // Adjust path
import SearchFilters, {
  FilterFormState,
} from "../components/search/SearchFilters"; // Import SearchFilters

// Dummy Loading component
const LoadingSpinner = ({
  text = "Loading search results...",
}: {
  text?: string;
}) => (
  <div className="text-center p-10">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{text}</p>
  </div>
);

// Dummy Button component
const Button = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  props.disabled
                    ? "text-gray-400 bg-gray-200 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                    : props.variant === "outline"
                    ? "text-blue-600 border border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700"
                    : "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }
                ${props.className || ""}`}
    {...props}
  >
    {children}
  </button>
);

// Dummy Select component if not globally available from previous steps or UI library
const Select = ({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
    {...props}
  >
    {children}
  </select>
);

const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate(); // Not strictly needed if setSearchParams triggers re-render and hook refetch

  const parseTypes = (typeString: string | null): SearchableTypeParam[] => {
    return typeString
      ? (typeString
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) as SearchableTypeParam[])
      : [];
  };

  // Memoize all search parameters derived from URL for stability
  const currentSearchParams = useMemo<SearchParams>(() => {
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "10", 10); // Default limit 10
    const sortBy = searchParams.get("sortBy") || "relevance";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const tagsParam = searchParams.get("tags");

    return {
      query: q,
      page,
      types: parseTypes(type),
      limit,
      sortBy,
      sortOrder,
      eventDateFrom: searchParams.get("eventDateFrom") || undefined,
      eventDateTo: searchParams.get("eventDateTo") || undefined,
      birthDateFrom: searchParams.get("birthDateFrom") || undefined,
      birthDateTo: searchParams.get("birthDateTo") || undefined,
      deathDateFrom: searchParams.get("deathDateFrom") || undefined,
      deathDateTo: searchParams.get("deathDateTo") || undefined,
      location: searchParams.get("location") || undefined,
      tags: tagsParam
        ? tagsParam
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      category: searchParams.get("category") || undefined,
    };
  }, [searchParams]);

  const { results, pagination, isLoading, error, fetchSearchResults } =
    useSearchResults(currentSearchParams);

  useEffect(() => {
    // The hook useSearchResults is now responsible for deciding when to fetch based on currentParams.
    // We ensure currentParams is passed to it.
    // This effect might only be needed if there's an action to clear results when query is empty.
    if (currentSearchParams.query) {
      fetchSearchResults(currentSearchParams);
    } else {
      // Optionally clear results or show a "please enter query" message if the hook doesn't handle empty query
    }
  }, [currentSearchParams, fetchSearchResults]);

  const updateSearchParams = useCallback(
    (newParams: Partial<SearchParams>) => {
      const updated = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).length > 0) {
          if (Array.isArray(value)) {
            updated.set(key, value.join(","));
          } else {
            updated.set(key, String(value));
          }
        } else {
          updated.delete(key); // Remove empty or undefined params from URL
        }
      });

      // Always reset to page 1 when filters or sort change, unless it's purely a page change
      if (!("page" in newParams && Object.keys(newParams).length === 1)) {
        updated.set("page", "1");
      }
      setSearchParams(updated, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handlePageChange = (newPage: number) => {
    if (
      newPage > 0 &&
      newPage <= (pagination?.totalPages || 1) &&
      newPage !== currentSearchParams.page
    ) {
      updateSearchParams({ page: newPage });
    }
  };

  const handleFilterSubmit = (formFilters: Partial<FilterFormState>) => {
    const searchApiFilters: Partial<SearchParams> = {};
    // Convert form state to API state (e.g. tags string to array)
    Object.entries(formFilters).forEach(([key, value]) => {
      if (key === "tags" && typeof value === "string") {
        const tagsArray = value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        (searchApiFilters as Record<string, string | string[] | number | undefined>)[key] =
          tagsArray.length > 0 ? tagsArray : undefined;
      } else if (value === "" || value === null) {
        (searchApiFilters as Record<string, string | string[] | number | undefined>)[key] = undefined; // Ensure empty strings become undefined to be removed from URL
      } else {
        (searchApiFilters as Record<string, string | string[] | number | undefined>)[key] = value;
      }
    });
    updateSearchParams(searchApiFilters);
  };

  const handleSortChange = (newSortBy?: string, newSortOrder?: string) => {
    updateSearchParams({
      sortBy: newSortBy || currentSearchParams.sortBy,
      sortOrder: newSortOrder || currentSearchParams.sortOrder,
    });
  };

  // Initial filter state for the SearchFilters component, derived from URL
  const initialFilterValuesForForm: Partial<FilterFormState> = useMemo(
    () => ({
      location: currentSearchParams.location || "",
      category: currentSearchParams.category || "",
      tags: currentSearchParams.tags?.join(", ") || "",
      eventDateFrom: currentSearchParams.eventDateFrom || "",
      eventDateTo: currentSearchParams.eventDateTo || "",
      birthDateFrom: currentSearchParams.birthDateFrom || "",
      birthDateTo: currentSearchParams.birthDateTo || "",
      deathDateFrom: currentSearchParams.deathDateFrom || "",
      deathDateTo: currentSearchParams.deathDateTo || "",
    }),
    [currentSearchParams]
  );

  const activeTypesForFilterComponent = currentSearchParams.types || [];
  const { query } = currentSearchParams; // For display

  const groupedResults = useMemo(() => {
    if (!results) return {};
    return results.reduce((acc, item) => {
      const type = item._index; // 'persons', 'events', 'comments'
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {} as Record<string, SearchResultItem[]>);
  }, [results]);

  const renderResultItem = (item: SearchResultItem) => {
    switch (item._index) {
      case "persons": // Or whatever your person index name is
        return <PersonSearchResultItem key={item._id} item={item} />;
      case "events": // Or whatever your event index name is
        return <EventSearchResultItem key={item._id} item={item} />;
      case "comments": // Or whatever your comment index name is
        return <CommentSearchResultItem key={item._id} item={item} />;
      default:
        return (
          <div
            key={item._id}
            className="p-2 my-1 border rounded text-xs dark:text-gray-400"
          >
            Unknown result type: {item._index} - {item._id}
          </div>
        );
    }
  };

  const typeToTitleMapping: Record<string, string> = {
    persons: "People",
    events: "Events & Stories",
    comments: "Comments",
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      <header className="mb-6 pb-4 border-b dark:border-gray-700">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Search Results
          {query && (
            <span className="text-gray-600 dark:text-gray-400 text-xl sm:text-2xl">
              {" "}
              for "{query}"
            </span>
          )}
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        <aside className="md:w-1/3 lg:w-1/4 xl:w-1/5 space-y-6">
          {" "}
          {/* Sidebar for filters and sort */}
          <SearchFilters
            initialFilters={initialFilterValuesForForm}
            activeSearchTypes={activeTypesForFilterComponent}
            onSubmit={handleFilterSubmit}
          />
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow space-y-3 sticky top-6">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">
              Sort Options
            </h3>
            <div>
              <label
                htmlFor="sortBy"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Sort By
              </label>
              <Select
                id="sortBy"
                name="sortBy" // Add name for clarity
                value={currentSearchParams.sortBy}
                onChange={(e) => handleSortChange(e.target.value, undefined)}
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
              </Select>
            </div>
            <div>
              <label
                htmlFor="sortOrder"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Order
              </label>
              <Select
                id="sortOrder"
                name="sortOrder" // Add name
                value={currentSearchParams.sortOrder}
                onChange={(e) => handleSortChange(undefined, e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </Select>
            </div>
          </div>
        </aside>

        <main className="md:w-2/3 lg:w-3/4 xl:w-4/5">
          {" "}
          {/* Main content area for results */}
          {isLoading && <LoadingSpinner />}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"
              role="alert"
            >
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          {!isLoading && !error && results.length === 0 && query && (
            <div className="text-center py-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                No results found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search terms or filters.
              </p>
            </div>
          )}
          {!isLoading && !error && results.length === 0 && !query && (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Enter a search term above to begin.
              </p>
            </div>
          )}
          {Object.keys(groupedResults).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedResults).map(
                ([type, items]) =>
                  items.length > 0 && (
                    <section key={type}>
                      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">
                        {typeToTitleMapping[type] || `Results from ${type}`} (
                        {items.length})
                      </h2>
                      <div className="space-y-1">
                        {items.map(renderResultItem)}
                      </div>
                    </section>
                  )
              )}
            </div>
          )}
          {pagination && pagination.totalPages > 1 && !isLoading && (
            <div className="mt-8 flex justify-between items-center">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {pagination.totalPages} (Total:{" "}
                {pagination.total} results)
              </span>
              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResultsPage;
