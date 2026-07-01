import { call } from "./apiClient";
import type { Transaction } from "../types";

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
