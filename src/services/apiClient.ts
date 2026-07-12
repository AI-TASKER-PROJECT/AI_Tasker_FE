import axios, { type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "../types";
import { getSession } from "../context/sessionContext";

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
    return "Request bị quá thời gian chờ. Generate SoW có thể mất lâu hơn bình thường do backend đang gọi AI.";
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
    return "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
  }
  if (status === 403) {
    return "Tài khoản hiện tại không có quyền gọi chức năng này.";
  }
  if (status === 502) {
    return "Backend không gọi được AI API hoặc OPENAI_API_KEY chưa được cấu hình đúng.";
  }
  if (status) {
    return `Backend trả lỗi HTTP ${status}.`;
  }

  return "Không kết nối được backend. Vui lòng kiểm tra server backend hoặc VITE_API_BASE_URL.";
}

function mapApiErrorCode(message: string) {
  const normalized = message.trim().toUpperCase();
  if (normalized === "INSUFFICIENT_BALANCE") {
    return "Số dư khả dụng trong ví không đủ để thực hiện giao dịch này.";
  }
  if (normalized === "CONTRACT_INVALID_STATUS") {
    return "Hợp đồng chưa ở trạng thái cho phép ký quỹ. Cần để hai bên chấp nhận contract và ký NDA trước.";
  }
  if (normalized === "DEPOSIT_ALREADY_HELD") {
    return "Hợp đồng này đã được ký quỹ rồi.";
  }
  if (normalized === "CONTRACT_NOT_FOUND") {
    return "Không tìm thấy hợp đồng.";
  }
  return message;
}
