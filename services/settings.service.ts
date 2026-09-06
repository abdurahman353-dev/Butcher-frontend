import apiClient from "./api";
import { ShopSettings } from "@/types";

export const settingsService = {
  async getSettings(): Promise<ShopSettings> {
    const res = await apiClient.get<ShopSettings>("/settings");
    return res.data;
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    const res = await apiClient.put<ShopSettings>("/settings", settings);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },
};
