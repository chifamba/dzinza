import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from '@testing-library/user-event';
import CreateEventPage from './page'; // Adjust if 'page.tsx' is not the main export

// Mock dependencies
// Mocking Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(), // Mock replace if it's used for navigation after submit
  }),
  // Mock other hooks like useSearchParams if CreateEventPage uses them
}));

// Mock RichTextEditor as its extensive testing is done separately
// We only need to ensure its onChange is called and its value is part of the form
vi.mock('../../../../components/ui/RichTextEditor', () => ({
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

describe('CreateEventPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    // Default mock for persons API
    (fetch as jest.Mock).mockImplementation((url: string | URL | Request) => {
      if (url.toString().endsWith('/api/persons')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPersons),
        });
      }
      if (url.toString().endsWith('/api/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-event-id', message: 'Event created' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch call: ${url}`));
    });
  });

  test('renders the form and submits data correctly', async () => {
    const user = userEvent.setup();
    render(<CreateEventPage />);

    // Wait for persons to load for React Select
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/persons'), expect.any(Object)));

    // Fill out the form
    await user.type(screen.getByLabelText(/title/i), 'Test Event Title');
    await user.type(screen.getByLabelText(/event type/i), 'Test Type');

    // Simulate typing in RichTextEditor
    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), {
      target: { value: '<p>Test Event Description</p>' },
    });

    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-01-05');

    await user.type(screen.getByLabelText(/place name/i), 'Test Location');
    await user.type(screen.getByLabelText(/latitude/i), '40.7128');
    await user.type(screen.getByLabelText(/longitude/i), '-74.0060');

    // Tags (assuming it's a text input where tags are comma-separated or handled by a specific component)
    // For simplicity, let's assume a simple text input for tags for now.
    // If it's a more complex component, this interaction will need adjustment.
    await user.type(screen.getByLabelText(/tags/i), 'tag1, tag2');

    // Related Persons (React Select)
    // This interaction depends heavily on how React Select is implemented and its state managed.
    // Typically, you type to filter and then click an option.
    // For a basic mock, we might need to inspect the component or use a more direct state manipulation if possible.
    // Let's assume there's a way to select an option.
    // This part is tricky with react-select and testing-library without knowing the exact props.
    // A common way is to focus the input, type, then click the option that appears.
    const relatedPersonsSelect = screen.getByLabelText(/related persons/i);
    fireEvent.focus(relatedPersonsSelect);
    fireEvent.keyDown(relatedPersonsSelect, { key: 'ArrowDown', code: 'ArrowDown' });
    await screen.findByText('John Doe'); // Wait for option to appear
    fireEvent.click(screen.getByText('John Doe'));


    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    // Verify fetch call for event creation
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/events'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Event Title',
            type: 'Test Type',
            description: '<p>Test Event Description</p>',
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            place: {
              name: 'Test Location',
              latitude: 40.7128, // Ensure this is number
              longitude: -74.0060, // Ensure this is number
            },
            tags: ['tag1', 'tag2'],
            relatedPersons: ['person-1'], // Expecting array of IDs
            isStory: true, // Assuming isStory is true for CreateEventPage
          }),
        })
      );
    });

    // Optionally, verify navigation or success message
    // For example, if router.push is called:
    // expect(jest.requireMock('next/navigation').useRouter().push).toHaveBeenCalledWith(...);
  });

  test('submits data with empty optional fields correctly', async () => {
    const user = userEvent.setup();
    render(<CreateEventPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/persons'), expect.any(Object)));

    await user.type(screen.getByLabelText(/title/i), 'Minimal Event');
    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), {
      target: { value: '<p>Minimal Description</p>' },
    });
    // Leave dates, place, tags, relatedPersons empty

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/events'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Minimal Event',
            type: '', // Or undefined, depending on component behavior
            description: '<p>Minimal Description</p>',
            startDate: undefined, // Or handled as empty string then converted
            endDate: undefined,
            // place should be undefined if placeName is empty
            place: undefined,
            tags: [], // Or undefined
            relatedPersons: [], // Or undefined
            isStory: true,
          }),
        })
      );
    });
  });
});
