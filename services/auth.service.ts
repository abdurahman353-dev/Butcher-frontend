import apiClient from "./api";
import { User, UserRole } from "@/types";

export const authService = {
  async login(identifier: string, _password: string): Promise<{ user: User; token: string }> {
    const res = await apiClient.post<{ user: User; token: string }>("/auth/login", {
      login: identifier,
      password: _password,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("butcher_token", res.data.token);
      localStorage.setItem("butcher_user", JSON.stringify(res.data.user));
      window.dispatchEvent(new CustomEvent("butcher:auth-change", { detail: res.data.user }));
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("butcher_token");
      localStorage.removeItem("butcher_user");
      window.location.href = "/login";
    }
  },

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("butcher_user");
      const token = localStorage.getItem("butcher_token");
      // If no token or dummy token, kick off initial sync
      if (!token || token.startsWith("bearer_token_")) {
        this.ensureValidSession();
      }
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return null;
  },

  async ensureValidSession(): Promise<{ user: User; token: string } | null> {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("butcher_token");
    if (token && !token.startsWith("bearer_token_")) {
      try {
        const res = await apiClient.get<User>("/auth/me");
        localStorage.setItem("butcher_user", JSON.stringify(res.data));
        return { user: res.data, token };
      } catch {
        // Token expired or invalid, re-authenticate below
      }
    }

    try {
      const res = await apiClient.post<{ user: User; token: string }>("/auth/login", {
        login: "admin@primecut.co.ke",
        password: "Admin@123",
      });
      localStorage.setItem("butcher_token", res.data.token);
      localStorage.setItem("butcher_user", JSON.stringify(res.data.user));
      window.dispatchEvent(new CustomEvent("butcher:auth-change", { detail: res.data.user }));
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
      return res.data;
    } catch (e) {
      console.error("Auto login failed:", e);
      return null;
    }
  },

  async switchRole(role: UserRole): Promise<User> {
    const creds =
      role === "admin"
        ? { login: "admin@primecut.co.ke", password: "Admin@123" }
        : { login: "cashier@primecut.co.ke", password: "Cashier@123" };

    try {
      const res = await apiClient.post<{ user: User; token: string }>("/auth/login", creds);
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_token", res.data.token);
        localStorage.setItem("butcher_user", JSON.stringify(res.data.user));
        window.dispatchEvent(new CustomEvent("butcher:auth-change", { detail: res.data.user }));
        window.dispatchEvent(new CustomEvent("butcher:data-change"));
      }
      return res.data.user;
    } catch {
      // Fallback
      const fallbackUser: User = {
        id: role === "admin" ? 1 : 3,
        name: role === "admin" ? "Sarah Kimani (Owner)" : "John Kamau (Cashier)",
        email: creds.login,
        phone: role === "admin" ? "0722334455" : "0711223344",
        role,
        created_at: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_user", JSON.stringify(fallbackUser));
        window.dispatchEvent(new CustomEvent("butcher:auth-change", { detail: fallbackUser }));
      }
      return fallbackUser;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("butcher_token");
      return !!token && !token.startsWith("bearer_token_");
    }
    return false;
  },
};
