import axios, { type AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';
import { getSession } from '../context/sessionContext';

export const requestClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

requestClient.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await requestClient.request<T>(config);
  return response.data;
}
