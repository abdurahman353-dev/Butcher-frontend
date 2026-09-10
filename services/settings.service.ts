import apiClient from "./api";
import { ShopSettings } from "@/types";

export const settingsService = {
  async getSettings(): Promise<ShopSettings> {
    const res = await apiClient.get<{ data: ShopSettings } | ShopSettings>("/settings");
    // Laravel JsonResource wraps the payload in a "data" key: { data: {...} }
    // Handle both wrapped and unwrapped responses defensively
    const body = res.data as any;
    return (body?.data ?? body) as ShopSettings;
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    const res = await apiClient.put<{ data: ShopSettings } | ShopSettings>("/settings", settings);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    const body = res.data as any;
    return (body?.data ?? body) as ShopSettings;
  },
};
