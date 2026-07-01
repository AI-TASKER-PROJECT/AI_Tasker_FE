import { call } from "./apiClient";
import type { UserQuota } from "../types";

export const userQuotaApi = {
  getCurrent() {
    return call<UserQuota>({
      method: "GET",
      url: "/api/users/me/quota",
    });
  },
};
