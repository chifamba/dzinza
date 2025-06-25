import Notification from "../models/Notification";

export async function createNotification({
  userId,
  type,
  message,
  data,
}: {
  userId: string;
  type: string;
  message: string;
  data?: Record<string, any>;
}) {
  return Notification.create({
    userId,
    type,
    message,
    data,
    read: false,
    createdAt: new Date(),
  });
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  const query: any = { userId };
  if (unreadOnly) query.read = false;
  return Notification.find(query).sort({ createdAt: -1 });
}

export async function markNotificationRead(notificationId: string) {
  return Notification.findByIdAndUpdate(notificationId, { read: true });
}
