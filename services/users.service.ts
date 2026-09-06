import apiClient from "./api";
import { User, PaginatedResponse, PaginationParams } from "@/types";

export const usersService = {
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const res = await apiClient.get<PaginatedResponse<User>>("/users", { params });
    return res.data;
  },

  async createUser(data: {
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "cashier";
    password: string;
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
      role: "admin" | "cashier";
      password: string;
    }>
  ): Promise<User> {
    const res = await apiClient.put<User>(`/users/${id}`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
  },

  async changePassword(currentPassword: string, password: string, passwordConfirmation: string): Promise<void> {
    await apiClient.post("/auth/change-password", {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },
};
