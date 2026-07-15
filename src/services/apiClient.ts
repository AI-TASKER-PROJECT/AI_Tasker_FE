import axios, { type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "../types";
import { clearSession, getSession } from "../context/sessionContext";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let redirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || "");
    const isAuthRequest = requestUrl.includes("/api/auth/login");

    if (status === 401 && !isAuthRequest) {
      clearSession();
      if (!redirectingToLogin && window.location.pathname !== "/login") {
        redirectingToLogin = true;
        sessionStorage.setItem(
          "aitasker:login-message",
          "Phiên đăng nhập đã hết hiệu lực. Tài khoản có thể đã đăng nhập ở nơi khác.",
        );
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export function setDataMode(mode: "live") {
  localStorage.setItem("aitasker.data-mode", mode);
  window.dispatchEvent(new Event("aitasker:data-mode-change"));
}

export async function call<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<ApiResponse<T>>(config);
    setDataMode("live");
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "Đã có lỗi không xác định.";
  }

  if (error.code === "ECONNABORTED") {
    return "Yêu cầu bị quá thời gian chờ. Tác vụ AI có thể mất lâu hơn bình thường.";
  }

  const status = error.response?.status;
  const responseData = error.response?.data as
    | Partial<ApiResponse<unknown>>
    | { error?: string }
    | string
    | undefined;

  if (typeof responseData === "string" && responseData.trim()) {
    return mapApiErrorCode(responseData);
  }

  if (responseData && typeof responseData === "object") {
    if ("message" in responseData && responseData.message) {
      return mapApiErrorCode(String(responseData.message));
    }
    if ("error" in responseData && responseData.error) {
      return mapApiErrorCode(String(responseData.error));
    }
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hiệu lực. Tài khoản có thể đã đăng nhập ở nơi khác.";
  }
  if (status === 403) {
    return "Tài khoản hiện tại không có quyền dùng chức năng này.";
  }
  if (status === 502) {
    return "Backend không gọi được AI API hoặc khóa cấu hình chưa đúng.";
  }
  if (status) {
    return `Backend trả lỗi HTTP ${status}.`;
  }

  return "Không kết nối được backend. Vui lòng kiểm tra server backend hoặc VITE_API_BASE_URL.";
}

function mapApiErrorCode(message: string) {
  const normalized = message.trim().toUpperCase();
  const messages: Record<string, string> = {
    PROGRESS_REPORT_ACK_PENDING:
      "Báo cáo tiến độ mới nhất đang chờ Doanh nghiệp xác nhận.",
    PROGRESS_REPORT_ACK_NOT_ALLOWED:
      "Báo cáo này không còn đủ điều kiện để xác nhận.",
    PROGRESS_REPORT_REQUEST_ALREADY_PENDING:
      "Đã có một yêu cầu báo cáo tiến độ đang chờ xử lý.",
    CONTRACT_DRAFT_CANCELLATION_NOT_ALLOWED:
      "Chỉ có thể hủy hợp đồng nháp chưa được ký hoặc xác thực.",
    DISPUTE_NOT_ESCALATION_REQUESTED:
      "Tranh chấp chưa ở trạng thái chờ Staff tiếp nhận.",
    DISPUTE_NOT_STAFF_REVIEWING:
      "Tranh chấp chưa ở trạng thái Staff đang xử lý.",
  };
  messages.MILESTONE_DA_QUA_HAN_NOP_SAN_PHAM =
    "Cot moc da qua han nop san pham. Ban khong the nop them source hoac final product.";
  messages.NO_MATCHING_STAFF_FOR_JOB_DOMAIN =
    "Chua co Staff phu hop voi linh vuc cua job.";
  messages.NO_AVAILABLE_STAFF_CAPACITY =
    "Cac Staff phu hop deu dang qua tai.";
  messages.STAFF_DA_DAT_GIOI_HAN_DISPUTE_DANG_XU_LY =
    "Staff nay da dat gioi han tranh chap dang xu ly.";
  if (messages[normalized]) return messages[normalized];
  if (normalized === "PREMIUM_REQUIRED") {
    return "Tài khoản chưa đăng kí gói Premium hoặc gói Premium đã hết hạn.";
  }
  if (normalized === "INSUFFICIENT_BALANCE") {
    return "Số dư khả dụng trong ví không đủ để thực hiện giao dịch này.";
  }
  if (normalized === "CONTRACT_INVALID_STATUS") {
    return "Hợp đồng chưa ở trạng thái cho phép ký quỹ. Hai bên cần chấp nhận hợp đồng và ký NDA trước.";
  }
  if (normalized === "DEPOSIT_ALREADY_HELD") {
    return "Hợp đồng này đã được ký quỹ rồi.";
  }
  if (normalized === "CONTRACT_NOT_FOUND") {
    return "Không tìm thấy hợp đồng.";
  }
  return message;
}
