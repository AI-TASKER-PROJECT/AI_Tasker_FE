import { call } from "./apiClient";
import type {
  AdminDisputeListResponse,
  CaseAttachment,
  Dispute,
  StaffAssignmentCandidate,
  StaffDisputeListResponse,
} from "../types";

export const disputeApi = {
  create(payload: Partial<Dispute>) {
    if (!payload.contractId || !payload.milestoneId) {
      return Promise.reject(
        new Error("Backend yeu cau contractId va milestoneId de tao dispute."),
      );
    }
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/milestones/${payload.milestoneId}/disputes`,
      params: {
        contractId: payload.contractId,
        initiatedBy: payload.initiatedBy,
        initiationType: payload.initiationType || "OTHER",
        reason: payload.evidenceReport,
      },
    });
  },
  initiate(contractId: number, milestoneId: number, initiatedBy: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/disputes`,
      params: { contractId, initiatedBy },
    });
  },
  listByContract(contractId: number) {
    return call<Dispute[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/disputes`,
    });
  },
  listAdmin(params?: {
    page?: number;
    size?: number;
    status?: string;
    assignedStaffId?: number;
    from?: string;
    to?: string;
    q?: string;
  }) {
    return call<AdminDisputeListResponse>({
      method: "GET",
      url: "/api/v1/admin/disputes",
      params,
    });
  },
  listStaff(params?: {
    page?: number;
    size?: number;
    status?: string;
  }) {
    return call<StaffDisputeListResponse>({
      method: "GET",
      url: "/api/v1/staff/disputes",
      params,
    });
  },
  get(disputeId: number) {
    return call<Dispute>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}`,
    });
  },
  routeStaff(disputeId: number, staffId?: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/route-staff`,
      params: { staffId },
    });
  },
  staffDecision(
    disputeId: number,
    expertPercent: number,
    note?: string,
    staffReport?: string,
  ) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/staff-decision`,
      params: { expertPercent, note, staffReport },
    });
  },
  executeSettlement(disputeId: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/execute-settlement`,
    });
  },
  staffCandidates(disputeId: number) {
    return call<StaffAssignmentCandidate[]>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}/staff-candidates`,
    });
  },
  listEvidence(disputeId: number) {
    return call<CaseAttachment[]>({
      method: "GET",
      url: "/api/v1/case-attachments",
      params: { ownerType: "DISPUTE", ownerId: disputeId },
    });
  },
  createEvidence(disputeId: number, payload: { fileUrl: string; fileName?: string; fileType?: string; note?: string }) {
    return call<CaseAttachment>({
      method: "POST",
      url: "/api/v1/case-attachments",
      data: {
        ownerType: "DISPUTE",
        ownerId: disputeId,
        ...payload,
      },
    });
  },
  escalate(disputeId: number, reason?: string, evidenceFile?: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/escalation-request`,
      params: { reason, evidenceFile },
    });
  },
  cancel(disputeId: number, reason?: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/cancel`,
      params: { reason },
    });
  },
  escalateStaffSla() {
    return call<Dispute[]>({
      method: "POST",
      url: "/api/v1/disputes/staff-sla-escalate",
    });
  },
  demoTesting(disputeId: number, testResult: string) {
    void disputeId;
    void testResult;
    return Promise.reject(
      new Error("Backend hien khong expose API demo-testing cho dispute."),
    );
  },
};
