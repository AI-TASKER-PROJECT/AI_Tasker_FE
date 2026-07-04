import type {
  Dispute,
  DisputeInitiationType,
  DisputeResolutionType,
  DisputeStatus,
  Role,
} from "../types";

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  PENDING_SELF_RESOLVE: "Đang tự thương lượng",
  ESCALATION_REQUESTED: "Đã yêu cầu Staff can thiệp",
  STAFF_REVIEWING: "Staff đang xem xét",
  INTERVENTION_REJECTED: "Staff từ chối can thiệp",
  STAFF_DECIDED: "Staff đã ra quyết định",
  RESOLVED: "Đã giải quyết",
  CANCELLED: "Đã hủy",
};

export const DISPUTE_INITIATION_TYPE_LABELS: Record<
  DisputeInitiationType,
  string
> = {
  BUSINESS_REJECTED_DELIVERABLE: "Business từ chối sản phẩm bàn giao",
  EXPERT_SCOPE_CONCERN: "Expert báo vượt phạm vi công việc",
  EXPERT_NO_REVIEW_RESPONSE: "Business không phản hồi/không review",
  EXPERT_BAD_FAITH_REJECTION: "Expert cho rằng bị từ chối không hợp lý",
  OTHER: "Lý do khác",
};

export const DISPUTE_RESOLUTION_TYPE_LABELS: Record<
  DisputeResolutionType,
  string
> = {
  BUSINESS_APPROVED_AFTER_SELF_RESOLVE: "Business đã duyệt sau tự thương lượng",
  STAFF_DECISION_SETTLEMENT: "Đã xử lý theo quyết định của Staff",
  CANCELLED_BY_INITIATOR: "Người khởi tạo đã hủy",
  CANCELLED_BY_ADMIN: "Admin đã hủy",
};

export function translateDisputeStatus(status?: string) {
  const normalized = toDisputeStatus(status);
  return normalized ? DISPUTE_STATUS_LABELS[normalized] : status;
}

export function translateDisputeInitiationType(type?: string) {
  const normalized = toDisputeInitiationType(type);
  return normalized ? DISPUTE_INITIATION_TYPE_LABELS[normalized] : type;
}

export function translateDisputeResolutionType(type?: string) {
  const normalized = toDisputeResolutionType(type);
  return normalized ? DISPUTE_RESOLUTION_TYPE_LABELS[normalized] : type;
}

export function canBusinessRequestStaffIntervention(
  role?: Role,
  status?: string,
) {
  return role === "BUSINESS" && status === "PENDING_SELF_RESOLVE";
}

export function canExpertInitiateDispute(
  role?: Role,
  milestoneStatus?: string,
) {
  return (
    role === "EXPERT" &&
    ["IN_PROGRESS", "UNDER_REVIEW"].includes(
      normalizeStatus(milestoneStatus),
    )
  );
}

export function canExpertResubmitDeliverable(
  role?: Role,
  disputeStatus?: string,
  milestoneStatus?: string,
) {
  return (
    role === "EXPERT" &&
    normalizeStatus(disputeStatus) === "PENDING_SELF_RESOLVE" &&
    normalizeStatus(milestoneStatus) === "DISPUTED"
  );
}

export function canAdminAssignStaff(role?: Role, status?: string) {
  return role === "ADMIN" && normalizeStatus(status) === "ESCALATION_REQUESTED";
}

export function canStaffRejectIntervention(
  role?: Role,
  dispute?: Dispute,
  currentStaffId?: number,
) {
  return (
    role === "STAFF" &&
    normalizeStatus(dispute?.status) === "STAFF_REVIEWING" &&
    isAssignedStaff(dispute, currentStaffId)
  );
}

export function canStaffIssueDecision(
  role?: Role,
  dispute?: Dispute,
  currentStaffId?: number,
) {
  return (
    role === "STAFF" &&
    normalizeStatus(dispute?.status) === "STAFF_REVIEWING" &&
    isAssignedStaff(dispute, currentStaffId)
  );
}

export function canInitiatorCancelDispute(
  role?: Role,
  dispute?: Dispute,
  accountId?: number,
) {
  if (!role || !dispute) return false;
  if (role === "ADMIN") return isActiveDisputeStatus(dispute.status);
  const requesterMatchesRole = dispute.initiatedBy === role;
  const requesterMatchesAccount =
    dispute.initiatedByAccountId === undefined ||
    accountId === undefined ||
    dispute.initiatedByAccountId === accountId;
  return (
    requesterMatchesRole &&
    requesterMatchesAccount &&
    ["PENDING_SELF_RESOLVE", "ESCALATION_REQUESTED"].includes(dispute.status)
  );
}

export function isActiveDisputeStatus(status?: string) {
  return [
    "PENDING_SELF_RESOLVE",
    "ESCALATION_REQUESTED",
    "STAFF_REVIEWING",
    "STAFF_DECIDED",
  ].includes(normalizeStatus(status));
}

function toDisputeStatus(status?: string): DisputeStatus | undefined {
  const normalized = normalizeStatus(status);
  const values: DisputeStatus[] = [
    "PENDING_SELF_RESOLVE",
    "ESCALATION_REQUESTED",
    "STAFF_REVIEWING",
    "INTERVENTION_REJECTED",
    "STAFF_DECIDED",
    "RESOLVED",
    "CANCELLED",
  ];
  return values.find((value) => value === normalized);
}

function toDisputeInitiationType(
  type?: string,
): DisputeInitiationType | undefined {
  const normalized = normalizeStatus(type);
  const values: DisputeInitiationType[] = [
    "BUSINESS_REJECTED_DELIVERABLE",
    "EXPERT_SCOPE_CONCERN",
    "EXPERT_NO_REVIEW_RESPONSE",
    "EXPERT_BAD_FAITH_REJECTION",
    "OTHER",
  ];
  return values.find((value) => value === normalized);
}

function toDisputeResolutionType(
  type?: string,
): DisputeResolutionType | undefined {
  const normalized = normalizeStatus(type);
  const values: DisputeResolutionType[] = [
    "BUSINESS_APPROVED_AFTER_SELF_RESOLVE",
    "STAFF_DECISION_SETTLEMENT",
    "CANCELLED_BY_INITIATOR",
    "CANCELLED_BY_ADMIN",
  ];
  return values.find((value) => value === normalized);
}

function normalizeStatus(value?: string) {
  return (value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function isAssignedStaff(dispute?: Dispute, currentStaffId?: number) {
  return Boolean(
    dispute?.assignedStaffId &&
      currentStaffId &&
      dispute.assignedStaffId === currentStaffId,
  );
}
