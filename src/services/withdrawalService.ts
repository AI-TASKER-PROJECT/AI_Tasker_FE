import { call } from "./apiClient";
import type { PaymentActionResponse, WithdrawalRequest } from "../types";

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
