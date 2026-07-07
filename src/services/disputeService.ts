import { call } from "./apiClient";
import type { CaseAttachment, Dispute, StaffAssignmentCandidate } from "../types";

export const disputeApi = {
  create(payload: Partial<Dispute>) {
    return call<Dispute>({
      method: "POST",
      url: "/api/v1/disputes",
      data: payload,
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
    return call<Dispute[]>({
      method: "GET",
      url: `/api/v1/disputes`,
      params,
    });
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
  adminFinalDecision(
    disputeId: number,
    payload: { action: "APPROVE_AS_IS" | "ADJUST" | "REQUEST_REVISION"; expertPercent?: number; note?: string },
  ) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/admin-final-decision`,
      data: payload,
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
  demoTesting(disputeId: number, testResult: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/demo-testing`,
      params: { testResult },
    });
  },
};
