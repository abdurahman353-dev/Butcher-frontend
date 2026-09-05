import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { ApiError } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("butcher_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Normalize Errors and Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: "An unexpected error occurred. Please try again.",
      status_code: error.response?.status,
    };

    if (error.response) {
      const data = error.response.data as any;
      if (error.response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("butcher_token");
          localStorage.removeItem("butcher_user");
          // Prevent infinite loop if already on login page
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login?expired=1";
          }
        }
        apiError.message = "Your session has expired. Please sign in again.";
      } else if (error.response.status === 403) {
        apiError.message = "You do not have permission to perform this action.";
      } else if (error.response.status === 422) {
        apiError.message = data?.message || "Validation failed. Please check the entered data.";
        apiError.errors = data?.errors;
      } else if (error.response.status === 404) {
        apiError.message = data?.message || "The requested resource was not found.";
      } else if (error.response.status >= 500) {
        apiError.message = "Server error. Please contact the administrator.";
      } else if (data?.message) {
        apiError.message = data.message;
      }
    } else if (error.request) {
      apiError.message = "Network error: Unable to reach the server. Please check your connection.";
    }

    return Promise.reject(apiError);
  }
);

export default apiClient;
