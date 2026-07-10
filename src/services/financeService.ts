import type { Transaction } from "../types";

function unsupportedLegacyFinanceApi() {
  return Promise.reject(
    new Error("Backend hien khong expose API transaction legacy. Vui long dung wallet history."),
  );
}

export const financeApi = {
  createTransaction(payload: Partial<Transaction>) {
    void payload;
    return unsupportedLegacyFinanceApi() as Promise<Transaction>;
  },
  listTransactions(milestoneId: number) {
    void milestoneId;
    return Promise.resolve([]);
  },
  updateTransactionStatus(transactionId: number, status: string) {
    void transactionId;
    void status;
    return unsupportedLegacyFinanceApi() as Promise<Transaction>;
  },
  paymentWebhook(
    transactionId: number,
    paymentStatus: "Success" | "Failed",
    bankTxCode?: string,
    receiptImgUrl?: string,
  ) {
    void transactionId;
    void paymentStatus;
    void bankTxCode;
    void receiptImgUrl;
    return unsupportedLegacyFinanceApi() as Promise<Transaction>;
  },
};
