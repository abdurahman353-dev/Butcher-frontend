"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { reportsService, ReportAnalyticsData } from "@/services/reports.service";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { usePolling } from "@/hooks/usePolling";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  AlertTriangle,
  Calendar,
  Filter,
  Printer,
  RefreshCw,
  Scale,
  Receipt,
  X,
  ChevronDown,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type PeriodPreset = "today" | "yesterday" | "7days" | "30days" | "this_month" | "all" | "custom";
type MetricView = "revenue" | "weight" | "profit";

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [cashierId, setCashierId] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [analytics, setAnalytics] = useState<ReportAnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartMetric, setChartMetric] = useState<MetricView>("revenue");

  // Load cached analytics on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_reports");
      if (cached) setAnalytics(JSON.parse(cached));
    } catch {}
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const params: any = { period };
      if (period === "custom") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      if (paymentMethod !== "all") params.payment_method = paymentMethod;
      if (categoryId !== "all") params.category_id = categoryId;
      if (cashierId !== "all") params.cashier_id = cashierId;

      const data = await reportsService.getReportAnalytics(params);
      setAnalytics(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_cached_reports", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to load report analytics:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [period, startDate, endDate, paymentMethod, categoryId, cashierId]);

  // Real-time polling every 10s
  usePolling(fetchAnalytics, 10000);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const handleApplyCustomDates = () => {
    if (startDate && endDate) {
      setPeriod("custom");
      fetchAnalytics();
    }
  };

  const clearAllFilters = () => {
    setPeriod("today");
    setStartDate("");
    setEndDate("");
    setPaymentMethod("all");
    setCategoryId("all");
    setCashierId("all");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (period !== "today") count++;
    if (paymentMethod !== "all") count++;
    if (categoryId !== "all") count++;
    if (cashierId !== "all") count++;
    if (period === "custom" && (startDate || endDate)) count++;
    return count;
  }, [period, paymentMethod, categoryId, cashierId, startDate, endDate]);

  const totalRevenue = analytics?.revenue || 0;
  const cashAmount = analytics?.payment_breakdown?.cash || 0;
  const mpesaAmount = analytics?.payment_breakdown?.mpesa || 0;
  const cardAmount = analytics?.payment_breakdown?.card || 0;

  const cashPercent =
    analytics?.payment_breakdown?.percentages?.cash ??
    (totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 0);
  const mpesaPercent =
    analytics?.payment_breakdown?.percentages?.mpesa ??
    (totalRevenue > 0 ? Math.round((mpesaAmount / totalRevenue) * 100) : 0);
  const cardPercent =
    analytics?.payment_breakdown?.percentages?.card ??
    (totalRevenue > 0 ? Math.round((cardAmount / totalRevenue) * 100) : 0);

  const cashCount = analytics?.payment_breakdown?.counts?.cash ?? 0;
  const mpesaCount = analytics?.payment_breakdown?.counts?.mpesa ?? 0;
  const cardCount = analytics?.payment_breakdown?.counts?.card ?? 0;

  // Export to CSV Function
  const handleExportCSV = () => {
    if (!analytics) return;

    const rows = [
      ["PRIME CUT BUTCHER - PERFORMANCE & FINANCIAL REPORT"],
      [`Generated At:`, new Date().toLocaleString()],
      [`Period:`, period.toUpperCase()],
      [`Date Range:`, `${analytics.start_date || "N/A"} to ${analytics.end_date || "N/A"}`],
      [],
      ["EXECUTIVE SUMMARY"],
      ["Metric", "Value"],
      ["Total Gross Revenue", formatCurrency(analytics.revenue)],
      ["Total Transactions", analytics.transactions.toString()],
      ["Average Order Value", formatCurrency(analytics.average_order_value || 0)],
      ["Total Volume Sold", `${analytics.total_weight || 0} KG`],
      ["Gross Profit", formatCurrency(analytics.gross_profit || analytics.estimated_profit || 0)],
      ["Gross Margin %", `${analytics.gross_margin || 0}%`],
      ["Net Profit (After Wastage)", formatCurrency(analytics.net_profit || 0)],
      ["Wastage Cost Loss", formatCurrency(analytics.wastage_cost || 0)],
      ["Wastage Weight Lost", `${analytics.wastage_weight || 0} KG`],
      ["Discounts Given", formatCurrency(analytics.total_discount || 0)],
      [],
      ["PAYMENT METHOD TENDER SPLIT"],
      ["Method", "Amount", "Transactions", "Share %"],
      ["Cash", cashAmount.toString(), cashCount.toString(), `${cashPercent}%`],
      ["M-Pesa", mpesaAmount.toString(), mpesaCount.toString(), `${mpesaPercent}%`],
      ["Card", cardAmount.toString(), cardCount.toString(), `${cardPercent}%`],
      [],
      ["TOP PERFORMING CUTS"],
      ["Cut Name", "Category", "Weight Sold (KG)", "Revenue (KSh)", "Profit (KSh)", "Margin %"],
      ...(analytics.top_products || []).map((p) => [
        p.name,
        p.category,
        p.weight.toString(),
        p.revenue.toString(),
        p.profit.toString(),
        `${p.margin_percent}%`,
      ]),
      [],
      ["CATEGORY PERFORMANCE"],
      ["Category", "Weight (KG)", "Revenue (KSh)", "Profit (KSh)", "Share %"],
      ...(analytics.category_breakdown || []).map((c) => [
        c.name,
        c.weight.toString(),
        c.revenue.toString(),
        c.profit.toString(),
        `${c.percent}%`,
      ]),
      [],
      ["STAFF / CASHIER PERFORMANCE"],
      ["Staff Member", "Transactions", "Total Revenue (KSh)", "Weight Sold (KG)", "Average Order"],
      ...(analytics.cashier_breakdown || []).map((c) => [
        c.name,
        c.transactions.toString(),
        c.revenue.toString(),
        c.weight.toString(),
        formatCurrency(c.aov || 0),
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `butcher_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto select-none print:p-0 print:max-w-full">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-200 pb-4 sm:pb-5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-700 flex items-center justify-center border border-green-600/20 shrink-0">
            <BarChart3 className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
                Executive Performance & Financial Analytics
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Real-time revenue, margins, wastage audits, tender breakdowns, and sales volume.
            </p>
          </div>
        </div>

        {/* Action Buttons: on mobile, balanced full-width grid */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto print:hidden">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="h-10 px-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-10 px-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-10 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── RESPONSIVE FILTER BAR ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden print:hidden">
        {/* Presets and Filter toggles */}
        <div className="p-3 sm:p-4 border-b border-zinc-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-50/50">
          {/* Scrollable preset chips on phones */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Calendar className="w-3 h-3" /> Range:
            </span>
            {(
              [
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "7days", label: "Past 7D" },
                { key: "30days", label: "Past 30D" },
                { key: "this_month", label: "This Month" },
                { key: "all", label: "All Time" },
                { key: "custom", label: "Custom" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPeriod(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  period === tab.key
                    ? "bg-green-600 text-white shadow-xs"
                    : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>More Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
              />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range & Advanced Filters */}
        {(period === "custom" || showAdvancedFilters) && (
          <div className="p-3 sm:p-4 bg-white border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("custom");
                }}
                className="w-full h-10 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod("custom");
                }}
                className="w-full h-10 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* Payment Method Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
              >
                <option value="all">All Payment Types</option>
                <option value="cash">💵 Cash Only</option>
                <option value="mpesa">📱 M-Pesa Only</option>
                <option value="card">💳 Card Only</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Meat Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
              >
                <option value="all">All Categories</option>
                {(analytics?.filter_options?.categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cashier Filter */}
            {showAdvancedFilters && (
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Cashier Station
                </label>
                <select
                  value={cashierId}
                  onChange={(e) => setCashierId(e.target.value)}
                  className="w-full h-10 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                >
                  <option value="all">All Staff Members</option>
                  {(analytics?.filter_options?.cashiers || []).map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.name} {usr.role ? `(${usr.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Apply button if custom dates */}
            {period === "custom" && (
              <div className="flex items-end sm:col-span-2 lg:col-span-2">
                <button
                  type="button"
                  onClick={handleApplyCustomDates}
                  className="w-full h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Apply Date Range
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Badges */}
        {activeFiltersCount > 0 && (
          <div className="px-3 sm:px-4 py-2 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active:</span>
            {period !== "today" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-800 text-[11px] font-semibold">
                {period.replace("_", " ").toUpperCase()}
                <button onClick={() => setPeriod("today")} className="hover:text-green-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {paymentMethod !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                {paymentMethod.toUpperCase()}
                <button onClick={() => setPaymentMethod("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {categoryId !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                Category
                <button onClick={() => setCategoryId("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {cashierId !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-semibold">
                Cashier
                <button onClick={() => setCashierId("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 6 EXECUTIVE KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* CARD 1: Gross Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Total Gross Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tabular-nums tracking-tight">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span>{analytics?.transactions || 0} completed orders</span>
              <span className="font-semibold text-zinc-700">
                AOV: {formatCurrency(analytics?.average_order_value || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Estimated Gross Profit & Margin */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Gross Profit & Margin
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 tabular-nums tracking-tight">
              {formatCurrency(analytics?.gross_profit || analytics?.estimated_profit || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {analytics?.gross_margin || 0}% Margin
              </span>
              <span>Based on Buying Cost</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Net Butcher Profit (Post Wastage) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Net Profit (After Waste)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-blue-700 tabular-nums tracking-tight">
              {formatCurrency(analytics?.net_profit ?? (analytics?.gross_profit || 0) - (analytics?.wastage_cost || 0))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span>Gross Profit minus Wastage</span>
              <span className="font-semibold text-blue-700">Net Bottom Line</span>
            </div>
          </div>
        </div>

        {/* CARD 4: Total Volume Sold (KG) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Total Meat Volume Sold
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-700 tabular-nums tracking-tight">
              {formatWeight(analytics?.total_weight || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span>Across all cuts</span>
              <span className="font-semibold text-zinc-700">
                Avg:{" "}
                {analytics?.transactions
                  ? formatWeight((analytics.total_weight || 0) / analytics.transactions)
                  : "0 KG"}{" "}
                / order
              </span>
            </div>
          </div>
        </div>

        {/* CARD 5: Wastage & Loss */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Reported Wastage Loss
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-rose-600 tabular-nums tracking-tight">
              {formatCurrency(analytics?.wastage_cost || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span>{formatWeight(analytics?.wastage_weight || 0)} lost</span>
              <span className="font-semibold text-rose-600">
                {totalRevenue > 0
                  ? `${(((analytics?.wastage_cost || 0) / totalRevenue) * 100).toFixed(1)}% of sales`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 6: Discounts Given */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Discounts Conceded
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-purple-700 tabular-nums tracking-tight">
              {formatCurrency(analytics?.total_discount || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
              <span>Customer price cuts</span>
              <span className="font-semibold text-purple-700">Loyalty & Promos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SALES TREND CHART & PAYMENT METHOD SPLIT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* TREND VISUALIZER (2 COLS) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                {chartMetric === "revenue"
                  ? "Revenue Trend Over Time"
                  : chartMetric === "weight"
                  ? "Meat Volume Sold (KG) Over Time"
                  : "Gross Profit Trend"}
              </h2>
              <p className="text-xs text-zinc-500">Timeline dynamics for active filtered timeframe</p>
            </div>

            {/* Metric Switcher: full-width on mobile */}
            <div className="grid grid-cols-3 sm:flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setChartMetric("revenue")}
                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all sm:px-2.5 ${
                  chartMetric === "revenue"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("weight")}
                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all sm:px-2.5 ${
                  chartMetric === "weight"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Weight
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("profit")}
                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all sm:px-2.5 ${
                  chartMetric === "profit"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Profit
              </button>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {analytics?.sales_trend && analytics.sales_trend.length > 0 ? (
                <AreaChart
                  data={analytics.sales_trend}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={
                          chartMetric === "revenue"
                            ? "#16a34a"
                            : chartMetric === "weight"
                            ? "#d97706"
                            : "#2563eb"
                        }
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={
                          chartMetric === "revenue"
                            ? "#16a34a"
                            : chartMetric === "weight"
                            ? "#d97706"
                            : "#2563eb"
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) =>
                      chartMetric === "weight" ? `${val}kg` : `KSh ${val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e4e4e7",
                      borderRadius: "12px",
                      color: "#18181b",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                    }}
                    formatter={(val: any) => [
                      chartMetric === "weight" ? formatWeight(val) : formatCurrency(val),
                      chartMetric === "revenue"
                        ? "Revenue"
                        : chartMetric === "weight"
                        ? "Volume Sold"
                        : "Profit",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={
                      chartMetric === "revenue"
                        ? "#16a34a"
                        : chartMetric === "weight"
                        ? "#d97706"
                        : "#2563eb"
                    }
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                  />
                </AreaChart>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                  No sales data recorded for this period.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAYMENT TENDER BREAKDOWN (1 COL) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Tender Share Breakdown</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Real-time payment collection channels</p>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pt-1">
            {/* CASH */}
            <div className="p-3 sm:p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <span>Cash Tender</span>
                </span>
                <span className="font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(cashAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{cashCount} transactions</span>
                <span className="font-bold text-emerald-700">{cashPercent}% share</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${cashPercent}%` }}
                />
              </div>
            </div>

            {/* M-PESA */}
            <div className="p-3 sm:p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span>M-Pesa Mobile</span>
                </span>
                <span className="font-bold text-green-700 tabular-nums">
                  {formatCurrency(mpesaAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{mpesaCount} transactions</span>
                <span className="font-bold text-green-700">{mpesaPercent}% share</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${mpesaPercent}%` }}
                />
              </div>
            </div>

            {/* CARD */}
            <div className="p-3 sm:p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <span>Credit / Debit Card</span>
                </span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {formatCurrency(cardAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{cardCount} transactions</span>
                <span className="font-bold text-blue-700">{cardPercent}% share</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${cardPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP PERFORMING MEAT CUTS TABLE ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              Top Selling Meat Cuts & Profit Margins
            </h2>
            <p className="text-xs text-zinc-500">
              Ranked by revenue contribution, volume sold, and profit margin
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-500">
            {analytics?.top_products?.length || 0} Cuts Recorded
          </span>
        </div>

        {/* Scrollable table container for small screens */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 pl-4"># Rank</th>
                <th className="py-3.5 px-3">Meat Cut Name</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3 text-right">Volume Sold</th>
                <th className="py-3.5 px-3 text-right">Total Revenue</th>
                <th className="py-3.5 px-3 text-right">Estimated Cost</th>
                <th className="py-3.5 px-3 text-right">Gross Profit</th>
                <th className="py-3.5 pr-4 text-center">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!analytics?.top_products || analytics.top_products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
                    No sales recorded for the selected filter range.
                  </td>
                </tr>
              ) : (
                analytics.top_products.map((prod, idx) => (
                  <tr key={prod.id || idx} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 pl-4 font-bold text-zinc-400">
                      <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-900">{prod.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-semibold">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-zinc-900 tabular-nums">
                      {formatWeight(prod.weight)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-zinc-900 tabular-nums">
                      {formatCurrency(prod.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                      {formatCurrency(prod.cost || 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(prod.profit || 0)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          prod.margin_percent >= 30
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : prod.margin_percent >= 20
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {prod.margin_percent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TWO-COLUMN DETAILED AUDITS: CATEGORY & CASHIERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category Performance Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Meat Category Performance</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Revenue and weight distribution</p>
          </div>

          <div className="space-y-3">
            {!analytics?.category_breakdown || analytics.category_breakdown.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No categories recorded.</p>
            ) : (
              analytics.category_breakdown.map((cat) => (
                <div key={cat.name} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-900">{cat.name}</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                      {formatCurrency(cat.revenue)} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{formatWeight(cat.weight)} moved</span>
                    <span className="text-emerald-700 font-semibold">
                      Profit: {formatCurrency(cat.profit)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cashier Station Performance Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Staff / Cashier Audit</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Orders rung up per station</p>
          </div>

          <div className="space-y-3">
            {!analytics?.cashier_breakdown || analytics.cashier_breakdown.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No cashier data recorded.</p>
            ) : (
              analytics.cashier_breakdown.map((cashier) => (
                <div
                  key={cashier.id || cashier.name}
                  className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-xs">
                      {cashier.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 text-xs">{cashier.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {cashier.transactions} sales • {formatWeight(cashier.weight)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900 text-xs tabular-nums">
                      {formatCurrency(cashier.revenue)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      AOV: {formatCurrency(cashier.aov)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── WASTAGE & LOSS AUDIT TRAIL SUMMARY ── */}
      {analytics?.wastage_breakdown && analytics.wastage_breakdown.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Wastage & Loss Reason Audit
              </h2>
              <p className="text-xs text-zinc-500">
                Detailed breakdown of inventory lost during this timeframe
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600">
              Total: {formatCurrency(analytics.wastage_cost)} ({formatWeight(analytics.wastage_weight)})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            {analytics.wastage_breakdown.map((w) => (
              <div key={w.reason} className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                <span className="text-[11px] font-bold text-rose-700 uppercase">{w.reason}</span>
                <div className="text-base font-black text-rose-600 mt-1 tabular-nums">
                  {formatCurrency(w.cost)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {formatWeight(w.weight)} lost across {w.count} incident(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
