import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError } from "@/types";

// ─── Token Storage ────────────────────────────────────────────────────────────
// Kept in memory for SSR safety; also persisted in localStorage for page reload.

const TOKEN_KEY = "butcher_pos_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────
// Uses relative baseURL so requests go through the Next.js proxy rewrite,
// keeping the same origin (avoids CORS preflight on every call).

export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 90000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attach the Bearer token from storage to every outgoing request.

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────────────

async function handleRequestRejection(error: AxiosError): Promise<AxiosResponse> {
  const apiError: ApiError = {
    message: "An unexpected error occurred. Please try again.",
    status_code: error.response?.status,
  };

  if (error.response) {
    const data = error.response.data as any;
    const status = error.response.status;

    if (status === 401) {
      // Token invalid or expired — clear it and redirect to login.
      tokenStore.clear();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
      apiError.message = "Your session has expired. Please sign in again.";
    } else if (status === 403) {
      apiError.message = "You do not have permission to perform this action.";
    } else if (status === 422) {
      apiError.message = data?.message || "Validation failed. Please check the entered data.";
      apiError.errors = data?.errors;
    } else if (status === 404) {
      apiError.message = data?.message || "The requested resource was not found.";
    } else if (status === 429) {
      apiError.message = "Too many requests. Please slow down.";
    } else if (status >= 500) {
      apiError.message = "Server error. Please contact the administrator.";
    } else if (data?.message) {
      apiError.message = data.message;
    }
  } else if (error.request) {
    apiError.message = "Network error: Unable to reach the server. Please check your connection.";
  }

  return Promise.reject(apiError);
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  handleRequestRejection
);

export default apiClient;
