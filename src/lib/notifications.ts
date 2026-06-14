import type { NotificationItem } from "../types";

export function notificationHref(targetUrl?: string) {
  if (!targetUrl) return "/app/notifications";
  if (targetUrl.startsWith("/app/")) return targetUrl;

  const proposalMatch = targetUrl.match(/^\/business\/jobs\/(\d+)\/proposals/);
  if (proposalMatch) return `/app/jobs/${proposalMatch[1]}/manage`;

  if (targetUrl === "/expert/proposals") return "/app/proposals";
  if (targetUrl === "/business/kyb") return "/app/business/profile";
  if (targetUrl === "/expert/profile") return "/app/expert/profile";

  const staffDisputeMatch = targetUrl.match(/^\/staff\/disputes\/(\d+)/);
  if (staffDisputeMatch) return `/app/tickets/${staffDisputeMatch[1]}`;

  if (targetUrl.startsWith("/")) return targetUrl;
  return "/app/notifications";
}

export function notificationTone(item: NotificationItem) {
  const value = `${item.type} ${item.title}`.toLowerCase();
  if (value.includes("reject") || value.includes("dispute") || value.includes("failed")) return "warning";
  if (value.includes("approve") || value.includes("accepted") || value.includes("submitted")) return "success";
  return "info";
}

export function formatNotificationTime(value?: string) {
  if (!value) return "Vua xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Vua xong";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phut truoc`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} gio truoc`;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function mergeNotification(items: NotificationItem[], next: NotificationItem) {
  return [next, ...items.filter((item) => item.notificationId !== next.notificationId)];
}
