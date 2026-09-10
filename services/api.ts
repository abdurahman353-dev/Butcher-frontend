import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { ApiError } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// ─── Axios Instance ───────────────────────────────────────────────────────────
// withCredentials: true → browser automatically sends the httpOnly session cookie.
// xsrfCookieName / xsrfHeaderName → axios reads the XSRF-TOKEN cookie set by
// Laravel and re-sends it as X-XSRF-TOKEN on every mutating request.

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,          // Send the httpOnly session cookie cross-origin
  xsrfCookieName: "XSRF-TOKEN",  // Laravel Sanctum's default CSRF cookie name
  xsrfHeaderName: "X-XSRF-TOKEN",// Laravel Sanctum's default CSRF header name
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ─── CSRF Bootstrap ───────────────────────────────────────────────────────────
// Call once before the first mutating request (login).
// Laravel sets the XSRF-TOKEN cookie; axios picks it up automatically afterward.

let csrfFetched = false;

export async function ensureCsrf(): Promise<void> {
  if (csrfFetched) return;
  await axios.get(`${BASE}/sanctum/csrf-cookie`, {
    withCredentials: true,
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  csrfFetched = true;
}

// ─── Response Interceptor ─────────────────────────────────────────────────────

async function handleRejection(error: AxiosError): Promise<AxiosResponse> {
  const apiError: ApiError = {
    message: "An unexpected error occurred. Please try again.",
    status_code: error.response?.status,
  };

  if (error.response) {
    const data = error.response.data as any;
    const status = error.response.status;

    if (status === 401) {
      apiError.message = "Your session has expired. Please sign in again.";
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    } else if (status === 403) {
      apiError.message = "You do not have permission to perform this action.";
    } else if (status === 419) {
      // CSRF mismatch — reset and let the user retry
      csrfFetched = false;
      apiError.message = "Session expired. Please refresh the page and try again.";
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
  handleRejection,
);

export default apiClient;
