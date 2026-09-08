import apiClient from "./api";
import { Shift } from "@/types";

export interface ShiftHistoryParams {
  status?: string;
  cashier_id?: string | number;
  start_date?: string;
  end_date?: string;
  discrepancy?: string;
  search?: string;
}

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

  async getShiftHistory(params?: ShiftHistoryParams): Promise<Shift[]> {
    const res = await apiClient.get<Shift[]>("/shifts", { params });
    return res.data;
  },
};

