import { apiClient } from "./client";

export async function fetchNotifications() {
  const res = await apiClient.get("/api/v1/notifications");
  return res.data;
}

export async function markNotificationRead(notificationId: string) {
  // Backend route is PATCH /api/v1/notifications/{notification_id}/mark-read
  const res = await apiClient.patch(`/api/v1/notifications/${notificationId}/mark-read`);
  return res.data;
}
