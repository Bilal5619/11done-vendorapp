import type { VendorNotification } from "@/types/vendor";
import api, { unwrapData } from "./client";

export type NotificationListResponse = {
  notifications?: VendorNotification[];
  unread_count?: number;
};

export async function getNotifications(params?: {
  unread_only?: boolean;
  limit?: number;
}) {
  const response = await api.get("/notifications", { params });
  const payload = unwrapData<NotificationListResponse>(response);

  return {
    notifications: payload.notifications ?? [],
    unread_count: payload.unread_count ?? 0,
  };
}

export async function markNotificationRead(id: string | number) {
  const response = await api.post(`/notifications/${id}/read`);

  return unwrapData<{
    notification?: VendorNotification;
    unread_count?: number;
  }>(response);
}

export async function markAllNotificationsRead() {
  const response = await api.post("/notifications/read-all");

  return unwrapData<{
    unread_count?: number;
  }>(response);
}

export async function clearNotifications() {
  const response = await api.delete("/notifications");

  return unwrapData<{
    notifications?: VendorNotification[];
    unread_count?: number;
    message?: string;
  }>(response);
}
