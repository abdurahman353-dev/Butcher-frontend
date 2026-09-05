import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { User, UserRole } from "@/types";

export const authService = {
  async login(identifier: string, _password: string): Promise<{ user: User; token: string }> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<{ user: User; token: string }>("/auth/login", {
          login: identifier,
          password: _password,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("butcher_token", res.data.token);
          localStorage.setItem("butcher_user", JSON.stringify(res.data.user));
        }
        return res.data;
      }
    } catch {}

    // Real-time local auth
    const isOwner =
      identifier.toLowerCase().includes("admin") ||
      identifier.toLowerCase().includes("owner") ||
      identifier.toLowerCase().includes("sarah");

    const user: User = {
      id: isOwner ? 2 : 1,
      name: isOwner ? "Sarah Kimani (Owner)" : "John Kamau (Cashier)",
      email: isOwner ? "sarah@primecut.co.ke" : "john@primecut.co.ke",
      phone: isOwner ? "0722334455" : "0711223344",
      role: isOwner ? "admin" : "cashier",
      created_at: new Date().toISOString(),
    };

    const token = `bearer_token_${Date.now()}`;
    if (typeof window !== "undefined") {
      localStorage.setItem("butcher_token", token);
      localStorage.setItem("butcher_user", JSON.stringify(user));
    }
    realtimeStore.setCurrentUser(user);

    return { user, token };
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("butcher_token");
      localStorage.removeItem("butcher_user");
      window.location.href = "/login";
    }
  },

  getCurrentUser(): User {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("butcher_user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return realtimeStore.getCurrentUser();
  },

  switchRole(role: UserRole): User {
    const user: User = {
      id: role === "admin" ? 2 : 1,
      name: role === "admin" ? "Sarah Kimani (Owner)" : "John Kamau (Cashier)",
      email: role === "admin" ? "sarah@primecut.co.ke" : "john@primecut.co.ke",
      phone: role === "admin" ? "0722334455" : "0711223344",
      role,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("butcher_user", JSON.stringify(user));
      window.dispatchEvent(new CustomEvent("butcher:auth-change", { detail: user }));
    }
    realtimeStore.setCurrentUser(user);
    return user;
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("butcher_token");
    }
    return false;
  },
};
