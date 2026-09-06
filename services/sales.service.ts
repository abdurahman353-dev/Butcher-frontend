import apiClient from "./api";
import { Sale, PaginatedResponse, PaginationParams } from "@/types";

export const salesService = {
  async getSales(params?: PaginationParams): Promise<PaginatedResponse<Sale>> {
    const res = await apiClient.get<PaginatedResponse<Sale>>("/sales", { params });
    return res.data;
  },

  async getSaleById(id: number): Promise<Sale | undefined> {
    const res = await apiClient.get<Sale>(`/sales/${id}`);
    return res.data;
  },

  async refundSale(id: number, reason: string): Promise<Sale> {
    const res = await apiClient.post<Sale>(`/sales/${id}/refund`, { reason });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },
};
