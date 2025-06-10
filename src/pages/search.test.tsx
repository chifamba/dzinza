import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // MemoryRouter for testing routes
import SearchResultsPage from './search'; // Adjust path to your page component
import { SearchResultsApiResponse, SearchResultItem, PersonData, EventData } from '../types/search'; // Adjust

// Mock hooks and services
const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams('');
const mockSetSearchParams = jest.fn((newParams: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => {
    if (typeof newParams === 'function') {
        mockSearchParams = newParams(mockSearchParams);
    } else {
        mockSearchParams = newParams;
    }
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

// Mock child components for focused testing of SearchResultsPage logic
jest.mock('../components/search/PersonSearchResultItem', () => ({ person }: { person: PersonData }) => <div data-testid="person-item">{person.fullName || person.firstName}</div>);
jest.mock('../components/search/EventSearchResultItem', () => ({ event }: { event: EventData }) => <div data-testid="event-item">{event.title}</div>);
jest.mock('../components/search/CommentSearchResultItem', () => ({ comment }: any) => <div data-testid="comment-item">{comment.content?.substring(0,10)}</div>);
jest.mock('../components/search/SearchFilters', () => ({ initialFilters, activeSearchTypes, onSubmit }: any) => (
  <form data-testid="search-filters-form" onSubmit={(e) => { e.preventDefault(); onSubmit(initialFilters); }}>
    <input type="text" defaultValue={initialFilters.location || ''} name="location" data-testid="location-filter-input" onChange={(e) => initialFilters.location = e.target.value} />
    <button type="submit">Apply Mock Filters</button>
  </form>
));


// Mock fetch
global.fetch = jest.fn();

const mockApiResponse = (items: SearchResultItem[], page: number, totalItems: number, limit: number = 10): SearchResultsApiResponse => ({
  data: items,
  pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
});

const personHit: SearchResultItem = { _id: 'p1', _score: 1, _index: 'persons', _source: { fullName: 'John Doe' } as PersonData };
const eventHit: SearchResultItem = { _id: 'e1', _score: 1, _index: 'events', _source: { title: 'Big Event' } as EventData };


describe('SearchResultsPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockNavigate.mockClear(); // Though navigate isn't directly called by SearchResultsPage usually, but by Link components
    mockSetSearchParams.mockClear();
    mockSearchParams = new URLSearchParams(''); // Reset search params
  });

  const renderWithRouter = (initialRoute = "/search?q=test") => {
    mockSearchParams = new URLSearchParams(initialRoute.split('?')[1] || '');
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/search" element={<SearchResultsPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially, then displays results for a query', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse([personHit, eventHit], 1, 2),
    });
    renderWithRouter('/search?q=testquery');

    expect(screen.getByText(/Loading search results.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Search Results for "testquery"')).toBeInTheDocument();
      expect(screen.getByText('People')).toBeInTheDocument(); // Group heading
      expect(screen.getByTestId('person-item')).toHaveTextContent('John Doe');
      expect(screen.getByText('Events & Stories')).toBeInTheDocument(); // Group heading
      expect(screen.getByTestId('event-item')).toHaveTextContent('Big Event');
    });
    expect(fetch).toHaveBeenCalledWith('/api/search?q=testquery&page=1&limit=10&sortBy=relevance&sortOrder=desc');
  });

  it('displays "No results found" message when API returns empty data for a query', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse([], 1, 0),
    });
    renderWithRouter('/search?q=norez');

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search terms or filters/i)).toBeInTheDocument();
    });
  });

  it('displays "Enter a search term" message when query is empty', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ // Hook might not even fetch if query is empty
        ok: true,
        json: async () => mockApiResponse([], 1, 0),
    });
    renderWithRouter('/search'); // No query

    await waitFor(() => {
      expect(screen.getByText(/Enter a search term above to begin/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled(); // Hook should not fetch if query is empty
  });


  it('displays error message when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    renderWithRouter('/search?q=testerror');

    await waitFor(() => {
      expect(screen.getByText('Error Loading Trees')).toBeInTheDocument(); // The error title
      expect(screen.getByText('API Error')).toBeInTheDocument(); // The error message
    });
  });

  it('handles pagination: clicking Next updates URL and refetches', async () => {
    // Page 1
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse([eventHit], 1, 3, 1), // 1 item per page, 3 total items
    });
    renderWithRouter('/search?q=paginate&limit=1');

    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeInTheDocument());
    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).not.toBeDisabled();

    // Mock response for Page 2
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse([{...eventHit, _id: 'e2', _source: {title: 'Event Page 2'}} as SearchResultItem], 2, 3, 1),
    });

    await act(async () => {
        fireEvent.click(nextButton);
    });

    await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
        // Check if the URL search params were updated to page=2
        const lastCallArgs = mockSetSearchParams.mock.calls[0][0] as URLSearchParams;
        expect(lastCallArgs.get('page')).toBe('2');
    });
    // The hook will then use these new params to call fetch again
    // Verify fetch call for page 2 (assuming the hook reacts to setSearchParams)
    // This part depends on how useSearchResults is implemented regarding re-fetching upon param change.
    // The current implementation of SearchResultsPage directly calls fetchSearchResults in useEffect based on currentSearchParams,
    // and currentSearchParams updates from useSearchParams.
    await waitFor(() => {
         expect(fetch).toHaveBeenCalledWith('/api/search?q=paginate&limit=1&page=2&sortBy=relevance&sortOrder=desc');
         expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
         expect(screen.getByText('Event Page 2')).toBeInTheDocument();
    });
  });

  it('handles filter submission: updates URL and refetches', async () => {
    (fetch as jest.Mock).mockResolvedValue({ // Mock for initial and subsequent fetches
      ok: true,
      json: async () => mockApiResponse([eventHit], 1, 1),
    });
    renderWithRouter('/search?q=filtertest');
    await waitFor(() => expect(screen.getByTestId('event-item')).toBeInTheDocument());

    // Simulate changing a filter and applying
    const locationInput = screen.getByTestId('location-filter-input');
    fireEvent.change(locationInput, { target: { value: 'London' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Apply Mock Filters/i }));
    });

    await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
        const lastCallArgs = mockSetSearchParams.mock.calls[0][0] as URLSearchParams;
        expect(lastCallArgs.get('location')).toBe('London');
        expect(lastCallArgs.get('page')).toBe('1'); // Page should reset
    });
     await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('location=London'));
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'));
    });
  });

  it('handles sort selection: updates URL and refetches', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse([eventHit], 1, 1),
    });
    renderWithRouter('/search?q=sorttest');
    await waitFor(() => expect(screen.getByTestId('event-item')).toBeInTheDocument());

    const sortBySelect = screen.getByLabelText(/Sort By/i);
    fireEvent.change(sortBySelect, { target: { value: 'date' } });

    await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
        const lastCallArgs = mockSetSearchParams.mock.calls[0][0] as URLSearchParams;
        expect(lastCallArgs.get('sortBy')).toBe('date');
        expect(lastCallArgs.get('page')).toBe('1'); // Page should reset
    });
    await waitFor(() => {
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('sortBy=date'));
         expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'));
    });
  });

});
