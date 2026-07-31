import { call } from "./apiClient";
import type {
  AdminAccount,
  AnalyticsOverview,
  AuditLog,
  DashboardContractsResponse,
  DashboardDisputesResponse,
  DashboardFinanceBreakdownResponse,
  DashboardJobsProposalsResponse,
  DashboardMembershipResponse,
  DashboardSeriesResponse,
  DashboardSummaryResponse,
  DashboardUsersResponse,
  MembershipPackage,
  MembershipPackageRequest,
  Review,
  Staff,
  SystemSetting,
  SystemSettingRequest,
  SystemWallet,
  WalletTransaction,
} from "../types";

type DashboardParams = {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month" | string;
};

export const adminApi = {
  createReview(payload: Partial<Review>) {
    return call<Review>({
      method: "POST",
      url: `/api/v1/contracts/${payload.contractId}/reviews`,
      data: payload,
    });
  },
  listReviews(contractId: number) {
    return call<Review[]>({
      method: "GET",
      url: `/api/v1/contracts/${contractId}/reviews`,
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
  createSetting(payload: SystemSettingRequest) {
    return call<SystemSetting>({
      method: "POST",
      url: "/api/v1/admin/settings",
      data: payload,
    });
  },
  updateSettingBody(settingKey: string, payload: SystemSettingRequest) {
    return call<SystemSetting>({
      method: "PUT",
      url: `/api/v1/admin/settings/${settingKey}`,
      data: payload,
    });
  },
  deleteSetting(settingKey: string) {
    return call<SystemSetting>({
      method: "DELETE",
      url: `/api/v1/admin/settings/${settingKey}`,
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
  dashboardSummary() {
    return call<DashboardSummaryResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/summary",
    });
  },
  dashboardRevenue(params?: DashboardParams) {
    return call<DashboardSeriesResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/revenue",
      params,
    });
  },
  dashboardContracts(params?: DashboardParams) {
    return call<DashboardContractsResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/contracts",
      params,
    });
  },
  dashboardUsers(params?: DashboardParams) {
    return call<DashboardUsersResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/users",
      params,
    });
  },
  dashboardJobsProposals(params?: DashboardParams) {
    return call<DashboardJobsProposalsResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/jobs-proposals",
      params,
    });
  },
  dashboardDisputes(params?: DashboardParams) {
    return call<DashboardDisputesResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/disputes",
      params,
    });
  },
  dashboardMembership(params?: DashboardParams) {
    return call<DashboardMembershipResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/membership",
      params,
    });
  },
  dashboardFinanceBreakdown(params?: Omit<DashboardParams, "groupBy">) {
    return call<DashboardFinanceBreakdownResponse>({
      method: "GET",
      url: "/api/v1/admin/dashboard/finance-breakdown",
      params,
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
  listPlatformWalletTransactions() {
    return call<WalletTransaction[]>({
      method: "GET",
      url: "/api/v1/admin/wallet/transactions",
    });
  },
  listUserActivityTransactions() {
    return call<WalletTransaction[]>({
      method: "GET",
      url: "/api/v1/admin/wallet/user-activity-transactions",
    });
  },
  listPlatformWalletLedger() {
    return call<WalletTransaction[]>({ method: "GET", url: "/api/v1/admin/wallet/platform-ledger" });
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
  listMembershipPackages(activeOnly = false) {
    return call<MembershipPackage[]>({
      method: "GET",
      url: "/api/v1/admin/membership/packages",
      params: { activeOnly },
    });
  },
  createMembershipPackage(payload: MembershipPackageRequest) {
    return call<MembershipPackage>({
      method: "POST",
      url: "/api/v1/admin/membership/packages",
      data: payload,
    });
  },
  updateMembershipPackage(packageId: number, payload: MembershipPackageRequest) {
    return call<MembershipPackage>({
      method: "PATCH",
      url: `/api/v1/admin/membership/packages/${packageId}`,
      data: payload,
    });
  },
  deleteMembershipPackage(packageId: number) {
    return call<MembershipPackage>({
      method: "DELETE",
      url: `/api/v1/admin/membership/packages/${packageId}`,
    });
  },
};
