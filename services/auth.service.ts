import apiClient, { ensureCsrf } from "./api";
import { User } from "@/types";

/**
 * Sanctum SPA authentication.
 * - Login: fetches CSRF cookie first, then posts credentials.
 *   Backend responds with { user } only — no token in JSON.
 *   The session cookie is set by the browser automatically (httpOnly).
 * - getCurrentUser: calls /auth/me — 200 = authenticated, 401 = not.
 *   No localStorage, no cached state — the session cookie is the source of truth.
 * - Logout: backend invalidates the session; frontend clears React state only.
 */
export const authService = {
  async login(identifier: string, password: string): Promise<User> {
    // Seed the XSRF-TOKEN cookie before the first mutating request
    await ensureCsrf();

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
      // Ignore — session may already be invalid
    }
  },

  /**
   * Asks the backend if the current session is valid.
   * Returns the User on success, null on 401.
   * Never reads localStorage or cookies from JS.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await apiClient.get<User>("/auth/me");
      return res.data;
    } catch {
      return null;
    }
  },
};

export function roleGuard(user: User | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
