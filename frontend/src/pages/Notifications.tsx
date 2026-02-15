import React, { useEffect, useState } from 'react';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/v1/notifications'); // Simplified path
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="container mt-4">
      <h2>Notifications</h2>
      {notifications.length > 0 ? (
        <div className="list-group">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              className={`list-group-item list-group-item-action ${!n.read ? 'bg-light font-weight-bold' : ''}`}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">{n.title}</h5>
                <small>{new Date(n.created_at).toLocaleDateString()}</small>
              </div>
              <p className="mb-1">{n.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No notifications.</p>
      )}
    </div>
  );
};

export default Notifications;
