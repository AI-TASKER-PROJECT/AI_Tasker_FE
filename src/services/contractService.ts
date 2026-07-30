import { call } from "./apiClient";
import type { AcceptanceCriteria, CaseAttachment, Contract, ContractChangeRequest, ContractDeposit, ContractDepositRateResponse, Deliverable, Milestone, MilestoneProgressReport, PaymentActionResponse, ProgressReportRequestRecord, Review, TerminationRequest } from "../types";

export const contractApi = {
  getDepositRates() {
    return call<ContractDepositRateResponse>({
      method: "GET",
      url: "/api/v1/contracts/deposit-rates",
    });
  },
  // Lấy danh sách hợp đồng
  listContracts() {
    return call<Contract[]>({ method: "GET", url: "/api/v1/contracts" });
  },
  // Lấy chi tiết hợp đồng dựa trên contractId
  getContract(contractId: number) {
    return call<Contract>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}`,
    });
  },
  // Tạo hợp đồng từ proposalId, dùng khi doanh nghiệp chấp nhận proposal của chuyên gia.
  createFromProposal(proposalId: number, payload: Partial<Contract>) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/from-proposals/${proposalId}`,
      data: payload,
    });
  },
  // Ký hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp chấp nhận ký hợp đồng.
  sign(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/sign`,
    });
  },
  // Ký NDA hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp chấp nhận ký NDA hợp đồng.
  signNda(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/nda-sign`,
    });
  },
  // Từ chối hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp từ chối ký hợp đồng.
  rejectContract(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/reject`,
    });
  },
  // Hủy hợp đồng nháp, dùng khi doanh nghiệp hủy hợp đồng nháp trước khi ký.
  cancelDraft(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/cancel-draft`,
    });
  },
  // Thanh toán tiền đặt cọc hợp đồng, dùng khi doanh nghiệp thanh toán tiền đặt cọc cho hợp đồng.
  payDeposit(contractId: number) {
    return call<PaymentActionResponse<ContractDeposit>>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/deposit/pay`,
    });
  },
  // Thanh toán tiền đặt cọc cho chuyên gia, dùng khi doanh nghiệp thanh toán tiền đặt cọc cho chuyên gia.
  payExpertDeposit(contractId: number) {
    return call<PaymentActionResponse<ContractDeposit>>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/expert-deposit/pay`,
    });
  },
  // Hoàn tiền tiền đặt cọc hợp đồng, dùng khi doanh nghiệp hoàn tiền cho hợp đồng.
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
  // Yêu cầu chấm dứt hợp đồng ngay lập tức, dùng khi chuyên gia hoặc doanh nghiệp yêu cầu chấm dứt hợp đồng ngay lập tức.
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
  // Yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp yêu cầu chấm dứt hợp đồng.
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
  // Lấy danh sách yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp muốn xem danh sách yêu cầu chấm dứt hợp đồng.
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

  // Tranh chấp yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp muốn tranh chấp yêu cầu chấm dứt hợp đồng.
  disputeTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/dispute`,
      params: { reason },
    });
  },
  // Chấp nhận yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp chấp nhận yêu cầu chấm dứt hợp đồng.
  acceptTerminationRequest(terminationRequestId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/accept`,
    });
  },
  // Giao yêu cầu chấm dứt hợp đồng cho nhân viên xử lý, dùng khi admin giao yêu cầu chấm dứt hợp đồng cho nhân viên xử lý.
  assignTerminationStaff(terminationRequestId: number, staffId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/assign-staff`,
      params: { staffId },
    });
  },
  // Từ chối yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp từ chối yêu cầu chấm dứt hợp đồng.
  rejectTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/reject`,
      params: { reason },
    });
  },
  // Chấp thuận yêu cầu chấm dứt hợp đồng, dùng khi admin chấp thuận yêu cầu chấm dứt hợp đồng.
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
  // Thực hiện chấm dứt hợp đồng, dùng khi admin thực hiện chấm dứt hợp đồng.
  executeTerminationSettlement(terminationRequestId: number) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/execute-settlement`,
    });
  },
  // Rút lại yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp rút lại yêu cầu chấm dứt hợp đồng.
  withdrawTerminationRequest(terminationRequestId: number, reason?: string) {
    return call<TerminationRequest>({
      method: "POST",
      url: `/api/v1/termination-requests/${terminationRequestId}/withdraw`,
      params: { reason },
    });
  },
  // Hoàn tiền tiền đặt cọc cho yêu cầu chấm dứt hợp đồng, dùng khi admin hoàn tiền cho yêu cầu chấm dứt hợp đồng.
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
  // Lấy danh sách file đính kèm của yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp muốn xem danh sách file đính kèm của yêu cầu chấm dứt hợp đồng.
  listCaseAttachments(ownerType: string, ownerId: number) {
    return call<CaseAttachment[]>({
      method: "GET",
      url: "/api/v1/case-attachments",
      params: { ownerType, ownerId },
    });
  },
  // Tạo file đính kèm của yêu cầu chấm dứt hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp muốn tạo file đính kèm của yêu cầu chấm dứt hợp đồng.
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
  // Tạo milestone độc lập khi backend cần lưu các mốc công việc của Job/hợp đồng.
  createMilestone(payload: Partial<Milestone>) {
    return call<Milestone>({
      method: "POST",
      url: "/api/v1/milestones",
      data: payload,
    });
  },
  createJobMilestone(jobId: number, payload: Partial<Milestone>) {
    return call<Milestone>({ method: "POST", url: `/api/v1/jobs/${jobId}/milestones`, data: payload });
  },
  // Lấy danh sách milestone thuộc hợp đồng, dùng khi chuyên gia hoặc doanh nghiệp muốn xem danh sách milestone thuộc hợp đồng.
  listMilestones(contractId: number) {
    return call<Milestone[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/milestones`,
    });
  },
  // Lấy milestone thuộc Job để xem chi tiết Job, chỉnh sửa Job hoặc đề xuất lại ngân sách trong proposal.
  listJobMilestones(jobId: number) {
    return call<Milestone[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/milestones`, //Lấy danh sách tất cả các mốc tiến dộ
    });
  },
  // Tạo tiêu chí chấp nhận (Acceptance Criteria) cho milestone, dùng khi chuyên gia hoặc doanh nghiệp muốn tạo tiêu chí chấp nhận cho milestone.
  createCriteria(milestoneId: number, payload: Partial<AcceptanceCriteria>) {
    return call<AcceptanceCriteria>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/criteria`,
      data: payload,
    });
  },
  // Cập nhật tiêu chí chấp nhận (Acceptance Criteria) cho milestone, dùng khi chuyên gia hoặc doanh nghiệp muốn cập nhật tiêu chí chấp nhận cho milestone.
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
  submitDeliverable(contractId: number, milestoneId: number, payload: Partial<Deliverable>) {
    return call<Deliverable>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/deliverables`,
      data: payload,
    });
  },
  uploadMilestoneSourceCode(contractId: number, milestoneId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/source-code-file`,
      data: formData,
      timeout: 60000,
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
  approveMilestone(contractId: number, milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`,
    });
  },
  rejectMilestone(contractId: number, milestoneId: number, payload: { reason?: string; failedCriteria?: { criteriaId: number; reason: string }[] }) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/reject`,
      data: payload,
    });
  },
  completeMilestone(milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/complete`,
    });
  },
  updateMilestone(jobId: number, milestoneId: number, payload: Partial<Milestone>) {
    return call<Milestone>({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}/milestones/${milestoneId}`,
      data: payload,
    });
  },
  createChangeRequest(contractId: number, payload: Partial<ContractChangeRequest>) {
    return call<ContractChangeRequest>({ method: "POST", url: `/api/v1/contracts/${contractId}/change-requests`, data: payload });
  },
  listChangeRequests(contractId: number) {
    return call<ContractChangeRequest[]>({ method: "GET", url: `/api/v1/contracts/${contractId}/change-requests` });
  },
  acceptChangeRequest(contractId: number, requestId: number, reviewNote?: string) {
    return call<ContractChangeRequest>({ method: "POST", url: `/api/v1/contracts/${contractId}/change-requests/${requestId}/accept`, data: { reviewNote } });
  },
  rejectChangeRequest(contractId: number, requestId: number, reviewNote?: string) {
    return call<ContractChangeRequest>({ method: "POST", url: `/api/v1/contracts/${contractId}/change-requests/${requestId}/reject`, data: { reviewNote } });
  },
  checkOverdueMilestones(contractId: number) {
    return call<Milestone[]>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/check-overdue`,
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
