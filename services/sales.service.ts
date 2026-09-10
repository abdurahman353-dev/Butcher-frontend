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

  async partialRefundSale(
    id: number,
    data: {
      reason: string;
      items: Array<{ sale_item_id: number; refund_weight: number }>;
    }
  ): Promise<Sale> {
    const res = await apiClient.post<Sale>(`/sales/${id}/partial-refund`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async settlePayment(
    id: number,
    data: {
      payment_method: "cash" | "mpesa" | "card";
      amount_received?: number;
      mpesa_reference?: string;
      card_reference?: string;
      notes?: string;
    }
  ): Promise<Sale> {
    const res = await apiClient.post<Sale>(`/sales/${id}/settle`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },
};
