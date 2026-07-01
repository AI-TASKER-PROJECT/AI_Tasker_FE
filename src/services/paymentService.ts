import { call } from "./apiClient";
import type { CreatePayOSPaymentResponse, PaymentOrder } from "../types";

export const paymentApi = {
  createWalletTopup(payload: { amount: number; description: string }) {
    return call<CreatePayOSPaymentResponse>({
      method: "POST",
      url: "/api/payments/payos/create",//cập nhât số dư ví
      data: payload,
    });
  },
  syncWalletTopup(orderCode: number) {
    return call<PaymentOrder>({
      method: "POST",
      url: `/api/payments/payos/${orderCode}/sync`,//đồng bộ 
    });
  },
};
