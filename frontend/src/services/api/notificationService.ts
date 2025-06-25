import { apiClient } from "./client";

export async function fetchNotifications() {
  const res = await apiClient.get("/notifications");
  return res.data;
}

export async function markNotificationRead(notificationId: string) {
  const res = await apiClient.post(`/notifications/${notificationId}/read`);
  return res.data;
}
