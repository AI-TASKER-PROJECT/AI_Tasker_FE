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

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function isProfileVerificationNotification(notification?: NotificationItem) {
  if (!notification) return false;
  const value = normalizedText(
    `${notification.type} ${notification.title} ${notification.message}`,
  );
  return (
    value.includes("profile_verification") ||
    value.includes("kyb") ||
    value.includes("kyc") ||
    value.includes("xac minh") ||
    value.includes("ho so")
  );
}

function metadataProfileType(notification?: NotificationItem) {
  const raw = metadataValue(notification, [
    "profileType",
    "profile_type",
    "verificationType",
    "verification_type",
    "entityType",
    "entity_type",
  ]);
  const value = String(raw || "").toLowerCase();
  if (value.includes("business") || value.includes("kyb")) return "business";
  if (value.includes("expert") || value.includes("kyc")) return "expert";
  const text = normalizedText(
    `${notification?.type || ""} ${notification?.title || ""} ${
      notification?.message || ""
    }`,
  );
  if (
    text.includes("business") ||
    text.includes("kyb") ||
    text.includes("doanh nghiep")
  ) {
    return "business";
  }
  if (
    text.includes("expert") ||
    text.includes("kyc") ||
    text.includes("chuyen gia")
  ) {
    return "expert";
  }
  return undefined;
}

function verificationHref(
  notification: NotificationItem | undefined,
  targetUrl?: string,
) {
  if (!isProfileVerificationNotification(notification)) return undefined;

  const targetProfileMatch = targetUrl?.match(
    /^\/(?:app\/)?(?:staff\/)?verifications\/(business|expert)\/(\d+)/,
  );
  if (targetProfileMatch) {
    return `/app/verifications/${targetProfileMatch[1]}/${targetProfileMatch[2]}`;
  }

  const targetBusinessId = metadataNumber(
    metadataValue(notification, [
      "businessId",
      "business_id",
      "businessProfileId",
      "business_profile_id",
    ]),
  );
  if (targetBusinessId) return `/app/verifications/business/${targetBusinessId}`;

  const targetExpertId = metadataNumber(
    metadataValue(notification, [
      "expertId",
      "expert_id",
      "expertProfileId",
      "expert_profile_id",
    ]),
  );
  if (targetExpertId) return `/app/verifications/expert/${targetExpertId}`;

  const genericProfileId = metadataNumber(
    metadataValue(notification, [
      "profileId",
      "profile_id",
      "relatedProfileId",
      "related_profile_id",
      "entityId",
      "entity_id",
      "relatedId",
      "related_id",
      "referenceId",
      "reference_id",
      "id",
    ]),
  );
  const profileType = metadataProfileType(notification);
  if (genericProfileId && profileType) {
    return `/app/verifications/${profileType}/${genericProfileId}`;
  }

  const queryBusinessId = targetUrl?.match(
    /[?&](?:businessId|businessProfileId)=(\d+)/,
  );
  if (queryBusinessId) return `/app/verifications/business/${queryBusinessId[1]}`;

  const queryExpertId = targetUrl?.match(
    /[?&](?:expertId|expertProfileId)=(\d+)/,
  );
  if (queryExpertId) return `/app/verifications/expert/${queryExpertId[1]}`;

  const queryProfileId = targetUrl?.match(
    /[?&](?:profileId|entityId|id)=(\d+)/,
  );
  const queryType = targetUrl?.match(
    /[?&](?:profileType|verificationType|entityType)=(business|expert|kyb|kyc)/i,
  );
  if (queryProfileId && queryType) {
    const type = queryType[1].toLowerCase();
    return `/app/verifications/${
      type === "kyb" ? "business" : type === "kyc" ? "expert" : type
    }/${queryProfileId[1]}`;
  }

  return "/app/verifications";
}

export function notificationHref(
  targetUrl?: string,
  notification?: NotificationItem,
  role?: string,
) {
  const targetVerificationHref = verificationHref(notification, targetUrl);
  if (targetVerificationHref) return targetVerificationHref;

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
  const metadataDisputeId = metadataNumber(
    metadataValue(notification, [
      "disputeId",
      "dispute_id",
      "relatedDisputeId",
      "related_dispute_id",
      "ticketId",
      "ticket_id",
      "relatedTicketId",
      "related_ticket_id",
    ]),
  );
  const contractRelated = isContractNotification(notification);
  const disputeHref = (disputeId: number) => {
    if (role === "ADMIN") return `/app/disputes/${disputeId}`;
    if (role === "STAFF") return `/app/tickets/${disputeId}`;
    return `/app/disputes/${disputeId}`;
  };

  if (!targetUrl) {
    if (metadataDisputeId) return disputeHref(metadataDisputeId);
    if (metadataContractId) return `/app/contracts/${metadataContractId}`;
    if (contractRelated) return "/app/contracts";
    if (metadataJobId) return `/app/jobs/${metadataJobId}/manage`;
    return "/app/notifications";
  }
  const appContractDisputeMatch = targetUrl.match(/^\/app\/contracts\/\d+\/disputes\/(\d+)/);
  if (appContractDisputeMatch) return disputeHref(Number(appContractDisputeMatch[1]));

  const appDisputeMatch = targetUrl.match(/^\/app\/disputes\/(\d+)/);
  if (appDisputeMatch) return disputeHref(Number(appDisputeMatch[1]));

  const appTicketMatch = targetUrl.match(/^\/app\/tickets\/(\d+)/);
  if (appTicketMatch) return disputeHref(Number(appTicketMatch[1]));

  if (
    targetUrl === "/app/withdrawal-requests" ||
    targetUrl === "/app/withdrawal-requests/" ||
    targetUrl === "/app/admin/withdrawal-requests" ||
    targetUrl === "/app/admin/withdrawal-requests/"
  ) {
    return "/app/admin/withdrawals";
  }

  if (targetUrl.startsWith("/app/")) return targetUrl;

  if (targetUrl === "/wallet" || targetUrl === "/wallet/") {
    return "/app/wallet";
  }

  if (
    targetUrl === "/withdrawal-requests" ||
    targetUrl === "/withdrawal-requests/" ||
    targetUrl === "/admin/withdrawal-requests" ||
    targetUrl === "/admin/withdrawal-requests/"
  ) {
    return "/app/admin/withdrawals";
  }

  const expertJobMatch = targetUrl.match(/^\/expert\/jobs\/(\d+)/);
  if (expertJobMatch) return `/jobs/${expertJobMatch[1]}`;

  const proposalMatch = targetUrl.match(/^\/business\/jobs\/(\d+)\/proposals/);
  if (proposalMatch) return `/app/jobs/${proposalMatch[1]}/manage`;

  const contractWorkspaceMatch = targetUrl.match(
    /^\/(?:business\/|expert\/)?contracts\/(\d+)\/workspace/,
  );
  if (contractWorkspaceMatch) {
    return `/app/contracts/${contractWorkspaceMatch[1]}/workspace`;
  }

  const contractDisputeMatch = targetUrl.match(
    /^\/(?:business\/|expert\/)?contracts\/\d+\/disputes\/(\d+)/,
  );
  if (contractDisputeMatch) return disputeHref(Number(contractDisputeMatch[1]));

  const bareContractDisputeMatch = targetUrl.match(
    /^\/contracts\/\d+\/disputes\/(\d+)/,
  );
  if (bareContractDisputeMatch) return disputeHref(Number(bareContractDisputeMatch[1]));

  const adminDisputeMatch = targetUrl.match(/^\/(?:app\/)?admin\/disputes\/(\d+)/);
  if (adminDisputeMatch) return `/app/disputes/${adminDisputeMatch[1]}`;

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
  if (targetUrl === "/business/kyb") return "/app/business/kyb";
  if (targetUrl === "/expert/kyc") return "/app/expert/kyc";
  if (targetUrl === "/expert/profile") return "/app/expert/profile";

  const staffDisputeMatch = targetUrl.match(
    /^\/(?:app\/)?staff\/(?:disputes|tickets)\/(\d+)/,
  );
  if (staffDisputeMatch) return disputeHref(Number(staffDisputeMatch[1]));

  const disputeIdFromQuery = targetUrl.match(
    /[?&](?:disputeId|ticketId)=(\d+)/,
  );
  if (disputeIdFromQuery) return disputeHref(Number(disputeIdFromQuery[1]));

  if (metadataDisputeId) return disputeHref(metadataDisputeId);
  if (metadataContractId) return `/app/contracts/${metadataContractId}`;
  if (contractRelated) return "/app/contracts";
  if (metadataJobId) return `/app/jobs/${metadataJobId}/manage`;

  if (targetUrl.startsWith("/")) {
    if (
      targetUrl.startsWith("/business/") ||
      targetUrl.startsWith("/expert/") ||
      targetUrl.startsWith("/staff/")
    ) {
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
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Vừa xong";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;

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
