import { call } from "./apiClient";
import type { CreditPriceResponse, PaymentActionResponse, UserQuota } from "../types";

export const creditApi = {
  prices() {
    return call<CreditPriceResponse>({
      method: "GET",
      url: "/api/credits/prices",
    });
  },
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
