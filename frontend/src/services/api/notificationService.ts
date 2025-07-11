import { apiClient } from "./client";

export async function fetchNotifications() {
  const res = await apiClient.get("/api/v1/notifications");
  return res.data;
}

export async function markNotificationRead(notificationId: string) {
  const res = await apiClient.post(`/api/v1/notifications/${notificationId}/read`);
  return res.data;
}
