import React, { useState, useEffect, useCallback } from 'react';
import { NotificationData, NotificationsApiResponse } from '../../types/notifications'; // Adjust path
import NotificationItem from './NotificationItem';
import { logger } from '../../utils/logger';
// import { Button } from '../ui/Button'; // Assuming a Button component

// Dummy Button component if not available
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'text-gray-400 bg-gray-200 cursor-not-allowed' :
                  (props.variant === 'link' ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);

// Dummy Loading component
const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => (
    <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{text}</p>
    </div>
);


interface NotificationCenterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null; // For positioning, though direct usage might vary with styling approach
  onNotificationsUpdated?: () => void; // Callback to inform parent (e.g., Indicator) that counts might have changed
}

const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({
    isOpen,
    onClose,
    anchorEl: _anchorEl, // Renamed anchorEl to _anchorEl
    onNotificationsUpdated
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });

  const fetchNotifications = useCallback(async (pageToFetch = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/notifications?sortBy=createdAt&sortOrder=desc&limit=${pagination.limit}&page=${pageToFetch}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch notifications. Status: ${response.status}`);
      }
      const result: NotificationsApiResponse = await response.json();
      if (pageToFetch === 1) {
        setNotifications(result.data || []);
      } else {
        setNotifications(prev => [...prev, ...(result.data || [])]);
      }
      setPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      if (logger?.error) {
        logger.error('Error fetching notifications:', err);
      }
      setNotifications([]); // Clear on error
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1); // Fetch first page when panel opens
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark as read');
      // Update local state for this notification
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      onNotificationsUpdated?.(); // Inform parent to update unread count
    } catch (err) {
      if (logger?.error) {
        logger.error(`Error marking notification ${id} as read:`, err);
      }
      // Potentially show a toast or small error message here
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true); // Use main loading indicator for this global action
    try {
      const response = await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark all as read');
      // Refetch notifications to show all as read
      fetchNotifications(1);
      onNotificationsUpdated?.(); // Inform parent to update unread count
    } catch (err) {
      if (logger?.error) {
        logger.error('Error marking all notifications as read:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to mark all as read.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
        fetchNotifications(pagination.page + 1);
    }
  }

  if (!isOpen) return null;

  // Basic popover styling. In a real app, use a library like Popper.js or Headless UI Popover.
  // The anchorEl prop isn't directly used here for simplicity, assuming CSS positions it.
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%', // Example: position below the anchor
    right: 0,
    zIndex: 50,
  };


  return (
    <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose} // Close on overlay click
        aria-hidden="true"
    >
        <div
            style={panelStyle} // Apply basic positioning
            className="absolute mt-2 w-full max-w-md sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col"
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside panel
        >
            <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Notifications</h2>
                <Button variant="link" onClick={handleMarkAllRead} disabled={isLoading || notifications.every(n => n.isRead)} size="small">
                Mark all as read
                </Button>
            </header>

            <div className="flex-grow overflow-y-auto max-h-[60vh]">
                {isLoading && notifications.length === 0 && <LoadingSpinner />}
                {error && <div className="p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>}
                {!isLoading && !error && notifications.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">You have no notifications.</p>
                )}

                {notifications.map(notif => (
                    <NotificationItem
                        key={notif._id}
                        notification={notif}
                        onMarkAsRead={handleMarkAsRead}
                        onClosePanel={onClose} // Close panel after clicking an item
                    />
                ))}

                {isLoading && notifications.length > 0 && <LoadingSpinner text="Loading more..." />}
            </div>

            {pagination.page < pagination.totalPages && !isLoading && (
                <footer className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
                    <Button variant="link" onClick={handleLoadMore} disabled={isLoading} className="w-full">
                        Load More
                    </Button>
                </footer>
            )}
            {/* Optional: Link to a full notifications page */}
            {/* <footer className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
                <Link to="/notifications" onClick={onClose} className="text-sm text-blue-600 hover:underline">
                    View all notifications
                </Link>
            </footer> */}
        </div>
    </div>
  );
};

export default NotificationCenterPanel;
