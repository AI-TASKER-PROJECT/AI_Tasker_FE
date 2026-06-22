export type Role = 'BUSINESS' | 'EXPERT' | 'ADMIN' | 'STAFF';
export type AccountStatus = 'Pending' | 'Approved' | 'Rejected' | 'Lock';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  requestId?: string;
  timestamp?: string;
}

export interface SessionUser {
  accountId?: number;
  accessToken: string;
  refreshToken?: string;
  role: Role;
  accountStatus?: AccountStatus;
  email: string;
  fullName: string;
  pictureUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
}

export interface Job {
  jobId: number;
  businessId: number;
  title: string;
  rawRequirements: string;
  structuredSow?: string;
  sow?: Sow;
  milestones?: Array<Partial<Milestone>>;
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
  technologyIds?: number[];
}

export interface Sow {
  sowId?: number;
  jobId?: number;
  title: string;
  overview?: string;
  objectives?: string[] | string;
  scopeOfWork?: string[] | string;
  deliverable?: string[] | string;
  deliverables?: string[] | string;
  assumptions?: string[] | string;
  outOfScope?: string[] | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Proposal {
  proposalId: number;
  jobId: number;
  expertId: number;
  technicalSolution: string;
  proposalDescription?: string;
  proposalFileUrl?: string;
  proposalMilestone?: unknown;
  bidAmount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  expertName?: string;
  expertTitle?: string;
  domainId?: number;
  skillId?: number;
  rating?: number;
  matchScore?: number;
  deliveryDays?: number;
}

export interface ContractMilestone {
  contractMilestoneId: number;
  contractId: number;
  jobMilestoneId: number;
  milestoneName: string;
  description?: string;
  originalBudget: number;
  finalBudget: number;
  orderIndex: number;
  duration?: number;
  durationUnit?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  contractId: number;
  jobId: number;
  proposalId?: number;
  businessId: number;
  expertId: number;
  contractTitle?: string;
  technologyUsed?: string;
  totalBudget: number;
  timelineDays: number;
  ndaSigned?: boolean;
  status: string;
  businessAcceptedAt?: string;
  expertAcceptedAt?: string;
  businessNdaSignedAt?: string;
  expertNdaSignedAt?: string;
  activatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  businessName?: string;
  expertName?: string;
  progress?: number;
  contractMilestones?: ContractMilestone[];
}

export interface ContractDeposit {
  depositId: number;
  contractId: number;
  businessId: number;
  depositAmount: number;
  heldAmount: number;
  refundedAmount: number;
  resolvedAmount: number;
  status: string;
  holdTransactionId?: number;
  refundTransactionId?: number;
  adminId?: number;
  adminNote?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentActionResponse<T> {
  completed: boolean;
  needTopup: boolean;
  currentBalance?: number;
  requiredAmount?: number;
  missingAmount?: number;
  redirectUrl?: string;
  message?: string;
  data?: T;
}

export interface Milestone {
  milestoneId: number;
  jobId: number;
  contractId?: number;
  milestoneName: string;
  description?: string;
  fundsAllocated: number;
  orderIndex: number;
  duration?: number;
  durationUnit?: string;
  status: string;
  criteriaIds?: number[];
  criteria?: AcceptanceCriteria[];
  createdAt?: string;
  updatedAt?: string;
  slaDaysLeft?: number;
}

export interface AcceptanceCriteria {
  criteriaId: number;
  milestoneId?: number;
  criteriaCode?: string;
  category?: string;
  description: string;
  isPassed?: boolean;
  isActive?: boolean;
  sortOrder?: number;
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
  website?: string;
  employeeCount?: string;
  industry?: string;
  description?: string;
  followersCount?: number;
  logoUrl?: string;
  kybStatus: string;
  approvedBy?: number;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxCheckResponse {
  taxCode: string;
  companyName?: string;
  address?: string;
  representative?: string;
  status?: string;
}

export interface ExpertProfile {
  expertId: number;
  accountId: number;
  nationalId: string;
  portfolioUrl?: string;
  yearsOfExperience?: number;
  description?: string;
  followersCount?: number;
  avatarUrl?: string;
  kycStatus: string;
  approvedBy?: number;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
  phone?: string;
  title?: string;
  rating?: number;
  completedProjects?: number;
  skills?: string[];
}

export interface Portfolio {
  portfolioId: number;
  expertId: number;
  domainIds: string;
  skillIds: string;
  technologyIds: string;
  yearsExperience: number;
  certificates?: string;
  selfDescription: string;
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
  updatedByRoleId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemWallet {
  systemWalletId: number;
  accountId: number;
  roleId: number;
  walletType: 'ADMIN_SYSTEM' | 'BUSINESS' | 'EXPERT' | 'STAFF';
  transactionId?: number;
  depositedBusinessCount: number;
  successfulDepositCount: number;
  currentBalance: number;
  availableBalance: number;
  escrowBalance: number;
  totalRevenue: number;
  holdingBalance: number;
  disputedBalance: number;
  currency: string;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipPackage {
  packageId: number;
  packageCode: string;
  packageName: string;
  price: number;
  badgeDurationDays: number;
  jobPostQuota: number;
  proposalQuota: number;
  recommendVisibility: boolean;
  roleType: 'BUSINESS' | 'EXPERT';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipPurchase {
  purchaseId: number;
  accountId: number;
  packageId: number;
  amount: number;
  status: string;
  badgeStartAt: string;
  badgeEndAt: string;
  walletTransactionId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WithdrawalRequest {
  withdrawalId: number;
  accountId: number;
  walletId: number;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  status: string;
  holdTransactionId?: number;
  reviewTransactionId?: number;
  adminId?: number;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePayOSPaymentResponse {
  checkoutUrl: string;
  qrCode?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  currency?: string;
  orderCode: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
}

/** Payment order persisted by PayOS after a status synchronisation. */
export interface PaymentOrder {
  id: number;
  accountId?: number;
  businessId?: number;
  amount: number;
  provider: 'PAYOS';
  purpose: 'WALLET_TOPUP';
  providerOrderCode: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  description?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface AdminAccount {
  accountId: number;
  email: string;
  phone?: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  specialization?: string;
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
  notificationId: number;
  type: string;
  title: string;
  message: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: {
    reason?: string;
    [key: string]: unknown;
  };
}

export interface UnreadNotificationCount {
  unreadCount: number;
}

export interface WalletTransaction {
  id: number;
  systemWalletId: number;
  accountId?: number;
  paymentOrderId?: number;
  transactionType:
    | 'TOPUP'
    | 'MEMBERSHIP_PURCHASE'
    | 'CREDIT_PURCHASE'
    | 'CONTRACT_SECURITY_DEPOSIT_HOLD'
    | 'DEPOSIT_REFUND'
    | 'WITHDRAW_HOLD'
    | 'WITHDRAW_APPROVED'
    | 'WITHDRAW_REJECTED';
  direction: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE';
  balanceType: 'AVAILABLE' | 'ESCROW' | 'HOLDING' | 'DISPUTE';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  referenceType?: string;
  referenceId?: number;
  description?: string;
  createdAt?: string;
}

export interface UserQuota {
  // `GET /api/users/me/quota` is an entitlement view and does not expose quotaId.
  quotaId?: number;
  accountId: number;
  jobPostQuotaBalance: number;
  proposalQuotaBalance: number;
  badgeExpiredAt?: string;
  premiumExpiredAt?: string;
  premiumActive?: boolean;
  activePackageCode?: string;
  activePackageName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  logId: number;
  actorAccountId?: number;
  actor: string;
  actorEmail?: string;
  actorRole?: Role;
  actorGroup?: 'INTERNAL' | 'EXTERNAL';
  action: string;
  entityName: string;
  entityId: string;
  entityDisplayName?: string;
  entityOwner?: string;
  entityOwnerEmail?: string;
  entityOwnerRole?: Role;
  createdAt: string;
  oldValueJson?: unknown;
  newValueJson?: unknown;
}
