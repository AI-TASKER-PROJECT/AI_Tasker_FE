import { call } from "./apiClient";
import type { CaseAttachment, Dispute, StaffAssignmentCandidate } from "../types";

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
  listAll(params?: Record<string, any>) {
    void params;
    return Promise.reject(
      new Error("Backend hien khong expose API liet ke tat ca dispute."),
    );
  },
  get(disputeId: number) {
    return call<Dispute>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}`,
    });
  },
  assign(disputeId: number, staffId: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/assign-staff`,
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
  rejectIntervention(disputeId: number, reason?: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/reject-intervention`,
      params: { reason },
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
