import { call } from "./apiClient";
import type { Dispute } from "../types";

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
  get(disputeId: number) {
    return call<Dispute>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}`,
    });
  },
  assign(disputeId: number, staffId: number) {
    return call<Dispute>({
      method: "PATCH",
      url: `/api/v1/disputes/${disputeId}/assign`,
      params: { staffId },
    });
  },
  resolve(disputeId: number, proposedAction: string) {
    return call<Dispute>({
      method: "PATCH",
      url: `/api/v1/disputes/${disputeId}/resolve`,
      params: { proposedAction },
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
  technicalReport(
    disputeId: number,
    reportContent: string,
    proposedAction?: string,
  ) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/technical-report`,
      params: { reportContent, proposedAction },
    });
  },
};
