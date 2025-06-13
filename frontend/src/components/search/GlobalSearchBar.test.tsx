import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalSearchBar from './GlobalSearchBar'; // Adjust path as necessary

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Preserve other exports
  useNavigate: () => mockNavigate,
}));

// Mock lucide-react SearchIcon (if not already globally mocked or causing issues)
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'), // Preserve other icons
  Search: (props: any) => <svg data-testid="search-icon" {...props} />, // Simple mock for Search icon
}));


describe('GlobalSearchBar', () => {
  beforeEach(() => {
    // Clear mock usage history before each test
    mockNavigate.mockClear();
  });

  it('renders the search input and button', () => {
    render(<GlobalSearchBar />);
    expect(screen.getByRole('searchbox', { name: /Global search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit search/i })).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('updates search term in input field as user types', () => {
    render(<GlobalSearchBar />);
    const searchInput = screen.getByRole('searchbox', { name: /Global search/i }) as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: 'test query' } });
    expect(searchInput.value).toBe('test query');
  });

  it('navigates to search results page on form submission with a valid search term', () => {
    render(<GlobalSearchBar />);
    const searchInput = screen.getByRole('searchbox', { name: /Global search/i });
    const searchForm = screen.getByRole('search'); // The form itself

    fireEvent.change(searchInput, { target: { value: 'family history' } });
    fireEvent.submit(searchForm);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=family%20history');
  });

  it('URL-encodes the search term on submission', () => {
    render(<GlobalSearchBar />);
    const searchInput = screen.getByRole('searchbox', { name: /Global search/i });
    const searchForm = screen.getByRole('search');

    fireEvent.change(searchInput, { target: { value: 'Smith & Jones' } });
    fireEvent.submit(searchForm);

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Smith%20%26%20Jones');
  });

  it('does not navigate if search term is empty after trimming', () => {
    render(<GlobalSearchBar />);
    const searchInput = screen.getByRole('searchbox', { name: /Global search/i });
    const searchForm = screen.getByRole('search');

    fireEvent.change(searchInput, { target: { value: '   ' } }); // Whitespace only
    fireEvent.submit(searchForm);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate if search term is initially empty and submitted', () => {
    render(<GlobalSearchBar />);
    const searchForm = screen.getByRole('search');
    // No change event, searchTerm is initially ''
    fireEvent.submit(searchForm);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('uses the placeholder prop if provided', () => {
    const customPlaceholder = "Search for ancestors...";
    render(<GlobalSearchBar placeholder={customPlaceholder} />);
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });

  it('uses default placeholder if no prop provided', () => {
    render(<GlobalSearchBar />);
    // Default placeholder is "Search events, people, comments..."
    expect(screen.getByPlaceholderText("Search events, people, comments...")).toBeInTheDocument();
  });
});
