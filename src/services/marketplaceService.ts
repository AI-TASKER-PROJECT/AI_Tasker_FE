import { call } from "./apiClient";
import type { Job, Proposal } from "../types";

export const marketplaceApi = {
  listJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs" });//lấy ra ds jobs
  },
  listMyJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs/my" });//lấy ra ds Job của user tương ứng
  },
  getJob(jobId: number) {
    return call<Job>({ method: "GET", url: `/api/v1/jobs/${jobId}` }); //lấy info Job dựa trên id tương ứng
  },
  createJob(payload: Partial<Job>) {
    return call<Job>({ method: "POST", url: "/api/v1/jobs", data: payload });//cập nhật ds Job
  },
  updateDraftJob(jobId: number, payload: Partial<Job>) {
    return call<Job>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}`,
      data: payload,
    });
  },
  updateJobStatus(jobId: number, status: string) {
    return call<Job>({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}/status`,//cập nhật status dựa trên JobId
      params: { status },
    });
  },
  submitProposal(payload: Partial<Proposal>) {
    return call<Proposal>({
      method: "POST",
      url: "/api/v1/proposals",//cập nhật toàn bộ info proposal dể gửi lại backend
      data: payload,
    });
  },
  listProposals(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/proposals`,//lấy ra toàn bồ ds proposal của jobId tương ứng
    });
  },
  listMyProposals() {
    return call<Proposal[]>({ method: "GET", url: "/api/v1/proposals/my" });//lấy ds proposal của user hiện có
  },
  reviewProposal(proposalId: number, status: "Accepted" | "Rejected") {
    return call<Proposal>({
      method: "PATCH",
      url: `/api/v1/proposals/${proposalId}/status`, ///cập nhật status proposal dựa trên proposalId
      params: { status },
    });
  },
  matching(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/matching`,//matching dựa trên jobId
    });
  },
};
