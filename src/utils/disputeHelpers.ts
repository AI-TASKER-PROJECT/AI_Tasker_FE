import type { Dispute, SessionUser } from "../types";

export function formatDisputeStatus(status?: string): string {
  const normalized = (status || "").trim().toUpperCase();
  switch (normalized) {
    case "PENDING_SELF_RESOLVE":
      return "Tạo hồ sơ";
    case "ESCALATION_REQUESTED":
      return "Đã yêu cầu nhân viên hỗ trợ";
    case "STAFF_REVIEWING":
      return "Nhân viên đang xem xét";
    case "STAFF_DECIDED":
      return "Nhân viên đã quyết định";
    case "RESOLVED":
      return "Đã giải quyết";
    case "CANCELLED":
      return "Đã rút tranh chấp";
    default:
      return status || "Chưa có trạng thái";
  }
}

export function formatDisputeInitiationType(type?: string): string {
  const normalized = (type || "").trim().toUpperCase();
  switch (normalized) {
    case "BUSINESS_REJECTED_DELIVERABLE":
      return "Phản đối kết quả bàn giao";
    case "EXPERT_SCOPE_CONCERN":
      return "Yêu cầu ngoài phạm vi";
    case "EXPERT_NO_REVIEW_RESPONSE":
      return "Doanh nghiệp chưa phản hồi nghiệm thu";
    case "EXPERT_BAD_FAITH_REJECTION":
      return "Từ chối không phù hợp tiêu chí";
    case "OTHER":
      return "Lý do khác";
    default:
      return type || "Không xác định";
  }
}

export function formatResolutionType(type?: string): string {
  const normalized = (type || "").trim().toUpperCase();
  switch (normalized) {
    case "MUTUAL_AGREEMENT":
      return "Thỏa thuận tự nguyện";
    case "STAFF_DECISION":
      return "Quyết định bởi nhân viên";
    case "CANCELLED":
      return "Đã rút tranh chấp";
    default:
      return type || "Chưa có kết quả";
  }
}

export function canCreateDispute(
  role: string | undefined,
  milestoneStatus: string | undefined
): boolean {
  if (role !== "BUSINESS" && role !== "EXPERT") return false;
  const status = (milestoneStatus || "").trim().toUpperCase();
  return ["IN_PROGRESS", "OVERDUE", "UNDER_REVIEW"].includes(status);
}

export function canRequestStaffIntervention(
  dispute: Dispute | undefined,
  role: string | undefined
): boolean {
  if (!dispute) return false;
  if (role !== "BUSINESS" && role !== "EXPERT") return false;
  const status = (dispute.status || "").trim().toUpperCase();
  return status === "PENDING_SELF_RESOLVE";
}

export function canCancelDispute(
  dispute: Dispute | undefined,
  session: SessionUser | null
): boolean {
  if (!dispute || !session) return false;
  const status = (dispute.status || "").trim().toUpperCase();
  if (status !== "PENDING_SELF_RESOLVE") return false;

  // Initiator only? Spec says: "Initiator có thể Rút tranh chấp"
  if (dispute.initiatedByAccountId && session.accountId) {
    return dispute.initiatedByAccountId === session.accountId;
  }
  return dispute.initiatedBy === session.role;
}

export function canStaffDecide(
  dispute: Dispute | undefined,
  session: SessionUser | null
): boolean {
  if (!dispute || !session) return false;
  if (session.role !== "STAFF") return false;
  const status = (dispute.status || "").trim().toUpperCase();
  return status === "STAFF_REVIEWING";
}
