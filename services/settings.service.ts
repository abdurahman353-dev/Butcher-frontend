import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { ShopSettings } from "@/types";

export const settingsService = {
  async getSettings(): Promise<ShopSettings> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<ShopSettings>("/settings");
        return res.data;
      }
    } catch {}

    return realtimeStore.getSettings();
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.put<ShopSettings>("/settings", settings);
        return res.data;
      }
    } catch {}

    return realtimeStore.saveSettings(settings);
  },
};
