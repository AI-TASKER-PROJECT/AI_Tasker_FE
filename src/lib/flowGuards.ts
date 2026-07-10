import type {
  Contract,
  ContractStatus,
  Dispute,
  DisputeStatus,
  Milestone,
  MilestoneStatus,
  Role,
  TerminationRequest,
  TerminationRequestStatus,
} from "../types";

export function normalizeFlowStatus(value?: string) {
  return (value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ ký/quỹ contract",
  ACTIVE: "Đang thực hiện",
  TERMINATION_PENDING: "Đang xét chấm dứt",
  COMPLETED: "Hoàn thành, chờ hoàn cọc",
  TERMINATED: "Đã chấm dứt, chờ hoàn cọc",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: "Chờ nạp ký quỹ milestone",
  DEPOSITED: "Đã ký quỹ, chờ Expert bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  UNDER_REVIEW: "Chờ Business nghiệm thu",
  DISPUTED: "Đang tranh chấp",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  PENDING_SELF_RESOLVE: "Đang tự thương lượng",
  ESCALATION_REQUESTED: "Đã yêu cầu Staff can thiệp",
  STAFF_REVIEWING: "Staff đang xem xét",
  INTERVENTION_REJECTED: "Staff từ chối can thiệp",
  STAFF_DECIDED: "Staff đã ra quyết định",
  RESOLVED: "Đã giải quyết",
  CANCELLED: "Đã hủy",
};

export const TERMINATION_STATUS_LABELS: Record<TerminationRequestStatus, string> = {
  REQUESTED: "Chờ Admin gán Staff",
  STAFF_REVIEWING: "Staff đang xem xét",
  STAFF_APPROVED: "Staff đã duyệt",
  STAFF_REJECTED: "Staff từ chối",
  AWAITING_SETTLEMENT_EXECUTION: "Chờ execute settlement",
  AWAITING_DEPOSIT_REFUND: "Chờ hoàn cọc hợp đồng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy/rút",
};

export function contractStatusLabel(status?: string) {
  const normalized = normalizeFlowStatus(status) as ContractStatus;
  return CONTRACT_STATUS_LABELS[normalized] || status || "Chưa có trạng thái";
}

export function milestoneStatusLabel(status?: string) {
  const normalized = normalizeFlowStatus(status) as MilestoneStatus;
  return MILESTONE_STATUS_LABELS[normalized] || status || "Chưa có trạng thái";
}

export function disputeStatusLabel(status?: string) {
  const normalized = normalizeFlowStatus(status) as DisputeStatus;
  return DISPUTE_STATUS_LABELS[normalized] || status || "Chưa có trạng thái";
}

export function terminationStatusLabel(status?: string) {
  const normalized = normalizeFlowStatus(status) as TerminationRequestStatus;
  return TERMINATION_STATUS_LABELS[normalized] || status || "Chưa có trạng thái";
}

export function isActiveDispute(status?: string) {
  return [
    "PENDING_SELF_RESOLVE",
    "ESCALATION_REQUESTED",
    "STAFF_REVIEWING",
    "STAFF_DECIDED",
  ].includes(normalizeFlowStatus(status));
}

export function isActiveTermination(status?: string) {
  return [
    "REQUESTED",
    "STAFF_REVIEWING",
    "STAFF_APPROVED",
    "AWAITING_SETTLEMENT_EXECUTION",
    "AWAITING_DEPOSIT_REFUND",
  ].includes(normalizeFlowStatus(status));
}

export function canBusinessDepositMilestone(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  hasActiveTermination = false,
) {
  return (
    role === "BUSINESS" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    normalizeFlowStatus(milestone?.status) === "PENDING" &&
    !hasActiveTermination
  );
}

export function canExpertStartMilestone(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  hasActiveTermination = false,
) {
  return (
    role === "EXPERT" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    normalizeFlowStatus(milestone?.status) === "DEPOSITED" &&
    !hasActiveTermination
  );
}

export function canExpertSubmitProgress(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  hasActiveTermination = false,
) {
  return (
    role === "EXPERT" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    normalizeFlowStatus(milestone?.status) === "IN_PROGRESS" &&
    !hasActiveTermination
  );
}

export function canExpertSubmitDeliverable(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  activeDispute?: Dispute,
  hasActiveTermination = false,
) {
  const milestoneStatus = normalizeFlowStatus(milestone?.status);
  const disputeStatus = normalizeFlowStatus(activeDispute?.status);
  return (
    role === "EXPERT" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    !hasActiveTermination &&
    (milestoneStatus === "IN_PROGRESS" ||
      (milestoneStatus === "DISPUTED" &&
        disputeStatus === "PENDING_SELF_RESOLVE"))
  );
}

export function canBusinessApproveMilestone(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  hasActiveTermination = false,
) {
  return (
    role === "BUSINESS" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    normalizeFlowStatus(milestone?.status) === "UNDER_REVIEW" &&
    !hasActiveTermination
  );
}

export function canBusinessRejectMilestone(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  hasActiveTermination = false,
) {
  return canBusinessApproveMilestone(role, contract, milestone, hasActiveTermination);
}

export function canExpertInitiateDispute(
  role?: Role,
  contract?: Contract | null,
  milestone?: Milestone | null,
  activeDispute?: Dispute,
  hasActiveTermination = false,
) {
  return (
    role === "EXPERT" &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    ["IN_PROGRESS", "UNDER_REVIEW"].includes(
      normalizeFlowStatus(milestone?.status),
    ) &&
    !activeDispute &&
    !hasActiveTermination
  );
}

export function canRequestStaffIntervention(role?: Role, dispute?: Dispute) {
  return (
    (role === "BUSINESS" || role === "EXPERT") &&
    normalizeFlowStatus(dispute?.status) === "PENDING_SELF_RESOLVE"
  );
}

export function canAssignStaffToDispute(role?: Role, dispute?: Dispute) {
  return role === "ADMIN" && normalizeFlowStatus(dispute?.status) === "ESCALATION_REQUESTED";
}

export function canStaffDecideDispute(
  role?: Role,
  dispute?: Dispute,
  staffId?: number,
) {
  return (
    role === "STAFF" &&
    normalizeFlowStatus(dispute?.status) === "STAFF_REVIEWING" &&
    Boolean(dispute?.assignedStaffId && staffId && dispute.assignedStaffId === staffId)
  );
}

export function canRequestTermination(
  role?: Role,
  contract?: Contract | null,
  activeTermination?: TerminationRequest,
) {
  return (
    (role === "BUSINESS" || role === "EXPERT") &&
    normalizeFlowStatus(contract?.status) === "ACTIVE" &&
    !activeTermination
  );
}

export function canWithdrawTermination(
  role?: Role,
  request?: TerminationRequest,
  accountId?: number,
) {
  const status = normalizeFlowStatus(request?.status);
  return (
    (role === "BUSINESS" || role === "EXPERT" || role === "ADMIN") &&
    ["REQUESTED", "STAFF_REVIEWING"].includes(status) &&
    (role === "ADMIN" ||
      request?.requestedByAccountId === undefined ||
      accountId === undefined ||
      request.requestedByAccountId === accountId)
  );
}

export function canAssignStaffToTermination(
  role?: Role,
  request?: TerminationRequest,
) {
  return role === "ADMIN" && normalizeFlowStatus(request?.status) === "REQUESTED";
}

export function canStaffDecideTermination(
  role?: Role,
  request?: TerminationRequest,
  staffId?: number,
) {
  return (
    role === "STAFF" &&
    normalizeFlowStatus(request?.status) === "STAFF_REVIEWING" &&
    Boolean(request?.assignedStaffId && staffId && request.assignedStaffId === staffId)
  );
}

export function canExpertSubmitPartialEvidence(
  role?: Role,
  request?: TerminationRequest,
) {
  return (
    role === "EXPERT" &&
    normalizeFlowStatus(request?.status) === "STAFF_REVIEWING" &&
    Boolean(request?.partialEvidenceRequired) &&
    !request?.partialEvidenceSubmittedAt
  );
}

export function canAdminExecuteTerminationSettlement(
  role?: Role,
  request?: TerminationRequest,
) {
  return (
    role === "ADMIN" &&
    normalizeFlowStatus(request?.status) === "AWAITING_SETTLEMENT_EXECUTION"
  );
}

export function canAdminRefundContractDeposit(
  role?: Role,
  contract?: Contract | null,
  request?: TerminationRequest,
) {
  return (
    role === "ADMIN" &&
    ["COMPLETED", "TERMINATED"].includes(normalizeFlowStatus(contract?.status)) &&
    normalizeFlowStatus(request?.status) === "AWAITING_DEPOSIT_REFUND"
  );
}

export function canCreateReview(role?: Role, contract?: Contract | null) {
  return (
    (role === "BUSINESS" || role === "EXPERT") &&
    normalizeFlowStatus(contract?.status) === "CLOSED"
  );
}
