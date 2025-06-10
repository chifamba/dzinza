import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // For <Link>
import EventSearchResultItem from './EventSearchResultItem'; // Adjust path
import { SearchResultItem, EventData } from '../../types/search'; // Adjust

// Mock lucide-react icons used in EventSearchResultItem
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  CalendarEvent: (props: any) => <svg data-testid="icon-calendar-event" {...props} />,
  MapPin: (props: any) => <svg data-testid="icon-map-pin" {...props} />,
  Hash: (props: any) => <svg data-testid="icon-hash" {...props} />,
  Type: (props: any) => <svg data-testid="icon-type" {...props} />,
  CalendarDays: (props: any) => <svg data-testid="icon-calendar-days" {...props} />,
}));


describe('EventSearchResultItem', () => {
  const mockEventSource: EventData = {
    _id: 'evt123',
    title: 'Summer Festival',
    plainTextContent: 'A wonderful festival celebrating summer with music and food.',
    eventDate: '2024-07-20T00:00:00.000Z',
    category: 'Festival',
    tags: ['music', 'food', 'summer'],
    placeName: 'Central Park',
  };

  const mockItemWithoutHighlight: SearchResultItem = {
    _id: 'evt123',
    _score: 5,
    _index: 'events',
    _source: mockEventSource,
  };

  const mockItemWithHighlight: SearchResultItem = {
    _id: 'evt123',
    _score: 5,
    _index: 'events',
    _source: { ...mockEventSource, title: 'Original Title', plainTextContent: 'Original Content Snippet' }, // Source has original
    highlight: {
      title: ['Summer <mark>Festival</mark>'],
      plainTextContent: ['A wonderful <mark>festival</mark> celebrating summer...'],
      category: ['<mark>Festival</mark>'],
      // Tags might be highlighted individually if search matches part of a tag and ES is configured for it
      // For example, if "tags" field in ES is an array of strings and highlighting is on it.
      // tags: ["<mark>music</mark>", "food"]
    },
  };

  const renderWithRouter = (item: SearchResultItem) => {
    return render(
      <MemoryRouter>
        <EventSearchResultItem item={item} />
      </MemoryRouter>
    );
  };

  it('renders event title from _source when no highlight is available', () => {
    renderWithRouter(mockItemWithoutHighlight);
    expect(screen.getByText(mockEventSource.title!)).toBeInTheDocument();
    // Check that no HTML is being dangerously set
    expect(screen.getByText(mockEventSource.title!).innerHTML).toBe(mockEventSource.title!);
  });

  it('renders highlighted event title when highlight data is available', () => {
    renderWithRouter(mockItemWithHighlight);
    const titleElement = screen.getByText((content, element) => element?.tagName.toLowerCase() === 'h3' && content.includes('Festival'));
    expect(titleElement).toBeInTheDocument();
    // Check for the <mark> tag within the title's span
    const markElement = titleElement.querySelector('mark');
    expect(markElement).toBeInTheDocument();
    expect(markElement).toHaveTextContent('Festival');
    // Verify the full HTML content
    expect(titleElement.querySelector('span[dangerouslySetInnerHTML]')).toBeInTheDocument();
    expect(titleElement.innerHTML).toContain('Summer <mark>Festival</mark>');
  });

  it('renders plainTextContent snippet from _source when no highlight is available', () => {
    renderWithRouter(mockItemWithoutHighlight);
    const expectedSnippet = mockEventSource.plainTextContent!.substring(0, 200) + (mockEventSource.plainTextContent!.length > 200 ? '...' : '');
    expect(screen.getByText(expectedSnippet)).toBeInTheDocument();
  });

  it('renders highlighted plainTextContent snippet when highlight data is available', () => {
    renderWithRouter(mockItemWithHighlight);
    const contentElement = screen.getByText((content, element) => content.includes("wonderful") && content.includes("celebrating"));
    expect(contentElement).toBeInTheDocument();
    const markElement = contentElement.querySelector('mark');
    expect(markElement).toBeInTheDocument();
    expect(markElement).toHaveTextContent('festival');
    expect(contentElement.innerHTML).toContain('A wonderful <mark>festival</mark> celebrating summer...');
  });

  it('renders category from _source when no highlight is available', () => {
    renderWithRouter(mockItemWithoutHighlight);
    // Category is within a span like "Category: <span class="...">{category}</span>"
    const categorySpan = screen.getByText(mockEventSource.category!).closest('span');
    expect(categorySpan).toHaveTextContent(mockEventSource.category!);
  });

  it('renders highlighted category when highlight data is available', () => {
    renderWithRouter(mockItemWithHighlight);
    const categoryParagraph = screen.getByText((content, element) => element?.textContent?.startsWith('Category:') || false);
    expect(categoryParagraph).toBeInTheDocument();
    const categorySpan = categoryParagraph.querySelector('span > span[dangerouslySetInnerHTML]'); // The span holding the category value
    expect(categorySpan).toBeInTheDocument();
    expect(categorySpan!.innerHTML).toBe('<mark>Festival</mark>');
  });


  it('links to the correct event detail page', () => {
    renderWithRouter(mockItemWithoutHighlight);
    const linkElement = screen.getByRole('link', { name: new RegExp(mockEventSource.title!, 'i') });
    expect(linkElement).toHaveAttribute('href', `/events/${mockItemWithoutHighlight._id}`);
  });

  // Test for tags: Highlighting tags is more complex due to array structure.
  // If tags are highlighted, item.highlight.tags would be an array of strings (each potentially with <mark>).
  // If not, item._source.tags (string[]) is used.
  // The component's current logic for tags:
  // item.highlight?.tags ? item.highlight.tags.map(...) : event.tags?.map(...)
  // This means if item.highlight.tags exists, it expects an array of HTML strings.

  it('renders non-highlighted tags correctly', () => {
    renderWithRouter(mockItemWithoutHighlight);
    expect(screen.getByText('music')).toBeInTheDocument();
    expect(screen.getByText('food')).toBeInTheDocument();
    expect(screen.getByText('summer')).toBeInTheDocument();
  });

  it('renders highlighted tags if provided', () => {
    const itemWithHighlightedTags: SearchResultItem = {
      ...mockItemWithHighlight,
      highlight: {
        ...mockItemWithHighlight.highlight,
        tags: ["<mark>music</mark>", "food"] // Only 'music' is highlighted
      }
    };
    renderWithRouter(itemWithHighlightedTags);

    const musicTag = screen.getByText((content, element) => element?.innerHTML === "<mark>music</mark>");
    expect(musicTag).toBeInTheDocument();
    expect(screen.getByText("food")).toBeInTheDocument(); // Non-highlighted tag
    // Ensure the original non-highlighted tag 'summer' from source is not shown if highlight.tags exists
    expect(screen.queryByText("summer")).not.toBeInTheDocument();
  });

});
