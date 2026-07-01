import { call } from "./apiClient";
import type { WalletTransaction } from "../types";

export const walletTransactionApi = {
  list() {
    return call<WalletTransaction[]>({
      method: "GET",
      url: "/api/wallet/transactions",
    });
  },
};
