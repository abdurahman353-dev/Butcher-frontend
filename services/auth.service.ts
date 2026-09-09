import apiClient, { tokenStore } from "./api";
import { User } from "@/types";

/**
 * Token-based authentication via Laravel Sanctum API tokens.
 *
 * The token is stored in localStorage and attached to every request as a
 * Bearer token by the axios request interceptor in api.ts.
 * No CSRF cookie or session management is required.
 */
export const authService = {
  async login(identifier: string, password: string): Promise<User> {
    const res = await apiClient.post<{ token: string; user: User }>("/auth/login", {
      login: identifier,
      password,
    });
    // Persist the token for future requests and page reloads.
    tokenStore.set(res.data.token);
    return res.data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout.
    } finally {
      tokenStore.clear();
    }
  },

  /**
   * Fetch the currently authenticated user using the stored token.
   * Resolves to null when there is no valid token / session.
   */
  async getCurrentUser(): Promise<User | null> {
    if (!tokenStore.get()) return null;
    try {
      const res = await apiClient.get<User>("/auth/me");
      return res.data;
    } catch {
      tokenStore.clear();
      return null;
    }
  },
};

export function roleGuard(user: User | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
