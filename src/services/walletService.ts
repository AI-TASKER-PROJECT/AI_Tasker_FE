import { call } from "./apiClient";
import type { SystemWallet } from "../types";

export const walletApi = {
  current() {
    return call<SystemWallet>({ method: "GET", url: "/api/v1/wallet/me" });//lấy ra số dư ví
  },
};
