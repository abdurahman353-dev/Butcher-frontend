import apiClient from "./api";
import { User, Waiter, PaginatedResponse, PaginationParams } from "@/types";

export const usersService = {
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const res = await apiClient.get<PaginatedResponse<User>>("/users", { params });
    return res.data;
  },

  async createUser(data: {
    name: string;
    email?: string;
    phone?: string;
    role: "admin" | "cashier" | "waiter";
    password?: string;
    pin?: string;
  }): Promise<User> {
    const res = await apiClient.post<User>("/users", data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async updateUser(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      role: "admin" | "cashier" | "waiter";
      password: string;
      pin: string;
    }>
  ): Promise<User> {
    const res = await apiClient.put<User>(`/users/${id}`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async toggleUserStatus(id: number): Promise<User> {
    const res = await apiClient.patch<{ message: string; user: User }>(`/users/${id}/toggle-status`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data.user;
  },

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
  },

  async resetPassword(id: number, password: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(`/users/${id}/reset-password`, { password });
    return res.data;
  },

  async changePassword(currentPassword: string, password: string, passwordConfirmation: string): Promise<void> {
    await apiClient.post("/auth/change-password", {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  // ── Waiters & Servers (PINs) ──
  async getWaiters(params?: PaginationParams): Promise<PaginatedResponse<Waiter>> {
    const res = await apiClient.get<PaginatedResponse<Waiter>>("/waiters", { params });
    return res.data;
  },

  async createWaiter(data: { name: string; pin: string; phone?: string }): Promise<Waiter> {
    const res = await apiClient.post<{ message: string; data: Waiter }>("/waiters", data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data.data;
  },

  async updateWaiter(
    id: number,
    data: Partial<{ name: string; pin: string; phone: string; is_active: boolean }>
  ): Promise<Waiter> {
    const res = await apiClient.put<{ message: string; data: Waiter }>(`/waiters/${id}`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data.data;
  },

  async deleteWaiter(id: number): Promise<void> {
    await apiClient.delete(`/waiters/${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
  },
};
