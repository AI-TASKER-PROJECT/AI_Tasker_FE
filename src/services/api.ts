import axios, { type AxiosRequestConfig } from "axios";
import type {
  AcceptanceCriteria,
  AdminAccount,
  AnalyticsOverview,
  ApiResponse,
  AuditLog,
  BusinessProfile,
  Contract,
  ContractChangeRequest,
  Deliverable,
  Dispute,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
  Review,
  SessionUser,
  Staff,
  SystemSetting,
  SystemWallet,
  TaxCheckResponse,
  Transaction,
  NotificationItem,
  UnreadNotificationCount,
} from "../types";
import { getSession } from "../context/sessionContext";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

function setDataMode(mode: "live") {
  localStorage.setItem("aitasker.data-mode", mode);
  window.dispatchEvent(new Event("aitasker:data-mode-change"));
}

async function call<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<ApiResponse<T>>(config);
  setDataMode("live");
  return response.data.data;
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Đã có lỗi không xác định.";
  }

  if (error.code === "ECONNABORTED") {
    return "Request bị quá thời gian chờ. Generate SoW có thể mất lâu hơn bình thường do backend đang gọi AI.";
  }

  const status = error.response?.status;
  const responseData = error.response?.data as
    | Partial<ApiResponse<unknown>>
    | { error?: string }
    | string
    | undefined;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    if ("message" in responseData && responseData.message) {
      return String(responseData.message);
    }
    if ("error" in responseData && responseData.error) {
      return String(responseData.error);
    }
  }

  if (status === 401) {
    return "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
  }
  if (status === 403) {
    return "Tài khoản hiện tại không có quyền gọi chức năng này.";
  }
  if (status === 502) {
    return "Backend không gọi được AI API hoặc OPENAI_API_KEY chưa được cấu hình đúng.";
  }
  if (status) {
    return `Backend trả lỗi HTTP ${status}.`;
  }

  return "Không kết nối được backend. Vui lòng kiểm tra server backend hoặc VITE_API_BASE_URL.";
}

export interface Domain {
  domainId: number;
  domainCode: string;
  domainName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  skillId: number;
  skillCode: string;
  skillName: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobDomain {
  id: { jobId: number; domainId: number };
  createdAt?: string;
}

export interface JobSkill {
  id: { jobId: number; skillId: number };
  isMandatory: boolean;
  createdAt?: string;
}

export interface GenerateSowRequest {
  projectTitle: string;
  rawRequirement: string;
  budget: number;
  duration: number;
  durationUnit: string;
  supportFields?: string[];
  requiredSkills?: string[];
}

export interface GeneratedSow {
  title?: string;
  overview?: string;
  objectives?: string[];
  scopeOfWork?: string[];
  deliverables?: string[];
  assumptions?: string[];
  outOfScope?: string[];
}

export interface GeneratedSowMilestone {
  name?: string;
  description?: string;
  duration?: number;
  durationUnit?: string;
  budget?: number;
}

export interface GenerateSowResponse {
  needMoreInfo?: boolean;
  questions?: string[];
  sow?: GeneratedSow;
  milestones?: GeneratedSowMilestone[];
}

export interface ChatbotResponse {
  answer: string;
  sources: string[];
}

export const chatbotApi = {
  ask(question: string) {
    return api
      .post<ChatbotResponse>('/api/chatbot/ask', { question })
      .then((response) => response.data);
  },
};

export const sowApi = {
  generate(payload: GenerateSowRequest) {
    return api
      .post<GenerateSowResponse>("/api/jobs/generate-sow", payload, {
        timeout: 60000,
      })
      .then((response) => {
        setDataMode("live");
        return response.data;
      });
  },
};

export const authApi = {
  login(payload: { email: string; password: string }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/login",
      data: payload,
    });
  },
  me() {
    return call<Partial<SessionUser>>({
      method: "GET",
      url: "/api/auth/me",
    });
  },
  checkEmail(email: string) {
    return api
      .get<boolean>("/api/auth/check-email", { params: { email } })
      .then((response) => response.data);
  },
  sendOtp(payload: { email: string }) {
    //return call<void>({ method: 'POST', url: '/api/auth/email/send-otp', data: payload });
    return call<{ expiresIn: number }>({
      method: "POST",
      url: "/api/auth/email/send-otp",
      data: payload,
    });
  },
  verifyOtp(payload: { email: string; otp: string }) {
    return call<void>({
      method: "POST",
      url: "/api/auth/email/verify-otp",
      data: payload,
    });
  },
  register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: "BUSINESS" | "EXPERT";
  }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/register",
      data: payload,
    });
  },
  googleSignup(payload: {
    credential: string;
    fullName?: string;
    phone: string;
    role: "BUSINESS" | "EXPERT";
  }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/google/register",
      data: payload,
    });
  },
};

export const profileApi = {
  upsertBusiness(payload: Partial<BusinessProfile>) {
    return call<BusinessProfile>({
      method: "POST",
      url: "/api/v1/profiles/business",
      data: payload,
    });
  },
  getMyBusiness() {
    return call<BusinessProfile>({
      method: "GET",
      url: "/api/v1/profiles/business/me",
    });
  },
  uploadBusinessLicense(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/business/license-file",
      data: formData,
    });
  },
  upsertExpert(payload: Partial<ExpertProfile>) {
    return call<ExpertProfile>({
      method: "POST",
      url: "/api/v1/profiles/expert",
      data: payload,
    });
  },
  getMyExpert() {
    return call<ExpertProfile>({
      method: "GET",
      url: "/api/v1/profiles/expert/me",
    });
  },
  uploadExpertPortfolio(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/expert/portfolio-file",
      data: formData,
    });
  },
  upsertPortfolio(payload: Partial<Portfolio>) {
    return call<Portfolio>({
      method: "POST",
      url: "/api/v1/profiles/portfolio",
      data: payload,
    });
  },
  getMyPortfolio() {
    return call<Portfolio>({
      method: "GET",
      url: "/api/v1/profiles/portfolio/me",
    });
  },
  uploadExpertCertificate(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/portfolio/certificate-file",
      data: formData,
    });
  },
  listBusinesses() {
    return call<BusinessProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/business",
    });
  },
  getBusinessByJob(jobId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/by-job/${jobId}`,
    });
  },
  listExperts() {
    return call<ExpertProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/expert",
    });
  },
  listPortfolios() {
    return call<Portfolio[]>({
      method: "GET",
      url: "/api/v1/profiles/portfolio",
    });
  },
  getFileViewUrl(path: string) {
    return call<string>({
      method: "GET",
      url: "/api/v1/profiles/files/view-url",
      params: { path },
    });
  },
  approve(
    type: "BUSINESS" | "EXPERT",
    profileId: number,
    status: "Approved" | "Rejected",
    reason?: string,
  ) {
    return call<BusinessProfile | ExpertProfile>({
      method: "POST",
      url: `/api/v1/profiles/approve/${type}/${profileId}`,
      params: { status, reason },
    });
  },
  async checkTaxCode(taxCode: string) {
    const response = await api.request<
      TaxCheckResponse | ApiResponse<TaxCheckResponse>
    >({
      method: "GET",
      url: `/api/auth/tax-check/${encodeURIComponent(taxCode)}`,
    });
    const body = response.data;
    setDataMode("live");
    if (
      body &&
      typeof body === "object" &&
      "data" in body &&
      "success" in body
    ) {
      return (body as ApiResponse<TaxCheckResponse>).data;
    }
    return body as TaxCheckResponse;
  },
};

export const catalogApi = {
  listDomains(activeOnly = true) {
    return call<Domain[]>({
      method: "GET",
      url: "/api/v1/domains",
      params: { activeOnly },
    });
  },
  createDomain(payload: Partial<Domain>) {
    return call<Domain>({
      method: "POST",
      url: "/api/v1/domains",
      data: payload,
    });
  },
  updateDomain(domainId: number, payload: Partial<Domain>) {
    return call<Domain>({
      method: "PATCH",
      url: `/api/v1/domains/${domainId}`,
      data: payload,
    });
  },
  listSkills(activeOnly = true) {
    return call<Skill[]>({
      method: "GET",
      url: "/api/v1/skills",
      params: { activeOnly },
    });
  },
  createSkill(payload: Partial<Skill>) {
    return call<Skill>({
      method: "POST",
      url: "/api/v1/skills",
      data: payload,
    });
  },
  updateSkill(skillId: number, payload: Partial<Skill>) {
    return call<Skill>({
      method: "PATCH",
      url: `/api/v1/skills/${skillId}`,
      data: payload,
    });
  },
  listAcceptanceCriteria(activeOnly = true) {
    return call<AcceptanceCriteria[]>({
      method: "GET",
      url: "/api/v1/acceptance-criteria",
      params: { activeOnly },
    });
  },
  listJobDomains(jobId: number) {
    return call<JobDomain[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/domains`,
    });
  },
  replaceJobDomains(jobId: number, domainIds: number[]) {
    return call<JobDomain[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/domains`,
      data: domainIds,
    });
  },
  listJobSkills(jobId: number) {
    return call<JobSkill[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/skills`,
    });
  },
  replaceJobSkills(
    jobId: number,
    assignments: Array<{
      skillId: number;
      isMandatory?: boolean;
    }>,
  ) {
    return call<JobSkill[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/skills`,
      data: assignments,
    });
  },
};

export const marketplaceApi = {
  listJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs" });
  },
  listMyJobs() {
    return call<Job[]>({ method: "GET", url: "/api/v1/jobs/my" });
  },
  getJob(jobId: number) {
    return call<Job>({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  },
  createJob(payload: Partial<Job>) {
    return call<Job>({ method: "POST", url: "/api/v1/jobs", data: payload });
  },
  updateJobStatus(jobId: number, status: string) {
    return call<Job>({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}/status`,
      params: { status },
    });
  },
  submitProposal(payload: Partial<Proposal>) {
    return call<Proposal>({
      method: "POST",
      url: "/api/v1/proposals",
      data: payload,
    });
  },
  listProposals(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/proposals`,
    });
  },
  listMyProposals() {
    return call<Proposal[]>({ method: "GET", url: "/api/v1/proposals/my" });
  },
  reviewProposal(proposalId: number, status: "Accepted" | "Rejected") {
    return call<Proposal>({
      method: "PATCH",
      url: `/api/v1/proposals/${proposalId}/status`,
      params: { status },
    });
  },
  matching(jobId: number) {
    return call<Proposal[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/matching`,
    });
  },
};

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
  requestChange(payload: Partial<ContractChangeRequest>) {
    return call<ContractChangeRequest>({
      method: "POST",
      url: "/api/v1/contracts/change-requests",
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
      url: `/api/v1/jobs/${jobId}/milestones`,
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
  runSlaAutoApprove() {
    return call<Milestone[]>({
      method: "POST",
      url: "/api/v1/milestones/sla-auto-approve",
    });
  },
};

export const financeApi = {
  createTransaction(payload: Partial<Transaction>) {
    return call<Transaction>({
      method: "POST",
      url: "/api/v1/transactions",
      data: payload,
    });
  },
  listTransactions(milestoneId: number) {
    return call<Transaction[]>({
      method: "GET",
      url: `/api/v1/milestones/${milestoneId}/transactions`,
    });
  },
  updateTransactionStatus(transactionId: number, status: string) {
    return call<Transaction>({
      method: "PATCH",
      url: `/api/v1/transactions/${transactionId}/status`,
      params: { status },
    });
  },
  paymentWebhook(
    transactionId: number,
    paymentStatus: "Success" | "Failed",
    bankTxCode?: string,
    receiptImgUrl?: string,
  ) {
    return call<Transaction>({
      method: "POST",
      url: `/api/v1/transactions/${transactionId}/webhook`,
      params: { paymentStatus, bankTxCode, receiptImgUrl },
    });
  },
};

export const walletApi = {
  current() {
    return call<SystemWallet>({ method: "GET", url: "/api/v1/wallet/me" });
  },
};

export const disputeApi = {
  create(payload: Partial<Dispute>) {
    return call<Dispute>({
      method: "POST",
      url: "/api/v1/disputes",
      data: payload,
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

export const adminApi = {
  createReview(payload: Partial<Review>) {
    return call<Review>({
      method: "POST",
      url: "/api/v1/admin/reviews",
      data: payload,
    });
  },
  listReviews(contractId: number) {
    return call<Review[]>({
      method: "GET",
      url: `/api/v1/admin/reviews/contracts/${contractId}`,
    });
  },
  listSettings() {
    return call<SystemSetting[]>({
      method: "GET",
      url: "/api/v1/admin/settings",
    });
  },
  updateSetting(settingKey: string, value?: string, isActive?: boolean) {
    return call<SystemSetting>({
      method: "PATCH",
      url: `/api/v1/admin/settings/${settingKey}`,
      params: { value, isActive },
    });
  },
  listStaffs() {
    return call<Staff[]>({ method: "GET", url: "/api/v1/admin/staffs" });
  },
  createStaff(payload: Partial<Staff>) {
    return call<Staff>({
      method: "POST",
      url: "/api/v1/admin/staffs",
      data: payload,
    });
  },
  updateStaff(staffId: number, payload: Partial<Staff>) {
    return call<Staff>({
      method: "PATCH",
      url: `/api/v1/admin/staffs/${staffId}`,
      data: payload,
    });
  },
  analyticsOverview() {
    return call<AnalyticsOverview>({
      method: "GET",
      url: "/api/v1/admin/analytics/overview",
    });
  },
  getSystemWallet() {
    return call<SystemWallet>({ method: "GET", url: "/api/v1/admin/wallet" });
  },
  syncSystemWallet() {
    return call<SystemWallet>({
      method: "POST",
      url: "/api/v1/admin/wallet/sync",
    });
  },
  listAccounts() {
    return call<AdminAccount[]>({
      method: "GET",
      url: "/api/v1/admin/accounts",
    });
  },
  createAccount(payload: Partial<AdminAccount> & { password?: string }) {
    return call<AdminAccount>({
      method: "POST",
      url: "/api/v1/admin/accounts",
      data: payload,
    });
  },
  updateAccount(
    accountId: number,
    payload: Partial<AdminAccount> & { password?: string },
  ) {
    return call<AdminAccount>({
      method: "PATCH",
      url: `/api/v1/admin/accounts/${accountId}`,
      data: payload,
    });
  },
  setAccountStatus(accountId: number, status: AdminAccount["status"]) {
    return call<AdminAccount>({
      method: "PATCH",
      url: `/api/v1/admin/accounts/${accountId}/status`,
      params: { status },
    });
  },
  setAccountActive(accountId: number, active: boolean) {
    return call<AdminAccount>({
      method: "PATCH",
      url: `/api/v1/admin/accounts/${accountId}/active`,
      params: { active },
    });
  },
  auditLogs(actorGroup?: AuditLog["actorGroup"]) {
    return call<AuditLog[]>({
      method: "GET",
      url: "/api/v1/admin/audit-logs",
      params: { actorGroup },
    });
  },
};

export const notificationApi = {
  list() {
    return call<NotificationItem[]>({
      method: "GET",
      url: "/api/v1/notifications",
    });
  },
  unreadCount() {
    return call<UnreadNotificationCount>({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
    });
  },
  markRead(notificationId: number) {
    return call<NotificationItem>({
      method: "PATCH",
      url: `/api/v1/notifications/${notificationId}/read`,
    });
  },
  markAllRead() {
    return call<NotificationItem[]>({
      method: "PATCH",
      url: "/api/v1/notifications/read-all",
    });
  },
};
