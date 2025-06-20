import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react'; // Assuming lucide-react for icons
import NotificationCenterPanel from './NotificationCenterPanel';
import { UnreadNotificationsCountResponse } from '../../types/notifications'; // Adjust path
import { logger } from '../../utils/logger';

const NotificationIndicator: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<string | null>(null);

  const bellIconRef = useRef<HTMLButtonElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    setIsLoadingCount(true);
    setErrorCount(null);
    try {
      // Fetch only a single item to get the totalItems count from pagination metadata
      const response = await fetch('/api/notifications?isRead=false&limit=1&page=1');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch unread count. Status: ${response.status}`);
      }
      const result: UnreadNotificationsCountResponse = await response.json();
      setUnreadCount(result.pagination.totalItems || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setErrorCount(errorMessage); // You might want to display this error somewhere or just log it
      if (logger?.error) {
        logger.error('Error fetching unread notification count:', err);
      }
      setUnreadCount(0); // Reset count on error
    } finally {
      setIsLoadingCount(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Future: Set up polling or WebSocket listener here if desired
  }, [fetchUnreadCount]);

  const togglePanel = () => {
    setIsPanelOpen(prev => !prev);
    if (!isPanelOpen) { // If panel is about to open
        fetchUnreadCount(); // Refresh count and potentially list inside panel too
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleNotificationsUpdated = () => {
    // This callback is called from NotificationCenterPanel when notifications are marked as read
    fetchUnreadCount(); // Re-fetch the unread count
  };

  return (
    <div className="relative">
      <button
        ref={bellIconRef}
        onClick={togglePanel}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
        aria-label="View notifications"
        aria-haspopup="true"
        aria-expanded={isPanelOpen}
      >
        <Bell size={22} />
        {isLoadingCount && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
        )}
        {!isLoadingCount && unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 transform translate-x-1/3 -translate-y-1/3">
            <span className="absolute inline-flex items-center justify-center w-full h-full text-xs font-bold text-white bg-red-500 border-2 border-white dark:border-gray-800 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
         {errorCount && ( // Simple error indicator, could be a tooltip or small icon
            <span className="absolute top-1 right-0 -mt-1 -mr-1 flex h-2 w-2">
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" title={errorCount}></span>
            </span>
        )}
      </button>

      <NotificationCenterPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        anchorEl={bellIconRef.current} // Pass the ref for potential positioning
        onNotificationsUpdated={handleNotificationsUpdated}
      />
    </div>
  );
};

export default NotificationIndicator;
