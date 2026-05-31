import axiosClient from './axiosClient';

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  email: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export const authApi = {
  login: (data: LoginRequest) => {
    return axiosClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
  },

  googleLogin: (token: string) => {
    return axiosClient.post<ApiResponse<AuthResponse>>('/auth/google', { token });
  },
};
