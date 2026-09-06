import apiClient from "./api";
import { DashboardSummary } from "@/types";

export const reportsService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<DashboardSummary>("/dashboard/summary");
    return res.data;
  },

  async getReportAnalytics(period: "today" | "7days" | "30days" = "today"): Promise<any> {
    const res = await apiClient.get("/reports/analytics", { params: { period } });
    return res.data;
  },
};
