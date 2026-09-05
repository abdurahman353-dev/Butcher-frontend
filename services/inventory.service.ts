import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import {
  InventoryMovement,
  WastageRecord,
  Product,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export const inventoryService = {
  async getMovements(params?: PaginationParams): Promise<PaginatedResponse<InventoryMovement>> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<PaginatedResponse<InventoryMovement>>("/inventory/movements", {
          params,
        });
        return res.data;
      }
    } catch {}

    let list = realtimeStore.getMovements();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.product_name.toLowerCase().includes(q) ||
          m.user_name.toLowerCase().includes(q) ||
          (m.reason && m.reason.toLowerCase().includes(q))
      );
    }

    if (params?.status && params.status !== "all") {
      list = list.filter((m) => m.type === params.status);
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

  async stockIn(payload: {
    product_id: number;
    quantity: number;
    buying_cost: number;
    notes?: string;
  }): Promise<Product> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Product>("/inventory/stock-in", payload);
        return res.data;
      }
    } catch {}

    return realtimeStore.stockIn(payload);
  },

  async adjustStock(payload: {
    product_id: number;
    adjustment_kg: number;
    reason: string;
    notes?: string;
  }): Promise<Product> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Product>("/inventory/adjust", payload);
        return res.data;
      }
    } catch {}

    return realtimeStore.adjustStock(payload);
  },

  async getWastage(): Promise<WastageRecord[]> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<WastageRecord[]>("/inventory/wastage");
        return res.data;
      }
    } catch {}

    return realtimeStore.getWastage();
  },

  async recordWastage(payload: {
    product_id: number;
    quantity: number;
    reason: "Spoilage" | "Damage" | "Trimming" | "Expired" | "Other";
    notes?: string;
  }): Promise<WastageRecord> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<WastageRecord>("/inventory/wastage", payload);
        return res.data;
      }
    } catch {}

    return realtimeStore.recordWastage(payload);
  },
};
