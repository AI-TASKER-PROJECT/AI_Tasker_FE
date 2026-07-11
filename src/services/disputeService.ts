// Chỉ là lớp tích hợp cho nút Flow 4. Màn hình và route Flow 5 được quản lý riêng.
import { call } from "./apiClient";
import type { CaseAttachment, Dispute, StaffAssignmentCandidate } from "../types";

export const disputeApi = {
  create(payload: Partial<Dispute>) {
    return call<Dispute>({ method: "POST", url: `/api/v1/milestones/${payload.milestoneId}/disputes`, params: { contractId: payload.contractId, initiatedBy: payload.initiatedBy, initiationType: payload.initiationType || "OTHER" } });
  },
  listByContract(contractId: number) { return call<Dispute[]>({ method: "GET", url: `/api/v1/contracts/${contractId}/disputes` }); },
  listAll() { return Promise.reject(new Error("Danh sách Flow 5 do module Flow 5 quản lý.")); },
  get(disputeId: number) { return call<Dispute>({ method: "GET", url: `/api/v1/disputes/${disputeId}` }); },
  routeStaff(disputeId: number, staffId?: number) { return call<Dispute>({ method: "POST", url: `/api/v1/disputes/${disputeId}/route-staff`, ...(staffId ? { params: { staffId } } : {}) }); },
  staffCandidates(disputeId: number) { return call<StaffAssignmentCandidate[]>({ method: "GET", url: `/api/v1/disputes/${disputeId}/staff-candidates` }); },
  createEvidence(disputeId: number, payload: { fileUrl: string; fileName?: string; fileType?: string; note?: string }) { return call<CaseAttachment>({ method: "POST", url: "/api/v1/case-attachments", data: { ownerType: "DISPUTE", ownerId: disputeId, ...payload } }); },
  escalate(disputeId: number, reason?: string, evidenceFile?: string) { return call<Dispute>({ method: "POST", url: `/api/v1/disputes/${disputeId}/escalation-request`, params: { reason, evidenceFile } }); },
};
