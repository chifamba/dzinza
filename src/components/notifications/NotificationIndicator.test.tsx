import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationIndicator from './NotificationIndicator';
import { UnreadNotificationsCountResponse, NotificationsApiResponse, NotificationData } from '../../types/notifications'; // Adjust path

// Mock NotificationCenterPanel to simplify NotificationIndicator tests
// We can test NotificationCenterPanel separately.
jest.mock('./NotificationCenterPanel', () => ({
  __esModule: true,
  default: jest.fn(({ isOpen, onClose, onNotificationsUpdated }) => {
    // Simulate some interaction if needed, e.g., calling onNotificationsUpdated
    // For now, just render a placeholder if open
    return isOpen ? (
      <div data-testid="mock-notification-panel">
        Mock Panel Content
        <button onClick={onClose}>Close Panel</button>
        <button onClick={onNotificationsUpdated}>Simulate All Read</button>
      </div>
    ) : null;
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUnreadCountResponse: (count: number) => UnreadNotificationsCountResponse = (count) => ({
  data: [], // Not strictly needed for count, but part of the type
  pagination: { totalItems: count, page: 1, limit: 1, totalPages: count > 0 ? Math.ceil(count/1) : 0 },
});

describe('NotificationIndicator', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    // Default mock for unread count
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUnreadCountResponse(0), // Default to 0 unread
    });
  });

  it('fetches unread count on mount and displays no badge if count is 0', async () => {
    render(<NotificationIndicator />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications?isRead=false&limit=1&page=1');
    });
    // Check that no badge is visible (e.g., by querying for text content of the badge)
    // The badge appears as a span with text, or a specific structure.
    // If count is 0, the span holding the count might not exist.
    expect(screen.queryByText(/\d+/)).toBeNull(); // No digit found
    // Check for the bell icon
    expect(screen.getByLabelText(/View notifications/i)).toBeInTheDocument();
  });

  it('displays the correct unread count in a badge if count is > 0', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ // Override default for this test
      ok: true,
      json: async () => mockUnreadCountResponse(5),
    });
    render(<NotificationIndicator />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('displays "9+" if unread count is greater than 9', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnreadCountResponse(15),
    });
    render(<NotificationIndicator />);

    await waitFor(() => {
        expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });


  it('toggles the NotificationCenterPanel on click', async () => {
    render(<NotificationIndicator />);

    const bellButton = screen.getByLabelText(/View notifications/i);
    expect(screen.queryByTestId('mock-notification-panel')).not.toBeInTheDocument();

    // First click: open panel
    await act(async () => {
        fireEvent.click(bellButton);
    });
    await waitFor(() => {
        expect(screen.getByTestId('mock-notification-panel')).toBeInTheDocument();
    });
    // Verify fetch was called again upon opening (as per component logic)
    expect(fetch).toHaveBeenCalledTimes(2); // Initial + on open

    // Second click: close panel
    await act(async () => {
        fireEvent.click(bellButton);
    });
    await waitFor(() => {
        expect(screen.queryByTestId('mock-notification-panel')).not.toBeInTheDocument();
    });
  });

  it('refetches unread count when panel calls onNotificationsUpdated', async () => {
    // Initial fetch for count
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUnreadCountResponse(3),
    });
    render(<NotificationIndicator />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);

    const bellButton = screen.getByLabelText(/View notifications/i);
    await act(async () => { // Open panel
        fireEvent.click(bellButton);
    });
    await waitFor(() => expect(screen.getByTestId('mock-notification-panel')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2); // Count fetch on open

    // Simulate panel marking all as read, which calls onNotificationsUpdated
    // New fetch for count should result in 0
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnreadCountResponse(0),
    });

    const simulateAllReadButton = screen.getByText('Simulate All Read'); // From mock panel
    await act(async () => {
        fireEvent.click(simulateAllReadButton);
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3)); // Count fetch after update
    // Badge should now be gone
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  // TODO: Test NotificationCenterPanel separately for its internal logic:
  // - Fetching its own list of notifications.
  // - Marking individual items as read.
  // - "Mark all as read" button's direct API call.
  // - "Load More" functionality.
});
