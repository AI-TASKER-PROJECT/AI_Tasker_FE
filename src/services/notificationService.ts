import { call } from "./apiClient";
import type { NotificationItem, UnreadNotificationCount } from "../types";

export const notificationApi = {
  list() {
    return call<NotificationItem[]>({
      method: "GET",
      url: "/api/v1/notifications",
    });
  },
  unreadCount() {
    return call<UnreadNotificationCount>({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
    });
  },
  markRead(notificationId: number) {
    return call<NotificationItem>({
      method: "PATCH",
      url: `/api/v1/notifications/${notificationId}/read`,
    });
  },
  markAllRead() {
    return call<NotificationItem[]>({
      method: "PATCH",
      url: "/api/v1/notifications/read-all",
    });
  },
};
