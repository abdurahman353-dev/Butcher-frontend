import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError } from "@/types";

/**
 * Always use relative paths so that requests go through the Next.js rewrite
 * proxy (next.config.ts). This makes every call same-origin from the
 * browser's perspective, which allows httpOnly session cookies and the
 * XSRF-TOKEN cookie to be set and shared correctly without CORS issues.
 */
const API_BASE_URL = "/api";

/**
 * Read a cookie by name.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/**
 * Ensure the Sanctum CSRF + session cookies are established. Must be called
 * before any state-changing (POST/PUT/PATCH/DELETE) request.
 *
 * Uses a relative URL so it goes through the Next.js proxy → same-origin
 * cookie is set correctly by the browser.
 */
export async function ensureCsrfCookie(): Promise<void> {
  try {
    await axios.get("/sanctum/csrf-cookie", {
      withCredentials: true,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
    });
  } catch {
    // The subsequent request will surface a meaningful error.
  }
}


// Manually attach the CSRF header on state-changing requests. This is more
// reliable than relying on axios's automatic XSRF cookie handling for
// cross-origin (different port) SPA setups.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || "get").toLowerCase();
  const isUnsafe = ["post", "put", "patch", "delete"].includes(method);
  if (isUnsafe && config.headers) {
    const token = getCookie("XSRF-TOKEN");
    if (token) {
      config.headers["X-XSRF-TOKEN"] = token;
    }
  }
  return config;
});

// Allow the response interceptor to transparently retry on CSRF mismatch (419)
// once, after refreshing the CSRF cookie.
let isRetrying419 = false;

async function handleRequestRejection(error: AxiosError): Promise<AxiosResponse> {
  const apiError: ApiError = {
    message: "An unexpected error occurred. Please try again.",
    status_code: error.response?.status,
  };

  if (error.response) {
    const data = error.response.data as any;
    const status = error.response.status;

    if (status === 419 && !isRetrying419) {
      // CSRF token mismatch — refresh the CSRF cookie and retry once.
      isRetrying419 = true;
      try {
        await ensureCsrfCookie();
        const config = error.config;
        if (config) {
          const token = getCookie("XSRF-TOKEN");
          if (token && config.headers) {
            config.headers["X-XSRF-TOKEN"] = token;
          }
          const response = await apiClient.request(config);
          return response;
        }
      } catch (retryError) {
        return Promise.reject(retryError);
      } finally {
        isRetrying419 = false;
      }
    }

    if (status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
      apiError.message = "Your session has expired. Please sign in again.";
    } else if (status === 403) {
      apiError.message = "You do not have permission to perform this action.";
    } else if (status === 419) {
      apiError.message = "Your session token has expired. Please refresh and try again.";
    } else if (status === 422) {
      apiError.message = data?.message || "Validation failed. Please check the entered data.";
      apiError.errors = data?.errors;
    } else if (status === 404) {
      apiError.message = data?.message || "The requested resource was not found.";
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

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  handleRequestRejection
);

export default apiClient;
