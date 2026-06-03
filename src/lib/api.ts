import axios, { type AxiosRequestConfig } from 'axios';
import {
  mockAnalytics,
  mockBusinessProfiles,
  mockContracts,
  mockCriteria,
  mockExperts,
  mockJobs,
  mockMilestones,
  mockPortfolio,
  mockProposals,
  mockReviews,
  mockSettings,
  mockStaffs,
} from '../data/mock';
import type {
  AcceptanceCriteria,
  AnalyticsOverview,
  ApiResponse,
  BusinessProfile,
  Contract,
  ContractChangeRequest,
  Deliverable,
  Dispute,
  ExpertProfile,
  Invoice,
  Job,
  Milestone,
  Portfolio,
  Proposal,
  Review,
  SessionUser,
  Staff,
  SystemSetting,
  Transaction,
} from '../types';
import { getSession } from './session';
import { sleep } from './utils';
import { createGoogleSession, inferRoleFromGoogleEmail } from './googleAuth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const fallbackEnabled = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

function setDataMode(mode: 'live' | 'demo') {
  localStorage.setItem('aitasker.data-mode', mode);
  window.dispatchEvent(new Event('aitasker:data-mode-change'));
}

async function call<T>(config: AxiosRequestConfig, fallback: T): Promise<T> {
  try {
    const response = await api.request<ApiResponse<T>>(config);
    setDataMode('live');
    return response.data.data;
  } catch (error) {
    if (!fallbackEnabled) throw error;
    setDataMode('demo');
    await sleep(220);
    return fallback;
  }
}

let nextId = 20000;
const id = () => nextId++;

export const authApi = {
  login(payload: { email: string; password: string }) {
    const role = payload.email.toLowerCase().includes('admin')
      ? 'ADMIN'
      : payload.email.toLowerCase().includes('staff')
        ? 'STAFF'
        : payload.email.toLowerCase().includes('expert')
          ? 'EXPERT'
          : 'BUSINESS';
    return call<SessionUser>(
      { method: 'POST', url: '/api/auth/login', data: payload },
      {
        accessToken: `demo-${role.toLowerCase()}-token`,
        refreshToken: 'demo-refresh-token',
        role,
        email: payload.email,
        fullName:
          role === 'BUSINESS'
            ? 'Nguyễn Minh Anh'
            : role === 'EXPERT'
              ? 'Trần Hoàng Nam'
              : role === 'ADMIN'
                ? 'Lê Thu Quản Trị'
                : 'Phạm Quốc Huy',
      },
    );
  },
  register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'BUSINESS' | 'EXPERT';
  }) {
    return call<SessionUser>(
      { method: 'POST', url: '/api/auth/register', data: payload },
      {
        accessToken: `demo-${payload.role.toLowerCase()}-token`,
        refreshToken: 'demo-refresh-token',
        role: payload.role,
        email: payload.email,
        fullName: payload.fullName,
      },
    );
  },
  googleLogin(credential: string) {
    const email = createGoogleSession(credential, 'BUSINESS').email;
    const role = inferRoleFromGoogleEmail(email);
    setDataMode('demo');
    return Promise.resolve(createGoogleSession(credential, role));
  },
  googleRegister(credential: string, role: 'BUSINESS' | 'EXPERT') {
    setDataMode('demo');
    return Promise.resolve(createGoogleSession(credential, role));
  },
};

export const profileApi = {
  upsertBusiness(payload: Partial<BusinessProfile>) {
    return call<BusinessProfile>(
      { method: 'POST', url: '/api/v1/profiles/business', data: payload },
      {
        businessId: 1,
        accountId: 10,
        taxCode: payload.taxCode || '',
        companyName: payload.companyName || '',
        address: payload.address,
        businessLicenseUrl: payload.businessLicenseUrl,
        kybStatus: 'Pending',
      },
    );
  },
  upsertExpert(payload: Partial<ExpertProfile>) {
    return call<ExpertProfile>(
      { method: 'POST', url: '/api/v1/profiles/expert', data: payload },
      {
        expertId: 11,
        accountId: 21,
        nationalId: payload.nationalId || '',
        idCardFrontUrl: payload.idCardFrontUrl,
        idCardBackUrl: payload.idCardBackUrl,
        kycStatus: 'Pending',
      },
    );
  },
  upsertPortfolio(payload: Partial<Portfolio>) {
    return call<Portfolio>(
      { method: 'POST', url: '/api/v1/profiles/portfolio', data: payload },
      { ...mockPortfolio, ...payload },
    );
  },
  listBusinesses() {
    return call<BusinessProfile[]>(
      { method: 'GET', url: '/api/v1/profiles/business' },
      mockBusinessProfiles,
    );
  },
  listExperts() {
    return call<ExpertProfile[]>(
      { method: 'GET', url: '/api/v1/profiles/expert' },
      mockExperts,
    );
  },
  listPortfolios() {
    return call<Portfolio[]>(
      { method: 'GET', url: '/api/v1/profiles/portfolio' },
      [mockPortfolio],
    );
  },
  approve(type: 'BUSINESS' | 'EXPERT', profileId: number, status: 'Approved' | 'Rejected') {
    const source = type === 'BUSINESS' ? mockBusinessProfiles[0] : mockExperts[0];
    return call<BusinessProfile | ExpertProfile>(
      {
        method: 'POST',
        url: `/api/v1/profiles/approve/${type}/${profileId}`,
        params: { status },
      },
      { ...source, ...(type === 'BUSINESS' ? { kybStatus: status } : { kycStatus: status }) },
    );
  },
};

export const marketplaceApi = {
  listJobs() {
    return call<Job[]>({ method: 'GET', url: '/api/v1/jobs' }, mockJobs);
  },
  getJob(jobId: number) {
    return call<Job>(
      { method: 'GET', url: `/api/v1/jobs/${jobId}` },
      mockJobs.find((job) => job.jobId === jobId) || mockJobs[0],
    );
  },
  createJob(payload: Partial<Job>) {
    return call<Job>(
      { method: 'POST', url: '/api/v1/jobs', data: payload },
      {
        jobId: id(),
        businessId: 1,
        title: payload.title || '',
        rawRequirements: payload.rawRequirements || '',
        structuredSow: payload.structuredSow,
        aiTag: payload.aiTag,
        budget: payload.budget || 0,
        status: payload.status || 'DRAFT',
        plannedDurationValue: payload.plannedDurationValue,
        plannedDurationUnit: payload.plannedDurationUnit,
      },
    );
  },
  updateJobStatus(jobId: number, status: string) {
    const job = mockJobs.find((item) => item.jobId === jobId) || mockJobs[0];
    return call<Job>(
      { method: 'PATCH', url: `/api/v1/jobs/${jobId}/status`, params: { status } },
      { ...job, status },
    );
  },
  submitProposal(payload: Partial<Proposal>) {
    return call<Proposal>(
      { method: 'POST', url: '/api/v1/proposals', data: payload },
      {
        proposalId: id(),
        jobId: payload.jobId || 0,
        expertId: 11,
        technicalSolution: payload.technicalSolution || '',
        bidAmount: payload.bidAmount || 0,
        status: 'Pending',
      },
    );
  },
  listProposals(jobId: number) {
    return call<Proposal[]>(
      { method: 'GET', url: `/api/v1/jobs/${jobId}/proposals` },
      mockProposals.filter((proposal) => proposal.jobId === jobId),
    );
  },
  reviewProposal(proposalId: number, status: 'Accepted' | 'Rejected') {
    const proposal =
      mockProposals.find((item) => item.proposalId === proposalId) || mockProposals[0];
    return call<Proposal>(
      {
        method: 'PATCH',
        url: `/api/v1/proposals/${proposalId}/status`,
        params: { status },
      },
      { ...proposal, status },
    );
  },
  matching(jobId: number) {
    return call<Proposal[]>(
      { method: 'GET', url: `/api/v1/jobs/${jobId}/matching` },
      mockProposals
        .filter((proposal) => proposal.jobId === jobId)
        .map((proposal, index) => ({ ...proposal, matchScore: proposal.matchScore || 92 - index * 6 })),
    );
  },
};

export const contractApi = {
  listContracts() {
    return call<Contract[]>({ method: 'GET', url: '/api/v1/contracts' }, mockContracts);
  },
  createFromProposal(proposalId: number, payload: Partial<Contract>) {
    const proposal =
      mockProposals.find((item) => item.proposalId === proposalId) || mockProposals[0];
    return call<Contract>(
      {
        method: 'POST',
        url: `/api/v1/contracts/from-proposals/${proposalId}`,
        data: payload,
      },
      {
        contractId: id(),
        jobId: proposal.jobId,
        businessId: 1,
        expertId: proposal.expertId,
        technologyUsed: payload.technologyUsed,
        totalBudget: payload.totalBudget || proposal.bidAmount,
        timelineDays: payload.timelineDays || 60,
        ndaSigned: false,
        status: 'Draft',
      },
    );
  },
  requestChange(payload: Partial<ContractChangeRequest>) {
    return call<ContractChangeRequest>(
      { method: 'POST', url: '/api/v1/contracts/change-requests', data: payload },
      {
        requestId: id(),
        contractId: payload.contractId || 0,
        requestedByAccountId: 21,
        changeType: payload.changeType || 'SCOPE',
        changeSummary: payload.changeSummary || '',
        proposedBudget: payload.proposedBudget,
        proposedTimelineDays: payload.proposedTimelineDays,
        status: 'Pending',
      },
    );
  },
  activate(contractId: number) {
    const contract =
      mockContracts.find((item) => item.contractId === contractId) || mockContracts[0];
    return call<Contract>(
      { method: 'POST', url: `/api/v1/contracts/${contractId}/activate` },
      { ...contract, status: 'Active' },
    );
  },
  signNda(contractId: number) {
    const contract =
      mockContracts.find((item) => item.contractId === contractId) || mockContracts[0];
    return call<Contract>(
      { method: 'POST', url: `/api/v1/contracts/${contractId}/nda-sign` },
      { ...contract, ndaSigned: true },
    );
  },
  terminate(contractId: number, reason: string) {
    const contract =
      mockContracts.find((item) => item.contractId === contractId) || mockContracts[0];
    return call<Contract>(
      {
        method: 'POST',
        url: `/api/v1/contracts/${contractId}/terminate`,
        params: { reason },
      },
      { ...contract, status: 'Terminated' },
    );
  },
  createMilestone(payload: Partial<Milestone>) {
    return call<Milestone>(
      { method: 'POST', url: '/api/v1/milestones', data: payload },
      {
        milestoneId: id(),
        contractId: payload.contractId || 0,
        milestoneName: payload.milestoneName || '',
        fundsAllocated: payload.fundsAllocated || 0,
        orderIndex: payload.orderIndex || 1,
        status: payload.status || 'Pending',
      },
    );
  },
  listMilestones(contractId: number) {
    return call<Milestone[]>(
      { method: 'GET', url: `/api/v1/contracts/${contractId}/milestones` },
      mockMilestones.filter((milestone) => milestone.contractId === contractId),
    );
  },
  createCriteria(payload: Partial<AcceptanceCriteria>) {
    return call<AcceptanceCriteria>(
      { method: 'POST', url: '/api/v1/criteria', data: payload },
      {
        criteriaId: id(),
        milestoneId: payload.milestoneId || 0,
        description: payload.description || '',
        isPassed: payload.isPassed || false,
      },
    );
  },
  listCriteria(milestoneId: number) {
    return call<AcceptanceCriteria[]>(
      { method: 'GET', url: `/api/v1/milestones/${milestoneId}/criteria` },
      mockCriteria.filter((criteria) => criteria.milestoneId === milestoneId),
    );
  },
  submitDeliverable(payload: Partial<Deliverable>) {
    return call<Deliverable>(
      { method: 'POST', url: '/api/v1/deliverables', data: payload },
      {
        deliverableId: id(),
        milestoneId: payload.milestoneId || 0,
        sourceCodeUrl: payload.sourceCodeUrl,
        demoLink: payload.demoLink,
        submissionNotes: payload.submissionNotes,
      },
    );
  },
  runSlaAutoApprove() {
    return call<Milestone[]>(
      { method: 'POST', url: '/api/v1/milestones/sla-auto-approve' },
      mockMilestones.map((milestone) =>
        milestone.status === 'Under Review' ? { ...milestone, status: 'Released' } : milestone,
      ),
    );
  },
};

export const financeApi = {
  createTransaction(payload: Partial<Transaction>) {
    return call<Transaction>(
      { method: 'POST', url: '/api/v1/transactions', data: payload },
      {
        transactionId: id(),
        milestoneId: payload.milestoneId || 0,
        amount: payload.amount || 0,
        commissionFee: payload.commissionFee || 0,
        transactionType: payload.transactionType || 'Deposit',
        status: payload.status || 'Pending',
      },
    );
  },
  updateTransactionStatus(transactionId: number, status: string) {
    return call<Transaction>(
      {
        method: 'PATCH',
        url: `/api/v1/transactions/${transactionId}/status`,
        params: { status },
      },
      {
        transactionId,
        milestoneId: 0,
        amount: 0,
        commissionFee: 0,
        transactionType: 'Deposit',
        status,
      },
    );
  },
  paymentWebhook(
    transactionId: number,
    paymentStatus: 'Success' | 'Failed',
    bankTxCode?: string,
    receiptImgUrl?: string,
  ) {
    return call<Transaction>(
      {
        method: 'POST',
        url: `/api/v1/transactions/${transactionId}/webhook`,
        params: { paymentStatus, bankTxCode, receiptImgUrl },
      },
      {
        transactionId,
        milestoneId: 0,
        amount: 0,
        commissionFee: 0,
        transactionType: 'Deposit',
        status: paymentStatus,
      },
    );
  },
  createInvoice(payload: Partial<Invoice>) {
    return call<Invoice>(
      { method: 'POST', url: '/api/v1/invoices', data: payload },
      {
        invoiceId: id(),
        transactionId: payload.transactionId || 0,
        bankTxCode: payload.bankTxCode,
        receiptImgUrl: payload.receiptImgUrl,
      },
    );
  },
};

export const disputeApi = {
  create(payload: Partial<Dispute>) {
    return call<Dispute>(
      { method: 'POST', url: '/api/v1/disputes', data: payload },
      {
        disputeId: id(),
        contractId: payload.contractId || 0,
        milestoneId: payload.milestoneId,
        evidenceReport: payload.evidenceReport,
        proposedAction: payload.proposedAction,
        status: payload.status || 'Open',
      },
    );
  },
  assign(disputeId: number, staffId: number) {
    return call<Dispute>(
      {
        method: 'PATCH',
        url: `/api/v1/disputes/${disputeId}/assign`,
        params: { staffId },
      },
      {
        disputeId,
        contractId: 0,
        assignedStaffId: staffId,
        status: 'UnderReview',
      },
    );
  },
  resolve(disputeId: number, proposedAction: string) {
    return call<Dispute>(
      {
        method: 'PATCH',
        url: `/api/v1/disputes/${disputeId}/resolve`,
        params: { proposedAction },
      },
      {
        disputeId,
        contractId: 0,
        proposedAction,
        status: 'Resolved',
      },
    );
  },
  demoTesting(disputeId: number, testResult: string) {
    return call<Dispute>(
      {
        method: 'POST',
        url: `/api/v1/disputes/${disputeId}/demo-testing`,
        params: { testResult },
      },
      {
        disputeId,
        contractId: 0,
        evidenceReport: testResult,
        status: 'UnderReview',
      },
    );
  },
  technicalReport(disputeId: number, reportContent: string, proposedAction?: string) {
    return call<Dispute>(
      {
        method: 'POST',
        url: `/api/v1/disputes/${disputeId}/technical-report`,
        params: { reportContent, proposedAction },
      },
      {
        disputeId,
        contractId: 0,
        evidenceReport: reportContent,
        proposedAction,
        status: 'Escalated',
      },
    );
  },
};

export const adminApi = {
  createReview(payload: Partial<Review>) {
    return call<Review>(
      { method: 'POST', url: '/api/v1/admin/reviews', data: payload },
      {
        reviewId: id(),
        contractId: payload.contractId || 0,
        reviewerId: 10,
        revieweeId: 23,
        rating: payload.rating || 5,
        comment: payload.comment,
      },
    );
  },
  listReviews(contractId: number) {
    return call<Review[]>(
      { method: 'GET', url: `/api/v1/admin/reviews/contracts/${contractId}` },
      mockReviews.filter((review) => review.contractId === contractId),
    );
  },
  listSettings() {
    return call<SystemSetting[]>(
      { method: 'GET', url: '/api/v1/admin/settings' },
      mockSettings,
    );
  },
  updateSetting(settingKey: string, value?: string, isActive?: boolean) {
    const setting =
      mockSettings.find((item) => item.settingKey === settingKey) || mockSettings[0];
    return call<SystemSetting>(
      {
        method: 'PATCH',
        url: `/api/v1/admin/settings/${settingKey}`,
        params: { value, isActive },
      },
      {
        ...setting,
        settingValue: value ?? setting.settingValue,
        isActive: isActive ?? setting.isActive,
      },
    );
  },
  listStaffs() {
    return call<Staff[]>({ method: 'GET', url: '/api/v1/admin/staffs' }, mockStaffs);
  },
  createStaff(payload: Partial<Staff>) {
    return call<Staff>(
      { method: 'POST', url: '/api/v1/admin/staffs', data: payload },
      {
        staffId: id(),
        accountId: payload.accountId || 0,
        specialization: payload.specialization,
      },
    );
  },
  analyticsOverview() {
    return call<AnalyticsOverview>(
      { method: 'GET', url: '/api/v1/admin/analytics/overview' },
      mockAnalytics,
    );
  },
};
