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
    return "???? c?? l???i kh??ng x??c d???nh.";
  }

  if (error.code === "ECONNABORTED") {
    return "Request b??? qu?? th???i gian ch???. Generate SoW c?? th??? m???t l??u h??n b??nh th?????ng do backend ??ang g???i AI.";
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
    return "B???n ch??a d??ng nh???p ho???c phi??n d??ng nh???p d?? h???t h???n.";
  }
  if (status === 403) {
    return "T??i kho???n hi???n t???i kh??ng c?? quy???n g???i ch???c n??ng n??y.";
  }
  if (status === 502) {
    return "Backend kh??ng g???i d?????c AI API ho???c OPENAI_API_KEY ch??a d?????c c???u h??nh d??ng.";
  }
  if (status) {
    return `Backend trả lỗi HTTP ${status}.`;
  }

  return "Kh??ng k???t n???i d?????c backend. Vui l??ng ki???m tra server backend ho???c VITE_API_BASE_URL.";
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
  if (messages[normalized]) return messages[normalized];
  if (normalized === "INSUFFICIENT_BALANCE") {
    return "S??? d?? kh??? d???ng trong v?? kh??ng d??? d??? th???c hi???n giao d???ch n??y.";
  }
  if (normalized === "CONTRACT_INVALID_STATUS") {
    return "H???p ?????ng ch??a ??? tr???ng th??i cho ph??p k?? qu???. C???n d??? 2 b??n ch???p nh???n contract v?? k?? NDA tr?????c.";
  }
  if (normalized === "DEPOSIT_ALREADY_HELD") {
    return "H???p ?????ng n??y d?? d?????c k?? qu??? r???i.";
  }
  if (normalized === "CONTRACT_NOT_FOUND") {
    return "Kh??ng t??m th???y h???p ?????ng.";
  }
  return message;
}
