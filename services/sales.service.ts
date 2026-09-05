import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { Sale, PaginatedResponse, PaginationParams } from "@/types";

export const salesService = {
  async getSales(params?: PaginationParams): Promise<PaginatedResponse<Sale>> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<PaginatedResponse<Sale>>("/sales", { params });
        return res.data;
      }
    } catch {}

    let list = realtimeStore.getSales();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.sale_number.toLowerCase().includes(q) ||
          (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
          s.cashier_name.toLowerCase().includes(q)
      );
    }

    if (params?.payment_method && params.payment_method !== "all") {
      list = list.filter((s) => s.payment_method === params.payment_method);
    }

    if (params?.status && params.status !== "all") {
      list = list.filter((s) => s.sale_status === params.status);
    }

    if (params?.date_from) {
      const from = new Date(params.date_from).getTime();
      list = list.filter((s) => new Date(s.created_at).getTime() >= from);
    }

    if (params?.date_to) {
      const to = new Date(params.date_to).getTime() + 86400000;
      list = list.filter((s) => new Date(s.created_at).getTime() <= to);
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

  async getSaleById(id: number): Promise<Sale | undefined> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<Sale>(`/sales/${id}`);
        return res.data;
      }
    } catch {}
    return realtimeStore.getSaleById(id);
  },

  async refundSale(id: number, reason: string): Promise<Sale> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Sale>(`/sales/${id}/refund`, { reason });
        return res.data;
      }
    } catch {}
    return realtimeStore.refundSale(id, reason);
  },
};
