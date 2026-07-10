import { call } from "./apiClient";
import type {
  AcceptanceCriteria,
  Contract,
  ContractDeposit,
  Deliverable,
  Milestone,
  MilestoneProgressReport,
  PaymentActionResponse,
  TerminationRequest,
} from "../types";

export interface DepositRefundRequest {
  refundAmount?: number;
  adminNote?: string;
}

export const contractApi = {
  listContracts() {
    return call<Contract[]>({ method: "GET", url: "/api/v1/contracts" });
  },
  getContract(contractId: number) {
    return call<Contract>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}`,
    });
  },
  createFromProposal(proposalId: number, payload: Partial<Contract>) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/from-proposals/${proposalId}`,
      data: payload,
    });
  },
  sign(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/sign`,
    });
  },
  signNda(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/nda-sign`,
    });
  },
  reject(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/reject`,
    });
  },
  payDeposit(contractId: number) {
    return call<PaymentActionResponse<ContractDeposit>>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/deposit/pay`,
    });
  },
  refundContractDeposit(
    contractId: number,
    payload: DepositRefundRequest = {},
  ) {
    return call<ContractDeposit>({
      method: "POST",
      url: `/api/v1/admin/contracts/${contractId}/deposit/refund`,
      data: payload,
    });
  },
  requestTermination(
    contractId: number,
    payload: Partial<TerminationRequest>,
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/termination-requests`,
      data: payload,
    });
  },
  listTerminationRequests(contractId: number) {
    return call<TerminationRequest[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/termination-requests`,
    });
  },
  getTerminationRequest(terminationRequestId: number) {
    return call<TerminationRequest>({
      method: "GET",
      url: `/api/v1/termination-requests/${terminationRequestId}`,
    });
  },
  assignTerminationStaff(terminationRequestId: number, staffId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/assign-staff`,
      params: { staffId },
    });
  },
  rejectTermination(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/reject`,
      params: { reason },
    });
  },
  approveTermination(
    terminationRequestId: number,
    payload: Partial<TerminationRequest> = {},
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/approve`,
      data: payload,
    });
  },
  submitPartialEvidence(
    terminationRequestId: number,
    payload: Partial<TerminationRequest>,
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/partial-evidence`,
      data: payload,
    });
  },
  executeTerminationSettlement(terminationRequestId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/execute-settlement`,
    });
  },
  withdrawTermination(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/withdraw`,
      params: { reason },
    });
  },
  refundDepositAfterTermination(
    terminationRequestId: number,
    payload: DepositRefundRequest = {},
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/refund-deposit`,
      data: payload,
    });
  },
  createMilestone(payload: Partial<Milestone>) {
    return call<Milestone>({
      method: "POST",
      url: "/api/v1/milestones",
      data: payload,
    });
  },
  listMilestones(contractId: number) {
    return call<Milestone[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/milestones`,
    });
  },
  listJobMilestones(jobId: number) {
    return call<Milestone[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/milestones`,
    });
  },
  createCriteria(milestoneId: number, payload: Partial<AcceptanceCriteria>) {
    return call<AcceptanceCriteria>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/criteria`,
      data: payload,
    });
  },
  updateCriteria(
    milestoneId: number,
    criteriaId: number,
    payload: Partial<AcceptanceCriteria>,
  ) {
    return call<AcceptanceCriteria>({
      method: "PUT",
      url: `/api/v1/milestones/${milestoneId}/criteria/${criteriaId}`,
      data: payload,
    });
  },
  deleteCriteria(milestoneId: number, criteriaId: number) {
    return call<void>({
      method: "DELETE",
      url: `/api/v1/milestones/${milestoneId}/criteria/${criteriaId}`,
    });
  },
  listCriteria(milestoneId: number) {
    return call<AcceptanceCriteria[]>({
      method: "GET",
      url: `/api/v1/milestones/${milestoneId}/criteria`,
    });
  },
  submitDeliverable(milestoneId: number, payload: Partial<Deliverable>) {
    return call<Deliverable>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/deliverables`,
      data: payload,
    });
  },
  submitProgressReport(
    contractId: number,
    milestoneId: number,
    payload: Partial<MilestoneProgressReport>,
  ) {
    return call<MilestoneProgressReport>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-reports`,
      data: payload,
    });
  },
  listProgressReports(contractId: number, milestoneId: number) {
    return call<MilestoneProgressReport[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-reports`,
    });
  },
  listDeliverables(milestoneId: number) {
    return call<Deliverable[]>({
      method: "GET",
      url: `/api/v1/milestones/${milestoneId}/deliverables`,
    });
  },
  depositMilestoneEscrow(contractId: number, milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/deposit`,
    });
  },
  startMilestone(milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/start`,
    });
  },
  approveMilestone(milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/approve`,
    });
  },
  rejectMilestone(milestoneId: number, reason?: string) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/reject`,
      params: { reason },
    });
  },
  createReview(contractId: number, payload: { rating: number; comment?: string }) {
    return call<any>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/reviews`,
      data: payload,
    });
  },
  listReviews(contractId: number) {
    return call<any[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/reviews`,
    });
  },
};
