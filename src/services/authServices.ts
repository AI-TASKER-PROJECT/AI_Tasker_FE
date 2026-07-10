import { api, call } from "./apiClient";
import type { SessionUser } from "../types";

export const authApi = {
  login(payload: { email: string; password: string }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/login", //login
      data: payload,
    });
  },
  me() {
    return call<Partial<SessionUser>>({
      method: "GET",
      url: "/api/auth/me",//Check access token
    });
  },
  refresh(refreshToken: string) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/refresh",
      data: { refreshToken },
    });
  },
  checkEmail(email: string) {
    return api
      .get<boolean>("/api/auth/check-email", { params: { email } }) //Check email
      .then((response) => response.data);
  },
  sendOtp(payload: { email: string }) {
    //return call<void>({ method: 'POST', url: '/api/auth/email/send-otp', data: payload });
    return call<{ expiresIn: number }>({
      method: "POST",
      url: "/api/auth/email/send-otp",
      data: payload,
    });
  },
  verifyOtp(payload: { email: string; otp: string }) {
    return call<void>({
      method: "POST",
      url: "/api/auth/email/verify-otp",
      data: payload,
    });
  },
  forgotPassword(payload: { email: string }) {
    return call<void>({
      method: "POST",
      url: "/api/auth/forgot-password",
      data: payload,
    });
  },
  resetPassword(payload: { token: string; newPassword: string }) {
    return call<void>({
      method: "POST",
      url: "/api/auth/reset-password",
      data: payload,
    });
  },
  register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: "BUSINESS" | "EXPERT";
  }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/register",
      data: payload,
    });
  },
  googleSignup(payload: {
    credential: string;
    fullName?: string;
    phone: string;
    role: "BUSINESS" | "EXPERT";
  }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/google/register",
      data: payload,
    });
  },
  googleLogin(payload: { credential: string; role?: "BUSINESS" | "EXPERT" }) {
    return call<SessionUser>({
      method: "POST",
      url: "/api/auth/google/login",
      data: payload,
    });
  },
};
