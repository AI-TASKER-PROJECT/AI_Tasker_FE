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
  ContractDeposit,
  CreatePayOSPaymentResponse,
  Deliverable,
  Dispute,
  ExpertProfile,
  Job,
  MembershipPackage,
  MembershipPurchase,
  Milestone,
  PaymentActionResponse,
  PaymentOrder,
  Portfolio,
  Proposal,
  Review,
  SessionUser,
  Staff,
  SystemSetting,
  SystemWallet,
  TaxCheckResponse,
  Transaction,
  UserQuota,
  WalletTransaction,
  WithdrawalRequest,
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
  try {
    const response = await api.request<ApiResponse<T>>(config);
    setDataMode("live");
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
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
    return mapApiErrorCode(responseData);
  }

  if (responseData && typeof responseData === "object") {
    if ("message" in responseData && responseData.message) {
      return mapApiErrorCode(String(responseData.message));
    }
    if ("error" in responseData && responseData.error) {
      return mapApiErrorCode(String(responseData.error));
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

function mapApiErrorCode(message: string) {
  const normalized = message.trim().toUpperCase();
  if (normalized === "INSUFFICIENT_BALANCE") {
    return "Số dư khả dụng trong ví không đủ để thực hiện giao dịch này.";
  }
  if (normalized === "CONTRACT_INVALID_STATUS") {
    return "Hợp đồng chưa ở trạng thái cho phép ký quỹ. Cần đủ 2 bên chấp nhận contract và ký NDA trước.";
  }
  if (normalized === "DEPOSIT_ALREADY_HELD") {
    return "Hợp đồng này đã được ký quỹ rồi.";
  }
  if (normalized === "CONTRACT_NOT_FOUND") {
    return "Không tìm thấy hợp đồng.";
  }
  return message;
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

export interface Technology {
  technologyId: number;
  technologyCode: string;
  technologyName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
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

export interface JobTechnology {
  id: { jobId: number; technologyId: number };
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

// ── Expert Recommendation AI ──────────────────────────────────────────────────
export interface ExpertRecommendationResponse {
  expertId: number;
  portfolioId?: number;
  rankPosition: number;
  matchScore?: number;
  matchedSkills?: string[];
  matchedDomains?: string[];
  reason?: string;
}

export interface ExpertRecommendationListResponse {
  jobPostingId: number;
  recommendations: ExpertRecommendationResponse[];
  generatedByAi?: boolean;
  message?: string;
}

export const expertRecommendationApi = {
  /** POST — Gọi AI generate mới, lưu DB và trả kết quả */
  generate(jobPostingId: number) {
    return call<ExpertRecommendationListResponse>({
      method: "POST",
      url: `/api/jobs/${jobPostingId}/expert-recommendations`,
      timeout: 90000,
    });
  },
  /** GET — Lấy danh sách đã lưu (không gọi lại AI) */
  get(jobPostingId: number) {
    return call<ExpertRecommendationListResponse>({
      method: "GET",
      url: `/api/jobs/${jobPostingId}/expert-recommendations`,
    });
  },
};

export const authApi = {
  login(payload: { email: string; password: string }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/login", //login
      data: payload,
    });
  },
  me() {
    return call<Partial<SessionUser>>({
      method: "GET",
      url: "/api/auth/me",//Check access token
    });
  },
  checkEmail(email: string) {
    return api
      .get<boolean>("/api/auth/check-email", { params: { email } }) //Check email
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
      url: "/api/v1/profiles/business",//Cập nhật hô sơ DN
      data: payload,
    });
  },
  getMyBusiness() {
    return call<BusinessProfile>({
      method: "GET",
      url: "/api/v1/profiles/business/me", //lấy thông tin business hiện tại dựa trên access token
    });
  },
  uploadBusinessLicense(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/business/license-file", //cập nhật GPKD
      data: formData,
    });
  },
  upsertExpert(payload: Partial<ExpertProfile>) {
    return call<ExpertProfile>({
      method: "POST",
      url: "/api/v1/profiles/expert",//cập nhật hồ sơ CG
      data: payload,
    });
  },
  getMyExpert() {
    return call<ExpertProfile>({
      method: "GET",
      url: "/api/v1/profiles/expert/me", //lấy thông tin expert dựa trên access token
    });
  },
  uploadExpertPortfolio(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/expert/portfolio-file", //cập nhật hồ sơ năng lực
      data: formData,
    });
  },
  upsertPortfolio(payload: Partial<Portfolio>) {
    return call<Portfolio>({
      method: "POST",
      url: "/api/v1/profiles/portfolio", //cập nhật thêm hồ sơ năng lực trên nền tảng
      data: payload,
    });
  },
  getMyPortfolio() {
    return call<Portfolio>({
      method: "GET",
      url: "/api/v1/profiles/portfolio/me",//lấy thông tin portfolio
    });
  },
  uploadExpertCertificate(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/profiles/portfolio/certificate-file",//cập nhật chứng chỉ
      data: formData,
    });
  },
  uploadProposalFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return call<string>({
      method: "POST",
      url: "/api/v1/proposals/file",//cập nhật file đề xuất
      data: formData,
    });
  },
  listBusinesses() {
    return call<BusinessProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/business",//lấy ra danh sách DN
    });
  },
  getBusinessByJob(jobId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/by-job/${jobId}`,//Lấy ra DN dựa trên jobId
    });
  },
  getBusinessById(businessId: number) {
    return call<BusinessProfile>({
      method: "GET",
      url: `/api/v1/profiles/business/${businessId}`,
    });
  },
  listBusinessJobs(businessId: number) {
    return call<Job[]>({
      method: "GET",
      url: `/api/v1/profiles/business/${businessId}/jobs`,
    });
  },
  listExperts() {
    return call<ExpertProfile[]>({
      method: "GET",
      url: "/api/v1/profiles/expert", //lấy ra danh sách hồ sơ
    });
  },
  getExpertById(expertId: number) {
    return call<ExpertProfile>({
      method: "GET",
      url: `/api/v1/profiles/expert/${expertId}`,
    });
  },
  listPortfolios() {
    return call<Portfolio[]>({
      method: "GET",
      url: "/api/v1/profiles/portfolio",//lấy ra ds portfolio
    });
  },
  getPortfolioByExpert(expertId: number) {
    return call<Portfolio>({
      method: "GET",
      url: `/api/v1/profiles/portfolio/by-expert/${expertId}`,
    });
  },
  getFileViewUrl(path: string) {
    return call<string>({
      method: "GET",
      url: "/api/v1/profiles/files/view-url",//lấy ra file 
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
      url: `/api/v1/profiles/approve/${type}/${profileId}`,//cập nhật trạng thái cho user
      params: { status, reason },
    });
  },
  async checkTaxCode(taxCode: string) {
    const response = await api.request<
      TaxCheckResponse | ApiResponse<TaxCheckResponse>
    >({
      method: "GET",
      url: `/api/auth/tax-check/${encodeURIComponent(taxCode)}`,//lấy mã số thuế để check
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
      url: "/api/v1/domains", //lấy list lĩnh vực
      params: { activeOnly },
    });
  },
  createDomain(payload: Partial<Domain>) {
    return call<Domain>({
      method: "POST",
      url: "/api/v1/domains",//cập nhật list lĩnh vực
      data: payload,
    });
  },
  updateDomain(domainId: number, payload: Partial<Domain>) {
    return call<Domain>({
      method: "PATCH",
      url: `/api/v1/domains/${domainId}`, //chỉ cập nhật 1 domain
      data: payload,
    });
  },
  listSkills(activeOnly = true) {
    return call<Skill[]>({
      method: "GET",
      url: "/api/v1/skills", //lấy list skill
      params: { activeOnly },
    });
  },
  createSkill(payload: Partial<Skill>) {
    return call<Skill>({
      method: "POST",
      url: "/api/v1/skills", //cập nhật list slill
      data: payload,
    });
  },
  updateSkill(skillId: number, payload: Partial<Skill>) {
    return call<Skill>({
      method: "PATCH",
      url: `/api/v1/skills/${skillId}`, //cập nhật 1 skill
      data: payload,
    });
  },
  listTechnologies(activeOnly = true) {
    return call<Technology[]>({
      method: "GET",
      url: "/api/v1/technologies",//lấy ds CN
      params: { activeOnly },
    });
  },
  listAcceptanceCriteria(activeOnly = true) {
    return call<AcceptanceCriteria[]>({
      method: "GET",
      url: "/api/v1/acceptance-criteria",//lấy ds nghiệm thu
      params: { activeOnly },
    });
  },
  listJobDomains(jobId: number) {
    return call<JobDomain[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/domains`, //lấy ds JobDomain dựa trên jobId
    });
  },
  replaceJobDomains(jobId: number, domainIds: number[]) {
    return call<JobDomain[]>({
      method: "PUT",
      url: `/api/v1/jobs/${jobId}/domains`,//cập nhật 1 JobDomains dựa trên jobId
      data: domainIds,
    });
  },
  listJobSkills(jobId: number) {
    return call<JobSkill[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/skills`,//lấy ra ds JobSkill dựa trên JobId
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
      url: `/api/v1/jobs/${jobId}/skills`,//cập nhật 1 JobSkill dựa trên jobId
      data: assignments,
    });
  },
  listJobTechnologies(jobId: number) {
    return call<JobTechnology[]>({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/technologies`,//lấy ra ds tech dựa trên jobId
    });
  },
};

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
      url: "/api/v1/proposals",//cập nhật toàn bộ info proposal để gửi lại backend
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
      url: `/api/v1/jobs/${jobId}/milestones`, //Lấy danh sách tất cả các mốc tiến độ
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
    return call<SystemWallet>({ method: "GET", url: "/api/v1/wallet/me" });//lấy ra số dư ví
  },
};

export const paymentApi = {
  createWalletTopup(payload: { amount: number; description: string }) {
    return call<CreatePayOSPaymentResponse>({
      method: "POST",
      url: "/api/payments/payos/create",//cập nhât số dư ví
      data: payload,
    });
  },
  syncWalletTopup(orderCode: number) {
    return call<PaymentOrder>({
      method: "POST",
      url: `/api/payments/payos/${orderCode}/sync`,//đồng bộ 
    });
  },
};

export const walletTransactionApi = {
  list() {
    return call<WalletTransaction[]>({
      method: "GET",
      url: "/api/wallet/transactions",
    });
  },
};

export const membershipApi = {
  listPackages() {
    return call<MembershipPackage[]>({
      method: "GET",
      url: "/api/membership/packages",
    });
  },
  purchasePackage(packageId: number) {
    return call<PaymentActionResponse<MembershipPurchase>>({
      method: "POST",
      url: `/api/membership/packages/${packageId}/purchase`,
    });
  },
};

export const creditApi = {
  purchaseJobPost(quantity: number) {
    return call<PaymentActionResponse<UserQuota>>({
      method: "POST",
      url: "/api/credits/job-post/purchase",
      data: { quantity },
    });
  },
  purchaseProposal(quantity: number) {
    return call<PaymentActionResponse<UserQuota>>({
      method: "POST",
      url: "/api/credits/proposal/purchase",
      data: { quantity },
    });
  },
};

export const withdrawalApi = {
  create(payload: { amount: number; bankName: string; bankAccountNumber: string; bankAccountHolder: string }) {
    return call<PaymentActionResponse<WithdrawalRequest>>({
      method: "POST",
      url: "/api/v1/withdrawal-requests",
      data: payload,
    });
  },
  listMy() {
    return call<WithdrawalRequest[]>({
      method: "GET",
      url: "/api/v1/withdrawal-requests",
    });
  },
  listAll() {
    return call<WithdrawalRequest[]>({
      method: "GET",
      url: "/api/v1/admin/withdrawal-requests",
    });
  },
  approve(withdrawalId: number, adminNote?: string) {
    return call<WithdrawalRequest>({
      method: "POST",
      url: `/api/v1/admin/withdrawal-requests/${withdrawalId}/approve`,
      data: adminNote ? { adminNote } : undefined,
    });
  },
  reject(withdrawalId: number, adminNote?: string) {
    return call<WithdrawalRequest>({
      method: "POST",
      url: `/api/v1/admin/withdrawal-requests/${withdrawalId}/reject`,
      data: adminNote ? { adminNote } : undefined,
    });
  },
};

export const userQuotaApi = {
  getCurrent() {
    return call<UserQuota>({
      method: "GET",
      url: "/api/users/me/quota",
    });
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
