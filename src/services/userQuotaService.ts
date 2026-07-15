import { call } from "./apiClient";
import type { UserQuota } from "../types";


export const userQuotaApi = {
  // Lấy thông tin quota của người dùng hiện tại, dùng để hiển thị số lượng Job/Proposal còn lại trong màn quản lý.
  // Lấy quota hiện tại để chặn chuyên gia gửi proposal khi đã hết lượt.
  getCurrent() {
    return call<UserQuota>({
      method: "GET",
      url: "/api/users/me/quota",
    });
  },
};
