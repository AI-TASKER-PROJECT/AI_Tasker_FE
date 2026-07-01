import { call } from "./apiClient";
import type { PaymentActionResponse, UserQuota } from "../types";

export const creditApi = {
  purchaseJobPost(quantity: number) {
    return call<PaymentActionResponse<UserQuota>>({
      method: "POST",
      url: "/api/credits/job-post/purchase",
      data: { quantity },
    });
  },
  purchaseProposal(quantity: number) {
    return call<PaymentActionResponse<UserQuota>>({
      method: "POST",
      url: "/api/credits/proposal/purchase",
      data: { quantity },
    });
  },
};
