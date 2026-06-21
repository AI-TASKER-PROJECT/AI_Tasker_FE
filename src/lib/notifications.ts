import type { NotificationItem } from "../types";

function metadataNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function metadataValue(
  notification: NotificationItem | undefined,
  keys: string[],
) {
  const metadata = notification?.metadata;
  if (!metadata) return undefined;
  for (const key of keys) {
    if (metadata[key] !== undefined && metadata[key] !== null) {
      return metadata[key];
    }
  }
  return undefined;
}

function isContractNotification(notification?: NotificationItem) {
  if (!notification) return false;
  const value = `${notification.type} ${notification.title} ${notification.message}`.toLowerCase();
  return (
    value.includes("contract") ||
    value.includes("hợp đồng") ||
    value.includes("hop dong") ||
    value.includes("ký quỹ") ||
    value.includes("ky quy") ||
    value.includes("nda")
  );
}

export function notificationHref(
  targetUrl?: string,
  notification?: NotificationItem,
) {
  const metadataContractId = metadataNumber(
    metadataValue(notification, [
      "contractId",
      "contract_id",
      "relatedContractId",
      "related_contract_id",
      "entityId",
      "entity_id",
      "relatedId",
      "related_id",
      "referenceId",
      "reference_id",
    ]),
  );
  const metadataJobId = metadataNumber(
    metadataValue(notification, [
      "jobId",
      "job_id",
      "relatedJobId",
      "related_job_id",
    ]),
  );
  const contractRelated = isContractNotification(notification);

  if (!targetUrl) {
    if (metadataContractId) return `/app/contracts/${metadataContractId}`;
    if (contractRelated) return "/app/contracts";
    if (metadataJobId) return `/app/jobs/${metadataJobId}/manage`;
    return "/app/notifications";
  }
  if (targetUrl.startsWith("/app/")) return targetUrl;

  const proposalMatch = targetUrl.match(/^\/business\/jobs\/(\d+)\/proposals/);
  if (proposalMatch) return `/app/jobs/${proposalMatch[1]}/manage`;

  const contractWorkspaceMatch = targetUrl.match(
    /^\/(?:business\/|expert\/)?contracts\/(\d+)\/workspace/,
  );
  if (contractWorkspaceMatch) {
    return `/app/contracts/${contractWorkspaceMatch[1]}/workspace`;
  }

  const contractMatch = targetUrl.match(
    /^\/(?:business\/|expert\/)?contracts\/(\d+)/,
  );
  if (contractMatch) return `/app/contracts/${contractMatch[1]}`;

  const bareContractMatch = targetUrl.match(/^\/contracts\/(\d+)/);
  if (bareContractMatch) return `/app/contracts/${bareContractMatch[1]}`;

  const contractIdFromQuery = targetUrl.match(/[?&]contractId=(\d+)/);
  if (contractIdFromQuery) return `/app/contracts/${contractIdFromQuery[1]}`;

  const contractIdFromText = targetUrl.match(/contract[^0-9]*(\d+)/i);
  if (contractIdFromText) return `/app/contracts/${contractIdFromText[1]}`;

  if (targetUrl === "/expert/proposals") return "/app/proposals";
  if (targetUrl === "/business/kyb") return "/app/business/profile";
  if (targetUrl === "/expert/profile") return "/app/expert/profile";

  const staffDisputeMatch = targetUrl.match(/^\/staff\/disputes\/(\d+)/);
  if (staffDisputeMatch) return `/app/tickets/${staffDisputeMatch[1]}`;

  if (metadataContractId) return `/app/contracts/${metadataContractId}`;
  if (contractRelated) return "/app/contracts";
  if (metadataJobId) return `/app/jobs/${metadataJobId}/manage`;

  if (targetUrl.startsWith("/")) {
    if (targetUrl.startsWith("/business/") || targetUrl.startsWith("/expert/")) {
      return "/app/notifications";
    }
    return targetUrl;
  }
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
