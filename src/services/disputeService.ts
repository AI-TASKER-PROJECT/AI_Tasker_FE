import { call } from "./apiClient";
import type {
  AssignStaffRequest,
  CancelDisputeRequest,
  CreateExpertDisputeRequest,
  Dispute,
  RejectInterventionRequest,
  RequestStaffInterventionRequest,
  StaffDecisionRequest,
} from "../types";

export const disputeApi = {
  initiateExpertDispute(payload: CreateExpertDisputeRequest) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/milestones/${payload.milestoneId}/disputes`,
      params: {
        contractId: payload.contractId,
        initiatedBy: payload.initiatedBy || "EXPERT",
        initiationType: payload.initiationType,
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
  get(disputeId: number) {
    return call<Dispute>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}`,
    });
  },
  requestStaffIntervention(
    disputeId: number,
    payload: RequestStaffInterventionRequest,
  ) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/escalation-request`,
      params: payload,
    });
  },
  assignStaff(disputeId: number, payload: AssignStaffRequest) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/assign-staff`,
      params: payload,
    });
  },
  rejectIntervention(disputeId: number, payload: RejectInterventionRequest) {
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
      url: `/api/v1/disputes/${disputeId}/reject-intervention`,
      params: payload,
    });
  },
  issueStaffDecision(disputeId: number, payload: StaffDecisionRequest) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/staff-decision`,
      params: payload,
    });
  },
  executeSettlement(disputeId: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/execute-settlement`,
    });
  },
  cancel(disputeId: number, payload: CancelDisputeRequest = {}) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/cancel`,
      params: payload,
    });
  },
  assign(disputeId: number, staffId: number) {
    return this.assignStaff(disputeId, { staffId });
  },
};
