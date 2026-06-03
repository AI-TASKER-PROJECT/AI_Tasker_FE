export type Role = 'BUSINESS' | 'EXPERT' | 'ADMIN' | 'STAFF';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  requestId?: string;
  timestamp?: string;
}

export interface SessionUser {
  accessToken: string;
  refreshToken?: string;
  role: Role;
  email: string;
  fullName: string;
  pictureUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE' | 'DEMO';
}

export interface Job {
  jobId: number;
  businessId: number;
  title: string;
  rawRequirements: string;
  structuredSow?: string;
  aiTag?: string;
  budget: number;
  status: string;
  plannedDurationValue?: number;
  plannedDurationUnit?: string;
  isHot?: boolean;
  hotUntil?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  companyName?: string;
  proposalsCount?: number;
  skills?: string[];
}

export interface Proposal {
  proposalId: number;
  jobId: number;
  expertId: number;
  technicalSolution: string;
  bidAmount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  expertName?: string;
  expertTitle?: string;
  rating?: number;
  matchScore?: number;
  deliveryDays?: number;
}

export interface Contract {
  contractId: number;
  jobId: number;
  businessId: number;
  expertId: number;
  technologyUsed?: string;
  totalBudget: number;
  timelineDays: number;
  ndaSigned: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  businessName?: string;
  expertName?: string;
  progress?: number;
}

export interface ContractChangeRequest {
  requestId: number;
  contractId: number;
  requestedByAccountId: number;
  changeType: string;
  changeSummary: string;
  proposedBudget?: number;
  proposedTimelineDays?: number;
  status: string;
  reviewedByAccountId?: number;
  reviewedAt?: string;
  createdAt?: string;
}

export interface Milestone {
  milestoneId: number;
  contractId: number;
  milestoneName: string;
  fundsAllocated: number;
  orderIndex: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  slaDaysLeft?: number;
}

export interface AcceptanceCriteria {
  criteriaId: number;
  milestoneId: number;
  description: string;
  isPassed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Deliverable {
  deliverableId: number;
  milestoneId: number;
  sourceCodeUrl?: string;
  demoLink?: string;
  submissionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  transactionId: number;
  milestoneId: number;
  amount: number;
  commissionFee: number;
  transactionType: 'Deposit' | 'Payout' | 'Refund';
  status: string;
  createdAt?: string;
  updatedAt?: string;
  milestoneName?: string;
}

export interface Invoice {
  invoiceId: number;
  transactionId: number;
  bankTxCode?: string;
  receiptImgUrl?: string;
  createdAt?: string;
}

export interface Dispute {
  disputeId: number;
  contractId: number;
  milestoneId?: number;
  assignedStaffId?: number;
  evidenceReport?: string;
  proposedAction?: string;
  adminApprovedBy?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  raisedBy?: string;
  jobTitle?: string;
  staffName?: string;
}

export interface BusinessProfile {
  businessId: number;
  accountId: number;
  taxCode: string;
  companyName: string;
  address?: string;
  businessLicenseUrl?: string;
  kybStatus: string;
  approvedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpertProfile {
  expertId: number;
  accountId: number;
  nationalId: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  kycStatus: string;
  approvedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
  title?: string;
  rating?: number;
  completedProjects?: number;
  skills?: string[];
}

export interface Portfolio {
  portfolioId: number;
  expertId: number;
  context: string;
  dataProcessing: string;
  modelArchitecture: string;
  performanceMetrics: string;
  pocUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  reviewId: number;
  contractId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
  createdAt?: string;
  reviewerName?: string;
}

export interface Staff {
  staffId: number;
  accountId: number;
  specialization?: string;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
  email?: string;
  activeTickets?: number;
}

export interface SystemSetting {
  settingKey: string;
  settingValue: string;
  valueType: string;
  description?: string;
  isActive: boolean;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsOverview {
  totalContracts: number;
  completedContracts: number;
  terminatedContracts: number;
  contractSuccessRatePercent: number;
  totalDisputes: number;
  openDisputes: number;
  totalTransactions: number;
  transactionVolume: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  href?: string;
}

export interface AuditLog {
  logId: number;
  actor: string;
  action: string;
  entityName: string;
  entityId: string;
  createdAt: string;
  ipAddress?: string;
}
