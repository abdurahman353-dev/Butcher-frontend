import apiClient from "./api";
import {
  InventoryMovement,
  WastageRecord,
  Product,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export const inventoryService = {
  async getMovements(params?: PaginationParams): Promise<PaginatedResponse<InventoryMovement>> {
    const res = await apiClient.get<PaginatedResponse<InventoryMovement>>("/inventory/movements", {
      params,
    });
    return res.data;
  },

  async stockIn(payload: {
    product_id: number;
    quantity: number;
    buying_cost?: number;
    notes?: string;
  }): Promise<Product> {
    const res = await apiClient.post<Product>("/inventory/stock-in", payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async adjustStock(payload: {
    product_id: number;
    adjustment_kg: number;
    reason: string;
    notes?: string;
  }): Promise<Product> {
    const res = await apiClient.post<Product>("/inventory/adjust", payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async getWastage(): Promise<WastageRecord[]> {
    const res = await apiClient.get<WastageRecord[]>("/inventory/wastage");
    return res.data;
  },

  async recordWastage(payload: {
    product_id: number;
    quantity: number;
    reason: "Spoilage" | "Damage" | "Trimming" | "Expired" | "Other";
    notes?: string;
  }): Promise<WastageRecord> {
    const res = await apiClient.post<WastageRecord>("/inventory/wastage", payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },
};
