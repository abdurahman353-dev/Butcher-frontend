import apiClient from "./api";
import { DashboardSummary } from "@/types";

export interface ReportAnalyticsParams {
  period?: "today" | "yesterday" | "7days" | "30days" | "this_month" | "last_month" | "all" | "custom";
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  cashier_id?: string | number;
  category_id?: string | number;
}

export interface ReportAnalyticsData {
  period: string;
  start_date?: string;
  end_date?: string;
  revenue: number;
  transactions: number;
  gross_profit: number;
  estimated_profit: number;
  gross_margin: number;
  net_profit: number;
  total_weight: number;
  total_discount: number;
  average_order_value: number;
  payment_breakdown: {
    cash: number;
    mpesa: number;
    card: number;
    counts?: {
      cash: number;
      mpesa: number;
      card: number;
    };
    percentages?: {
      cash: number;
      mpesa: number;
      card: number;
    };
  };
  top_products: Array<{
    id: number;
    name: string;
    category: string;
    weight: number;
    revenue: number;
    cost: number;
    profit: number;
    margin_percent: number;
  }>;
  category_breakdown: Array<{
    name: string;
    weight: number;
    revenue: number;
    profit: number;
    percent: number;
  }>;
  cashier_breakdown: Array<{
    id: number;
    name: string;
    transactions: number;
    revenue: number;
    weight: number;
    aov: number;
  }>;
  wastage_cost: number;
  wastage_weight: number;
  wastage_breakdown: Array<{
    reason: string;
    count: number;
    weight: number;
    cost: number;
  }>;
  sales_trend: Array<{
    label: string;
    date: string;
    revenue: number;
    weight: number;
    profit: number;
    transactions: number;
  }>;
  itemized_categories?: Array<{
    category_name: string;
    items: Array<{
      name: string;
      qty: number;
      price: number;
      discount: number;
    }>;
    subtotal_qty: number;
    subtotal_price: number;
    subtotal_discount: number;
  }>;
  filter_options?: {
    categories: Array<{ id: number; name: string }>;
    cashiers: Array<{ id: number; name: string; role?: string }>;
  };
}

export const reportsService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<DashboardSummary>("/dashboard/summary");
    return res.data;
  },

  async getReportAnalytics(params?: ReportAnalyticsParams | string): Promise<ReportAnalyticsData> {
    const queryParams = typeof params === "string" ? { period: params } : params;
    const res = await apiClient.get<ReportAnalyticsData>("/reports/analytics", { params: queryParams });
    return res.data;
  },
};
