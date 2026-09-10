import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { ApiError } from "@/types";

export class ApiRequestError extends Error {
  status_code?: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiRequestError";
    this.status_code = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

const isBrowser = typeof window !== "undefined";

// In the browser, use relative path ("") so requests go through Next.js proxy rewrites on the same origin (port 3000).
// This completely eliminates cross-origin cookie drops, localhost vs 127.0.0.1 mismatches, and preflight latencies.
const BASE = isBrowser
  ? ""
  : (process.env.NEXT_PUBLIC_API_BASE_URL ||
     process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
     "http://127.0.0.1:8000");

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ─── CSRF Bootstrap ───────────────────────────────────────────────────────────
let csrfFetched = false;

export async function ensureCsrf(): Promise<void> {
  if (csrfFetched) return;
  try {
    const csrfUrl = isBrowser ? "/sanctum/csrf-cookie" : `${BASE}/sanctum/csrf-cookie`;
    await axios.get(csrfUrl, {
      withCredentials: true,
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    csrfFetched = true;
  } catch (err) {
    console.warn("CSRF cookie initialization skipped or failed:", err);
  }
}

// ─── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("prime_cut_token");
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────────────
async function handleRejection(error: AxiosError): Promise<never> {
  let message = "An unexpected error occurred. Please try again.";
  const statusCode = error.response?.status;
  let validationErrors: Record<string, string[]> | undefined;

  if (error.response) {
    const data = error.response.data as any;

    if (statusCode === 401) {
      message = "Your session has expired. Please sign in again.";
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    } else if (statusCode === 403) {
      message = "You do not have permission to perform this action.";
    } else if (statusCode === 419) {
      csrfFetched = false;
      message = "Session expired. Please refresh the page and try again.";
    } else if (statusCode === 422) {
      message = data?.message || "Validation failed. Please check the entered data.";
      validationErrors = data?.errors;
    } else if (statusCode === 404) {
      message = data?.message || "The requested resource was not found.";
    } else if (statusCode === 429) {
      message = "Too many requests. Please slow down.";
    } else if (statusCode && statusCode >= 500) {
      message = "Server error. Please contact the administrator.";
    } else if (data?.message) {
      message = data.message;
    }
  } else if (error.request) {
    message = "Network error: Unable to reach the backend server. Please verify the server is running.";
  }

  const err = new ApiRequestError(message, statusCode, validationErrors);
  return Promise.reject(err);
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  handleRejection,
);

export default apiClient;
