import apiClient from "./api";
import { Shift } from "@/types";

export const shiftsService = {
  async getCurrentShift(): Promise<Shift | null> {
    const res = await apiClient.get<Shift | null>("/shifts/current");
    return res.data;
  },

  async openShift(openingCash: number, notes?: string): Promise<Shift> {
    const res = await apiClient.post<Shift>("/shifts/open", {
      opening_cash: openingCash,
      notes,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async closeShift(countedCash: number, notes?: string): Promise<Shift> {
    const res = await apiClient.post<Shift>("/shifts/close", {
      counted_cash: countedCash,
      notes,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async getShiftHistory(): Promise<Shift[]> {
    const res = await apiClient.get<Shift[]>("/shifts");
    return res.data;
  },
};
