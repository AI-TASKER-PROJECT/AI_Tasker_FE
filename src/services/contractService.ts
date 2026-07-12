import { call } from "./apiClient";
import type { AcceptanceCriteria, CaseAttachment, Contract, ContractDeposit, Deliverable, Milestone, MilestoneProgressReport, PaymentActionResponse, ProgressReportRequestRecord, Review, TerminationRequest } from "../types";

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
  rejectContract(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/reject`,
    });
  },
  cancelDraft(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/cancel-draft`,
    });
  },
  payDeposit(contractId: number) {
    return call<PaymentActionResponse<ContractDeposit>>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/deposit/pay`,
    });
  },
  payExpertDeposit(contractId: number) {
    return call<PaymentActionResponse<ContractDeposit>>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/expert-deposit/pay`,
    });
  },
  refundContractDeposits(
    contractId: number,
    payload?: { adminNote?: string; refundAmount?: number; resolvedAmount?: number },
  ) {
    return call<ContractDeposit[]>({
      method: "POST",
      url: `/api/v1/admin/contracts/${contractId}/deposits/refund`,
      data: payload,
    });
  },
  immediateTermination(
    contractId: number,
    payload: { reason?: string; confirmedPenalty: boolean },
  ) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/immediate-termination`,
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
  disputeTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/dispute`,
      params: { reason },
    });
  },
  acceptTerminationRequest(terminationRequestId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/accept`,
    });
  },
  assignTerminationStaff(terminationRequestId: number, staffId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/assign-staff`,
      params: { staffId },
    });
  },
  rejectTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/reject`,
      params: { reason },
    });
  },
  approveTerminationRequest(
    terminationRequestId: number,
    payload?: Partial<TerminationRequest>,
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/approve`,
      data: payload,
    });
  },
  submitTerminationPartialEvidence(
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
  withdrawTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/withdraw`,
      params: { reason },
    });
  },
  refundTerminationDeposit(
    terminationRequestId: number,
    payload: { adminNote?: string; refundAmount?: number; resolvedAmount?: number },
  ) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/refund-deposit`,
      data: payload,
    });
  },
  listCaseAttachments(ownerType: string, ownerId: number) {
    return call<CaseAttachment[]>({
      method: "GET",
      url: "/api/v1/case-attachments",
      params: { ownerType, ownerId },
    });
  },
  createCaseAttachment(payload: Partial<CaseAttachment>) {
    return call<CaseAttachment>({
      method: "POST",
      url: "/api/v1/case-attachments",
      data: payload,
    });
  },
  expireAwaitingExpertTerminationRequests() {
    return call<TerminationRequest[]>({
      method: "POST",
      url: "/api/v1/termination-requests/expire-awaiting-expert",
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
      url: `/api/v1/jobs/${jobId}/milestones`, //Lấy danh sách tất cả các mốc tiến dộ
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
  requestProgressReport(contractId: number, milestoneId: number) {
    return call<ProgressReportRequestRecord>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-report-request`,
    });
  },
  listProgressReports(contractId: number, milestoneId: number) {
    return call<MilestoneProgressReport[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-reports`,
    });
  },
  acknowledgeProgressReport(
    contractId: number,
    milestoneId: number,
    progressReportId: number,
  ) {
    return call<MilestoneProgressReport>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-reports/${progressReportId}/acknowledge`,
    });
  },
  feedbackProgressReport(
    contractId: number,
    milestoneId: number,
    progressReportId: number,
    payload: {
      feedback: string;
      category?: string;
      severity?: string;
      dodItems?: string[];
      requiresAdjustment?: boolean;
    },
  ) {
    return call<MilestoneProgressReport>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/progress-reports/${progressReportId}/feedback`,
      data: payload,
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
  completeMilestone(milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/complete`,
    });
  },
  updateMilestone(milestoneId: number, payload: Partial<Milestone>) {
    return call<Milestone>({
      method: "PATCH",
      url: `/api/v1/milestones/${milestoneId}`,
      data: payload,
    });
  },
  checkOverdueMilestones(contractId: number) {
    return call<Milestone[]>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/check-overdue`,
    });
  },
  autoApproveReviewSla(contractId: number) {
    return call<Milestone[]>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/sla-auto-approve`,
    });
  },
  createReview(contractId: number, payload: Partial<Review>) {
    return call<Review>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/reviews`,
      data: payload,
    });
  },
  listReviews(contractId: number) {
    return call<Review[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/reviews`,
    });
  },
};
