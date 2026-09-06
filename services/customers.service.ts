import apiClient from "./api";
import { Customer, PaginatedResponse, PaginationParams } from "@/types";

export const customersService = {
  async getCustomers(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
    const res = await apiClient.get<PaginatedResponse<Customer>>("/customers", { params });
    return res.data;
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await apiClient.post<Customer>("/customers", data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
    const res = await apiClient.put<Customer>(`/customers/${id}`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
  },
};
