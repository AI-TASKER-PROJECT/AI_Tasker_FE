import { call } from "./apiClient";
import type {
  AdminDisputeListResponse,
  CaseAttachment,
  Dispute,
  StaffAssignmentCandidate,
  StaffDisputeListResponse,
} from "../types";

export const disputeApi = {

  // Tạo hồ sơ tranh chấp mới cho một milestone trong hợp đồng.
  // Chức năng 1: Tạo hồ sơ tranh chấp mới cho một milestone trong hợp đồng.
  create(payload: Partial<Dispute>) {
    if (!payload.contractId || !payload.milestoneId) {
      return Promise.reject(
        new Error("Backend yeu cau contractId va milestoneId de tao dispute."),
      );
    }
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/contracts/${payload.contractId}/milestones/${payload.milestoneId}/disputes`,
      params: {
        initiatedBy: payload.initiatedBy,
        initiationType: payload.initiationType || "OTHER",
        reason: payload.evidenceReport,
      },
    });
  },
  // Khởi tạo nhanh tranh chấp khi chỉ có contractId, milestoneId và bên khởi tạo.
  // Chức năng 2: Khởi tạo nhanh tranh chấp khi đã có contractId và milestoneId.
  initiate(contractId: number, milestoneId: number, initiatedBy: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/milestones/${milestoneId}/disputes`,
      params: { initiatedBy },
    });
  },
  // Lấy toàn bộ tranh chấp thuộc một hợp đồng để hiển thị trong workspace và danh sách của user.
  // Chức năng 3: Lấy toàn bộ tranh chấp thuộc một hợp đồng.
  listByContract(contractId: number) {
    return call<Dispute[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/disputes`,
    });
  },
  // Lấy danh sách tranh chấp toàn hệ thống cho Admin, có hỗ trợ lọc và phân trang.
  // Chức năng 4: Lấy danh sách tranh chấp toàn hệ thống cho Admin.
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
  // Lấy danh sách tranh chấp được phân công/phù hợp với Staff hiện tại.
  // Chức năng 5: Lấy danh sách tranh chấp được phân công hoặc phù hợp với Staff hiện tại.
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
  // Lấy chi tiết một hồ sơ tranh chấp để mở màn xử lý.
  // Chức năng 6: Lấy chi tiết một hồ sơ tranh chấp để mở màn xử lý.
  get(disputeId: number) {
    return call<Dispute>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}`,
    });
  },
  // Gán Staff xử lý tranh chấp, có thể truyền staffId hoặc để backend tự chọn.
  // Chức năng 7: Gán Staff xử lý tranh chấp hoặc để backend tự chọn Staff phù hợp.
  routeStaff(disputeId: number, staffId?: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/route-staff`,
      params: { staffId },
    });
  },
  // Gửi quyết định của Staff, gồm tỷ lệ tiền trả cho Expert, ghi chú và báo cáo kỹ thuật.
  // Chức năng 8: Gửi quyết định xử lý tranh chấp của Staff.
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
  // Thực hiện quyết toán sau khi Staff đã ra quyết định phân bổ tiền.
  // Chức năng 9: Thực hiện quyết toán tiền sau khi Staff đã ra quyết định.
  executeSettlement(disputeId: number) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/execute-settlement`,
    });
  },
  // Lấy danh sách Staff phù hợp để Admin xem hoặc gán xử lý tranh chấp.
  // Chức năng 10: Lấy danh sách Staff phù hợp để Admin xem hoặc gán xử lý.
  staffCandidates(disputeId: number) {
    return call<StaffAssignmentCandidate[]>({
      method: "GET",
      url: `/api/v1/disputes/${disputeId}/staff-candidates`,
    });
  },
  // Lấy danh sách bằng chứng đã được các bên thêm vào hồ sơ tranh chấp.
  // Chức năng 11: Lấy danh sách bằng chứng đã thêm vào hồ sơ tranh chấp.
  listEvidence(disputeId: number) {
    return call<CaseAttachment[]>({
      method: "GET",
      url: "/api/v1/case-attachments",
      params: { ownerType: "DISPUTE", ownerId: disputeId },
    });
  },
  // Thêm bằng chứng mới vào hồ sơ tranh chấp để Staff có dữ liệu đánh giá.
  // Chức năng 12: Thêm bằng chứng mới vào hồ sơ tranh chấp.
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
  // Gửi yêu cầu Staff can thiệp, chuyển dispute từ tự xử lý sang hàng đợi Staff.
  // Chức năng 13: Gửi yêu cầu Staff can thiệp và chuyển tranh chấp sang hàng đợi Staff.
  escalate(disputeId: number, reason?: string, evidenceFile?: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/escalation-request`,
      params: { reason, evidenceFile },
    });
  },
  // Rút hồ sơ tranh chấp khi chưa có Staff xử lý hoặc chưa cần can thiệp nữa.
  // Chức năng 14: Rút hồ sơ tranh chấp khi chưa cần Staff can thiệp hoặc chưa có Staff xử lý.
  cancel(disputeId: number, reason?: string) {
    return call<Dispute>({
      method: "POST",
      url: `/api/v1/disputes/${disputeId}/cancel`,
      params: { reason },
    });
  },
  // Kích hoạt kiểm tra/quá hạn SLA xử lý tranh chấp của Staff.
  // Chức năng 15: Kích hoạt kiểm tra hoặc đánh dấu quá hạn SLA xử lý tranh chấp của Staff.
  escalateStaffSla() {
    return call<Dispute[]>({
      method: "POST",
      url: "/api/v1/disputes/staff-sla-escalate",
    });
  },
  // Placeholder cho chức năng test demo tranh chấp, hiện backend chưa hỗ trợ endpoint này.
  // Chức năng 16: Placeholder cho chức năng demo testing tranh chấp khi backend chưa có endpoint.
  demoTesting(disputeId: number, testResult: string) {
    void disputeId;
    void testResult;
    return Promise.reject(
      new Error("Backend hien khong expose API demo-testing cho dispute."),
    );
  },
};
