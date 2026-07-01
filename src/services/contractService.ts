import { call } from "./apiClient";
import type { AcceptanceCriteria, Contract, ContractDeposit, Deliverable, Milestone, PaymentActionResponse } from "../types";

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
  activate(contractId: number) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/activate`,
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
  terminate(contractId: number, reason: string) {
    return call<Contract>({
      method: "POST",
      url: `/api/v1/contracts/${contractId}/terminate`,
      params: { reason },
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
  createCriteria(payload: Partial<AcceptanceCriteria>) {
    return call<AcceptanceCriteria>({
      method: "POST",
      url: "/api/v1/criteria",
      data: payload,
    });
  },
  listCriteria(milestoneId: number) {
    return call<AcceptanceCriteria[]>({
      method: "GET",
      url: `/api/v1/milestones/${milestoneId}/criteria`,
    });
  },
  submitDeliverable(payload: Partial<Deliverable>) {
    return call<Deliverable>({
      method: "POST",
      url: "/api/v1/deliverables",
      data: payload,
    });
  },
  listDeliverables(milestoneId: number) {
    return call<Deliverable[]>({
      method: "GET",
      url: `/api/v1/milestones/${milestoneId}/deliverables`,
    });
  },
  completeMilestone(milestoneId: number) {
    return call<Milestone>({
      method: "POST",
      url: `/api/v1/milestones/${milestoneId}/complete`,
    });
  },
  runSlaAutoApprove() {
    return call<Milestone[]>({
      method: "POST",
      url: "/api/v1/milestones/sla-auto-approve",
    });
  },
};
