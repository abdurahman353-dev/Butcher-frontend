import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { Customer, PaginatedResponse, PaginationParams } from "@/types";

export const customersService = {
  async getCustomers(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<PaginatedResponse<Customer>>("/customers", { params });
        return res.data;
      }
    } catch {}

    let list = realtimeStore.getCustomers();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    const page = params?.page || 1;
    const perPage = params?.per_page || 20;
    const total = list.length;
    const from = (page - 1) * perPage;
    const paginated = list.slice(from, from + perPage);

    return {
      data: paginated,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
      total,
      from: from + 1,
      to: Math.min(from + perPage, total),
    };
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Customer>("/customers", data);
        return res.data;
      }
    } catch {}

    return realtimeStore.saveCustomer(data);
  },

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.put<Customer>(`/customers/${id}`, data);
        return res.data;
      }
    } catch {}

    return realtimeStore.saveCustomer({ ...data, id });
  },
};
