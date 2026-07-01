import { call } from "./apiClient";
import type { AdminAccount, AnalyticsOverview, AuditLog, Review, Staff, SystemSetting, SystemWallet } from "../types";

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
