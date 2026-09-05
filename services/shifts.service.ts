import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { Shift } from "@/types";

export const shiftsService = {
  async getCurrentShift(): Promise<Shift | null> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<Shift>("/shifts/current");
        return res.data;
      }
    } catch {}

    return realtimeStore.getActiveShift();
  },

  async openShift(openingCash: number, notes?: string): Promise<Shift> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Shift>("/shifts/open", {
          opening_cash: openingCash,
          notes,
        });
        return res.data;
      }
    } catch {}

    return realtimeStore.openShift(openingCash, notes);
  },

  async closeShift(countedCash: number, notes?: string): Promise<Shift> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Shift>("/shifts/close", {
          counted_cash: countedCash,
          notes,
        });
        return res.data;
      }
    } catch {}

    return realtimeStore.closeShift(countedCash, notes);
  },

  async getShiftHistory(): Promise<Shift[]> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<Shift[]>("/shifts");
        return res.data;
      }
    } catch {}

    return realtimeStore.getShifts();
  },
};
