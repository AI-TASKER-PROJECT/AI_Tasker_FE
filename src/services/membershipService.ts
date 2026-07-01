import { call } from "./apiClient";
import type { MembershipPackage, MembershipPurchase, PaymentActionResponse } from "../types";

export const membershipApi = {
  listPackages() {
    return call<MembershipPackage[]>({
      method: "GET",
      url: "/api/membership/packages",
    });
  },
  purchasePackage(packageId: number) {
    return call<PaymentActionResponse<MembershipPurchase>>({
      method: "POST",
      url: `/api/membership/packages/${packageId}/purchase`,
    });
  },
};
