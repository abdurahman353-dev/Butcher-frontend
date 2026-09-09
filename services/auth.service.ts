import apiClient, { ensureCsrfCookie } from "./api";
import { User, UserRole } from "@/types";

/**
 * Session-based authentication over httpOnly cookies.
 *
 * No authentication data is stored in localStorage/sessionStorage. The session
 * is held entirely on the server and conveyed via an httpOnly cookie, which is
 * not accessible to JavaScript and therefore immune to XSS token theft.
 */
export const authService = {
  async login(identifier: string, password: string): Promise<User> {
    // Obtain the CSRF token + establish a session before state-changing POST.
    await ensureCsrfCookie();
    const res = await apiClient.post<{ user: User }>("/auth/login", {
      login: identifier,
      password,
    });
    return res.data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout; the cookie is cleared server-side.
    }
  },

  /**
   * Fetch the currently authenticated user from the session cookie.
   * Resolves to null when there is no valid session.
   */
  async getCurrentUser(): Promise<User | null> {
    await ensureCsrfCookie();
    try {
      const res = await apiClient.get<User>("/auth/me");
      return res.data;
    } catch {
      return null;
    }
  },
};

export function roleGuard(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  if (allowedRoles.includes("admin") && user.role === "admin") return true;
  if (allowedRoles.includes("cashier") && user.role === "cashier") return true;
  return false;
}
