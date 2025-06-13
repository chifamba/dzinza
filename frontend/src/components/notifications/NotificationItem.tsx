import React from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming react-router-dom for navigation
import { NotificationData } from '../../types/notifications'; // Adjust path if necessary
import { formatDistanceToNowStrict } from 'date-fns'; // For relative time

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: string) => Promise<void>; // Parent handles API call and list refresh
  onClosePanel?: () => void; // Optional: to close the panel after interaction
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, onClosePanel }) => {
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!notification.isRead) {
      await onMarkAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    if (onClosePanel) {
        onClosePanel();
    }
  };

  const timeAgo = notification.createdAt
    ? formatDistanceToNowStrict(new Date(notification.createdAt), { addSuffix: true })
    : 'some time ago';

  return (
    <div
      onClick={handleClick}
      className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0
                  ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800'}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-start space-x-3">
        {!notification.isRead && (
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" aria-label="Unread mark"></div>
        )}
        <div className={`flex-grow ${notification.isRead ? 'pl-5' : ''}`}> {/* Add padding if read to align with unread items that have the dot */}
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {notification.actorName && <span className="font-semibold">{notification.actorName} </span>}
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
