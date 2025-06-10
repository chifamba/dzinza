import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationCenterPanel from './NotificationCenterPanel';
import { NotificationsApiResponse, NotificationData } from '../../types/notifications';

// Mock react-router-dom's useNavigate (used in NotificationItem)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock fetch
global.fetch = jest.fn();

const mockNotificationsPage1: NotificationData[] = [
  { _id: 'notif-1', userId: 'user-1', type: 'new_comment', title: 'New Comment on Your Post', message: 'Someone commented "Great thoughts!"', link: '/posts/123?commentId=c1', isRead: false, createdAt: new Date(Date.now() - 10000).toISOString(), updatedAt: new Date().toISOString(), actorName: 'Alice' },
  { _id: 'notif-2', userId: 'user-1', type: 'invitation_accepted', title: 'Invitation Accepted', message: 'Bob accepted your invitation to Family Tree X.', link: '/trees/x', isRead: true, createdAt: new Date(Date.now() - 20000).toISOString(), updatedAt: new Date().toISOString(), actorName: 'Bob' },
];
const mockNotificationsPage2: NotificationData[] = [
  { _id: 'notif-3', userId: 'user-1', type: 'role_changed', title: 'Role Updated', message: 'Your role in Family Tree Y was changed to Editor.', link: '/trees/y', isRead: false, createdAt: new Date(Date.now() - 30000).toISOString(), updatedAt: new Date().toISOString(), actorName: 'AdminUser' },
];

const mockApiResponse = (notifications: NotificationData[], page: number, limit: number, totalItems: number): NotificationsApiResponse => ({
  data: notifications,
  pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
});

describe('NotificationCenterPanel', () => {
  const mockOnClose = jest.fn();
  const mockOnNotificationsUpdated = jest.fn();

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockNavigate.mockClear();
    mockOnClose.mockClear();
    mockOnNotificationsUpdated.mockClear();
  });

  it('fetches and displays notifications when opened', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(mockNotificationsPage1, 1, 10, mockNotificationsPage1.length),
    });

    render(
      <NotificationCenterPanel
        isOpen={true}
        onClose={mockOnClose}
        anchorEl={null}
        onNotificationsUpdated={mockOnNotificationsUpdated}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications?sortBy=createdAt&sortOrder=desc&limit=10&page=1');
      expect(screen.getByText('New Comment on Your Post')).toBeInTheDocument();
      expect(screen.getByText('Invitation Accepted')).toBeInTheDocument();
    });
    // Check for unread style on notif-1
    const notif1 = screen.getByText('New Comment on Your Post').closest('div[role="button"]');
    expect(notif1).toHaveClass('bg-blue-50'); // or dark mode equivalent based on your styling
  });

  it('calls "Mark all as read" API and refreshes list', async () => {
    // Initial fetch
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(mockNotificationsPage1, 1, 10, mockNotificationsPage1.length),
    });

    render(
      <NotificationCenterPanel
        isOpen={true}
        onClose={mockOnClose}
        anchorEl={null}
        onNotificationsUpdated={mockOnNotificationsUpdated}
      />
    );
    await waitFor(() => expect(screen.getByText('New Comment on Your Post')).toBeInTheDocument());

    // Mock for PATCH mark-all-read
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'All marked as read', count: 1 }),
    });
    // Mock for subsequent GET after mark all as read (items now read)
    const allReadNotifications = mockNotificationsPage1.map(n => ({ ...n, isRead: true }));
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(allReadNotifications, 1, 10, allReadNotifications.length),
    });

    const markAllReadButton = screen.getByRole('button', { name: /Mark all as read/i });
    await act(async () => {
      fireEvent.click(markAllReadButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/mark-all-read', { method: 'PATCH' });
      // Expect refetch of notifications list
      expect(fetch).toHaveBeenCalledWith('/api/notifications?sortBy=createdAt&sortOrder=desc&limit=10&page=1');
      expect(mockOnNotificationsUpdated).toHaveBeenCalled();
    });
    // Check that notif-1 no longer has unread style (assuming styles change)
    const notif1 = screen.getByText('New Comment on Your Post').closest('div[role="button"]');
    expect(notif1).not.toHaveClass('bg-blue-50');
    expect(notif1).toHaveClass('bg-white'); // or dark mode equivalent
  });

  it('handles marking a single notification as read', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ // Initial GET
      ok: true,
      json: async () => mockApiResponse(mockNotificationsPage1, 1, 10, mockNotificationsPage1.length),
    });
    render(
      <NotificationCenterPanel
        isOpen={true}
        onClose={mockOnClose}
        anchorEl={null}
        onNotificationsUpdated={mockOnNotificationsUpdated}
      />
    );

    const unreadNotif = await screen.findByText('New Comment on Your Post'); // Ensure it's there

    // Mock for PATCH mark one as read
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockNotificationsPage1.find(n => n._id === 'notif-1'), isRead: true }),
    });

    await act(async () => {
      fireEvent.click(unreadNotif.closest('div[role="button"]')!);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/notif-1/read', { method: 'PATCH' });
      expect(mockOnNotificationsUpdated).toHaveBeenCalled();
    });
    // Check that notif-1 no longer has unread style
    const notif1Element = screen.getByText('New Comment on Your Post').closest('div[role="button"]');
    expect(notif1Element).not.toHaveClass('bg-blue-50'); // Assuming style changes
     // If it has a link, navigate should be called
    if (mockNotificationsPage1[0].link) {
        expect(mockNavigate).toHaveBeenCalledWith(mockNotificationsPage1[0].link);
    }
    expect(mockOnClose).toHaveBeenCalled(); // Panel should close after item click
  });

  it('"Load More" button fetches next page and appends notifications', async () => {
    // Page 1
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(mockNotificationsPage1, 1, 2, mockNotificationsPage1.length + mockNotificationsPage2.length), // Total 3, limit 2, so 2 pages
    });
    render(
      <NotificationCenterPanel
        isOpen={true}
        onClose={mockOnClose}
        anchorEl={null}
        onNotificationsUpdated={mockOnNotificationsUpdated}
      />
    );
    await waitFor(() => expect(screen.getByText('New Comment on Your Post')).toBeInTheDocument());
    expect(screen.getByRole('button', {name: /Load More/i})).toBeInTheDocument();

    // Page 2
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse(mockNotificationsPage2, 2, 2, mockNotificationsPage1.length + mockNotificationsPage2.length),
    });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', {name: /Load More/i}));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications?sortBy=createdAt&sortOrder=desc&limit=2&page=2');
      expect(screen.getByText('Role Updated')).toBeInTheDocument(); // From page 2
    });
    // Ensure page 1 items are still there
    expect(screen.getByText('New Comment on Your Post')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /Load More/i})).not.toBeInTheDocument(); // No more pages
  });

});
