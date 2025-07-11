import { useEffect, useState } from "react";
import {
  fetchNotifications,
  markNotificationRead,
} from "../services/api/notificationService";

export interface Notification {
  _id: string;
  type: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative inline-block text-left">
      <button
        className="relative focus:outline-none"
        onClick={() => setShowDropdown((v) => !v)}
        aria-label="Notifications"
      >
        <span className="icon-bell text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded shadow-lg z-50">
          <div className="p-2 font-semibold border-b">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3 border-b last:border-b-0 flex items-start gap-2 ${
                    n.read ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      className="ml-2 text-xs text-blue-600 hover:underline"
                      onClick={() => handleMarkRead(n._id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
