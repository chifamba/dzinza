import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from '@testing-library/user-event';
import EditEventPage from './page'; // Adjust if 'page.tsx' is not the main export

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({
    id: 'mock-event-id', // Provide a mock event ID
  }),
  // Mock other hooks like useSearchParams if EditEventPage uses them
}));

vi.mock('../../../../../components/ui/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: { value: string, onChange: (html: string) => void, placeholder: string }) => (
    <textarea
      data-testid="mock-rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock fetch
global.fetch = vi.fn();

const mockPersons = [
  { id: 'person-1', name: 'John Doe', slug: 'john-doe' },
  { id: 'person-2', name: 'Jane Smith', slug: 'jane-smith' },
];

const mockExistingEvent = {
  id: 'mock-event-id',
  title: 'Existing Event Title',
  type: 'Existing Type',
  description: '<p>Existing Event Description</p>',
  startDate: '2023-12-01',
  endDate: '2023-12-05',
  place: {
    name: 'Existing Location',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  tags: ['tagA', 'tagB'],
  relatedPersons: [{ id: 'person-1', name: 'John Doe', slug: 'john-doe' }], // Event data might return full person objects
  isStory: true,
};

describe('EditEventPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const urlString = url.toString();
      if (options?.method === 'GET' && urlString.includes('/api/persons')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPersons),
        });
      }
      if (options?.method === 'GET' && urlString.includes(`/api/events/${mockExistingEvent.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExistingEvent),
        });
      }
      if (options?.method === 'PUT' && urlString.includes(`/api/events/${mockExistingEvent.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockExistingEvent, message: 'Event updated' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch call: ${urlString} method: ${options?.method}`));
    });
  });

  test('loads existing event data, allows editing, and submits updated data', async () => {
    const user = userEvent.setup();
    render(<EditEventPage />);

    // Wait for initial data to load (event details and persons)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/events/${mockExistingEvent.id}`), expect.objectContaining({ method: 'GET' }));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/persons'), expect.any(Object)); // For related persons select
    });

    // Verify form is pre-filled
    expect(screen.getByLabelText(/title/i)).toHaveValue(mockExistingEvent.title);
    expect(screen.getByLabelText(/event type/i)).toHaveValue(mockExistingEvent.type);
    expect(screen.getByTestId('mock-rich-text-editor')).toHaveValue(mockExistingEvent.description);
    expect(screen.getByLabelText(/start date/i)).toHaveValue(mockExistingEvent.startDate);
    expect(screen.getByLabelText(/end date/i)).toHaveValue(mockExistingEvent.endDate);
    expect(screen.getByLabelText(/place name/i)).toHaveValue(mockExistingEvent.place.name);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(String(mockExistingEvent.place.latitude));
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(String(mockExistingEvent.place.longitude));
    // Tags might need specific checks depending on component used (e.g., value of an input, or presence of tag elements)
    expect(screen.getByLabelText(/tags/i)).toHaveValue(mockExistingEvent.tags.join(', ')); // Assuming tags are displayed as comma-separated string in input
    // Related persons select would also need specific checks, e.g. pre-selected values.
    // For now, we'll assume the form is correctly populated by the component logic based on fetched data.

    // Modify some fields
    const updatedTitle = 'Updated Event Title';
    const updatedDescription = '<p>Updated Event Description</p>';
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), updatedTitle);

    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), {
      target: { value: updatedDescription },
    });

    await user.clear(screen.getByLabelText(/tags/i));
    await user.type(screen.getByLabelText(/tags/i), 'newTag1, newTag2');

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /update event/i })); // Or "Save Changes" etc.

    // Verify fetch call for event update
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/events/${mockExistingEvent.id}`),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Include all fields, changed and unchanged, as the form would typically submit the whole state
            title: updatedTitle,
            type: mockExistingEvent.type, // Unchanged
            description: updatedDescription,
            startDate: mockExistingEvent.startDate, // Unchanged
            endDate: mockExistingEvent.endDate, // Unchanged
            place: { // Unchanged
              name: mockExistingEvent.place.name,
              latitude: mockExistingEvent.place.latitude,
              longitude: mockExistingEvent.place.longitude,
            },
            tags: ['newTag1', 'newTag2'], // Changed
            relatedPersons: mockExistingEvent.relatedPersons.map(p => p.id), // Assuming submission expects IDs
            isStory: mockExistingEvent.isStory, // Unchanged
            id: mockExistingEvent.id, // ID should be part of the payload for PUT usually
          }),
        })
      );
    });
  });
});
