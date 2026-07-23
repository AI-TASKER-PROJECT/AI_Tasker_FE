import { call } from "./apiClient";
import type { Job, Proposal } from "../types";

export const marketplaceApi = {
  // Lấy danh sách Job để chuyên gia xem cơ hội và chọn Job muốn nộp proposal.
  // Chức năng 1: Lấy danh sách Job để chuyên gia xem cơ hội và chọn Job muốn nộp proposal.
  listJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs" });
  },
  // Lấy các Job thuộc doanh nghiệp hiện tại để hiển thị ở màn quản lý/tạo tiếp.
  // Chức năng 2: Lấy các Job thuộc doanh nghiệp hiện tại để hiển thị ở màn quản lý.
  listMyJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs/my" });
  },
  // Lấy chi tiết một Job để chỉnh sửa, xem chi tiết hoặc nạp thông tin vào form nộp proposal.
  // Chức năng 3: Lấy chi tiết một Job để xem, chỉnh sửa hoặc nạp dữ liệu vào form nộp proposal.
  getJob(jobId: number) {
    return call<Job>({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  },
  // Tạo Job nháp từ payload đã được form chuẩn hóa.
  // Chức năng 4: Tạo Job nháp từ payload đã được form chuẩn hóa.
  createJob(payload: Partial<Job>) {
    return call<Job>({ method: "POST", url: "/api/v1/jobs", data: payload }); //cập nhật ds Job
  },
  // Cập nhật Job nháp khi doanh nghiệp chỉnh sửa lại thông tin trước khi đăng.
  // Chức năng 5: Cập nhật Job nháp khi doanh nghiệp chỉnh sửa thông tin trước khi đăng.
  updateDraftJob(jobId: number, payload: Partial<Job>) {
    return call<Job>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}`,
      data: payload,
    });
  },
  // Đổi trạng thái Job, dùng khi publish Job nháp sang OPEN hoặc đóng Job.
  // Chức năng 6: Đổi trạng thái Job, dùng khi publish Job nháp sang OPEN hoặc đóng Job.
  updateJobStatus(jobId: number, status: string) {
    return call<Job>({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}/status`, //cập nhật status dựa trên JobId
      params: { status },
    });
  },
  // Gửi toàn bộ thông tin proposal của chuyên gia lên backend.
  // Chức năng 7: Gửi toàn bộ thông tin proposal của chuyên gia lên backend.
  submitProposal(payload: Partial<Proposal>) {
    return call<Proposal>({
      method: "POST",
      url: "/api/v1/proposals",
      data: payload,
    });
  },
  updateProposal(proposalId: number, payload: Partial<Proposal>) {
    return call<Proposal>({ method: "PUT", url: `/api/v1/proposals/${proposalId}`, data: payload });
  },
  // Lấy toàn bộ proposal của một Job để doanh nghiệp xem và xét duyệt.
  // Chức năng 8: Lấy toàn bộ proposal của một Job để doanh nghiệp xem và xét duyệt.
  listProposals(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/proposals`,
    });
  },
  // Lấy toàn bộ proposal mà chuyên gia hiện tại đã gửi.
  // Chức năng 9: Lấy toàn bộ proposal mà chuyên gia hiện tại đã gửi.
  listMyProposals() {
    return call<Proposal[]>({ method: "GET", url: "/api/v1/proposals/my" });
  },
  // Cập nhật trạng thái proposal khi doanh nghiệp chấp nhận hoặc từ chối.
  // Chức năng 10: Cập nhật trạng thái proposal khi doanh nghiệp chấp nhận hoặc từ chối.
  reviewProposal(proposalId: number, status: "Accepted" | "Rejected") {
    return call<Proposal>({
      method: "PATCH",
      url: `/api/v1/proposals/${proposalId}/status`,
      params: { status },
    });
  },
  //lấy ra các proposal phù hợp với jobId
  // Chức năng 11: Lấy danh sách proposal phù hợp với Job để hỗ trợ matching.
  matching(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/matching`,
    });
  },
};
