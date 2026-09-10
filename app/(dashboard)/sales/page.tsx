"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { salesService } from "@/services/sales.service";
import { reportsService } from "@/services/reports.service";
import { Sale, PaginatedResponse } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { usePolling } from "@/hooks/usePolling";
import {
  Search,
  Eye,
  Printer,
  Receipt,
  Calendar,
  Filter,
  X,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  User,
  Banknote,
  Smartphone,
  CreditCard,
  Layers,
  ChevronDown,
} from "lucide-react";

export default function SalesPage() {
  const [paginated, setPaginated] = useState<PaginatedResponse<Sale>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAmountFilters, setShowAmountFilters] = useState(false);
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cached sales on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_sales");
      if (cached) setPaginated(JSON.parse(cached));
    } catch { }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage,
        per_page: perPage,
        sort_by: sortBy,
        sort_direction: sortDirection,
      };

      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (paymentFilter !== "all") params.payment_method = paymentFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (cashierFilter !== "all") params.cashier_id = cashierFilter;
      if (minAmount) params.min_amount = minAmount;
      if (maxAmount) params.max_amount = maxAmount;

      const res = await salesService.getSales(params);
      setPaginated(res);

      if (
        typeof window !== "undefined" &&
        currentPage === 1 &&
        !search &&
        !dateFrom &&
        !dateTo &&
        paymentFilter === "all" &&
        statusFilter === "all" &&
        cashierFilter === "all"
      ) {
        localStorage.setItem("butcher_cached_sales", JSON.stringify(res));
      }
    } catch (e) {
      console.error("Failed to load sales:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    currentPage,
    perPage,
    search,
    dateFrom,
    dateTo,
    paymentFilter,
    statusFilter,
    cashierFilter,
    minAmount,
    maxAmount,
    sortBy,
    sortDirection,
  ]);

  // Reactive Debounced Auto-Fetch on any filter or page change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSales();
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchSales]);

  // Real-time polling every 12s with current active filters
  usePolling(fetchSales, 12000);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchSales();
  };

  // Quick Date Range Setters
  const setQuickDate = (range: "today" | "yesterday" | "week" | "month" | "all") => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const now = new Date(Date.now() - tzOffset);

    if (range === "today") {
      const d = now.toISOString().slice(0, 10);
      setDateFrom(d);
      setDateTo(d);
    } else if (range === "yesterday") {
      const y = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      setDateFrom(y);
      setDateTo(y);
    } else if (range === "week") {
      const w = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
      setDateFrom(w);
      setDateTo(now.toISOString().slice(0, 10));
    } else if (range === "month") {
      const m = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setDateFrom(m);
      setDateTo(now.toISOString().slice(0, 10));
    } else if (range === "all") {
      setDateFrom("");
      setDateTo("");
    }
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("all");
    setStatusFilter("all");
    setCashierFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("created_at");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (paymentFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (cashierFilter !== "all") count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    return count;
  }, [search, dateFrom, dateTo, paymentFilter, statusFilter, cashierFilter, minAmount, maxAmount]);

  // Export Filtered Records to CSV
  const handleExportCSV = () => {
    if (paginated.data.length === 0) return;

    const rows = [
      ["PRIME CUT BUTCHER - TRANSACTION SALES AUDIT REPORT"],
      [`Exported At:`, new Date().toLocaleString()],
      [
        `Active Date Range:`,
        dateFrom || dateTo ? `${dateFrom || "Start"} to ${dateTo || "End"}` : "All Records",
      ],
      [`Matching Records:`, paginated.total.toString()],
      [],
      [
        "Sale Number",
        "Date Time",
        "Cashier",
        "Customer Name",
        "Customer Phone",
        "Payment Tender",
        "Subtotal (KSh)",
        "Discount (KSh)",
        "Total Amount (KSh)",
        "Sale Status",
        "Items Count",
      ],
      ...paginated.data.map((s) => [
        s.sale_number,
        formatDateTime(s.created_at),
        s.cashier_name || "N/A",
        s.customer_name || "Walk-in",
        s.customer_phone || "",
        s.payment_method.toUpperCase(),
        s.subtotal.toString(),
        s.discount.toString(),
        s.total.toString(),
        s.sale_status.toUpperCase(),
        s.items?.length?.toString() || "0",
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sales_ledger_${dateFrom || "all"}_${dateTo || "time"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Day's Sales PDF Report
  const handleDownloadDayPDF = async () => {
    try {
      setIsLoading(true);
      const selectedDate = dateFrom || new Date().toISOString().slice(0, 10);
      const analytics = await reportsService.getReportAnalytics({
        start_date: selectedDate,
        end_date: selectedDate,
      });

      const dateStr = new Date(selectedDate).toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
      const fK = (n: number) => `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const fW = (n: number) => `${Number(n).toFixed(2)} KG`;

      const itemizedHTML = (analytics.itemized_categories || [])
        .map(
          (cat) => `
        <div style="margin-bottom:14px">
          <table style="width:100%;border-collapse:collapse;font-size:10.5px">
            <thead>
              <tr style="background:#14532d"><th colspan="4" style="color:#fff;padding:8px 12px;font-size:10px;font-weight:800;letter-spacing:1px;text-align:left;border:none">${cat.category_name}</th></tr>
              <tr style="background:#dcfce7"><th style="padding:7px 10px;border:1px solid #e5e7eb;font-size:9px;color:#14532d">Item / Cut</th><th style="padding:7px 10px;border:1px solid #e5e7eb;font-size:9px;color:#14532d;text-align:right">Qty (KG)</th><th style="padding:7px 10px;border:1px solid #e5e7eb;font-size:9px;color:#14532d;text-align:right">Amount</th><th style="padding:7px 10px;border:1px solid #e5e7eb;font-size:9px;color:#14532d;text-align:right">Discount</th></tr>
            </thead>
            <tbody>${cat.items
              .map(
                (it) =>
                  `<tr><td style="padding:6px 10px;border:1px solid #f3f4f6">${it.name}</td><td style="padding:6px 10px;border:1px solid #f3f4f6;text-align:right">${fW(it.qty)}</td><td style="padding:6px 10px;border:1px solid #f3f4f6;text-align:right">${fK(it.price)}</td><td style="padding:6px 10px;border:1px solid #f3f4f6;text-align:right">${it.discount > 0 ? fK(it.discount) : "-"}</td></tr>`
              )
              .join("")}</tbody>
            <tfoot><tr style="background:#f0fdf4;border-top:2px solid #16a34a"><td style="padding:7px 10px;border:1px solid #e5e7eb;font-weight:700;color:#14532d">SUBTOTAL — ${cat.category_name}</td><td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#14532d">${fW(cat.subtotal_qty)}</td><td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#14532d">${fK(cat.subtotal_price)}</td><td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#14532d">${cat.subtotal_discount > 0 ? fK(cat.subtotal_discount) : "-"}</td></tr></tfoot>
          </table>
        </div>`
        )
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily Sales PDF Report - ${selectedDate}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',Arial,sans-serif;font-size:11px;color:#1a1a1a}@media print{.no-print{display:none!important}}</style></head><body>
<div style="background:linear-gradient(135deg,#14532d,#15803d);color:#fff;padding:28px 32px 24px;display:flex;justify-content:space-between;align-items:flex-start">
  <div><div style="font-size:22px;font-weight:900">🥩 PRIME CUT BUTCHER</div><div style="font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-top:3px">Premium Meat Shop — Daily Sales PDF</div></div>
  <div style="text-align:right"><div style="font-size:14px;font-weight:800">DAILY SALES EXECUTIVE REPORT</div><div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:4px">Report Date: ${dateStr}</div><div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase">Generated: ${timeStr}</div></div>
</div>
<div style="display:flex;background:#f8fafb;border-bottom:2px solid #e5e7eb">
  <div style="flex:1;padding:14px 18px;border-right:1px solid #e5e7eb"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#6b7280">Gross Sales</div><div style="font-size:16px;font-weight:900;color:#15803d;margin-top:3px">${fK(analytics.revenue)}</div><div style="font-size:9px;color:#9ca3af;margin-top:2px">${analytics.transactions} orders</div></div>
  <div style="flex:1;padding:14px 18px;border-right:1px solid #e5e7eb"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#6b7280">Gross Profit</div><div style="font-size:16px;font-weight:900;color:#15803d;margin-top:3px">${fK(analytics.gross_profit || 0)}</div><div style="font-size:9px;color:#9ca3af;margin-top:2px">Margin: ${analytics.gross_margin || 0}%</div></div>
  <div style="flex:1;padding:14px 18px;border-right:1px solid #e5e7eb"><div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:#6b7280">Volume Sold</div><div style="font-size:16px;font-weight:900;color:#b45309;margin-top:3px">${fW(analytics.total_weight || 0)}</div><div style="font-size:9px;color:#9ca3af;margin-top:2px">AOV: ${fK(analytics.average_order_value || 0)}</div></div>
</div>
<div style="padding:20px 28px">
  <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#374151;border-bottom:2px solid #16a34a;padding:6px 0;margin:10px 0 10px">Itemized Cut Sales Ledger</div>
  ${itemizedHTML || `<p style="padding:10px;color:#666">No sales transactions logged for ${selectedDate}.</p>`}
</div>
<script>window.onload=function(){window.print();};<\/script></body></html>`;

      const win = window.open("", "_blank", "width=1100,height=750");
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (e: any) {
      console.error("Failed to generate day's PDF:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Selected Cashier Name for Badge
  const selectedCashierName = useMemo(() => {
    if (cashierFilter === "all") return null;
    return paginated.filter_options?.cashiers?.find(
      (c) => String(c.id) === String(cashierFilter)
    )?.name || `Staff #${cashierFilter}`;
  }, [cashierFilter, paginated]);

  // Executive summary metrics (from backend aggregate or calculated)
  const summaryRevenue =
    paginated.summary?.total_revenue ??
    paginated.data
      .filter((s) => s.sale_status === "completed")
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

  const summaryCount = paginated.summary?.total_count ?? paginated.total;
  const completedCount =
    paginated.summary?.completed_count ??
    paginated.data.filter((s) => s.sale_status === "completed").length;

  const aov =
    paginated.summary?.average_order_value ??
    (completedCount > 0 ? summaryRevenue / completedCount : 0);

  const refundedAmount =
    paginated.summary?.refunded_amount ??
    paginated.data
      .filter((s) => s.sale_status === "refunded")
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

  const refundedCount =
    paginated.summary?.refunded_count ??
    paginated.data.filter((s) => s.sale_status === "refunded").length;

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto select-none print:p-0 print:max-w-full">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-200 pb-4 sm:pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-700 flex items-center justify-center border border-green-600/20 shrink-0 shadow-2xs">
            <Receipt className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
                Sales History & Financial Ledger
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> Live Audit
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Comprehensive real-time ledger for all POS butcher register transactions, payments, and returns.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh sales list"
            className="h-10 px-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-green-600" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDayPDF}
            className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Day Sales PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={paginated.data.length === 0}
            className="h-10 px-3.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <Link
            href="/pos"
            className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <span>+ New Sale</span>
          </Link>
        </div>
      </div>

      {/* ── 4 EXECUTIVE STAT KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: Filtered Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Filtered Gross Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums tracking-tight">
              {formatCurrency(summaryRevenue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-100">
              <span>{completedCount} completed orders</span>
              <span className="font-semibold text-green-700">Gross Sales</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Total Transactions */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-blue-700 tabular-nums tracking-tight">
              {summaryCount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-100">
              <span>Matching current filters</span>
              <span className="font-semibold text-blue-700">Ledger Count</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Average Order Value */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Average Order Value (AOV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums tracking-tight">
              {formatCurrency(aov)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-100">
              <span>Per customer ticket</span>
              <span className="font-semibold text-amber-700">Avg Ticket</span>
            </div>
          </div>
        </div>

        {/* CARD 4: Refunds & Returns */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Refunds & Returns
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums tracking-tight">
              {formatCurrency(refundedAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-100">
              <span>{refundedCount} tickets refunded</span>
              <span className="font-semibold text-rose-600">Reversed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADVANCED HIGH-CAPACITY FILTER CONSOLE ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden print:hidden">
        {/* Filter Console Header / Toggle */}
        <div className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 transition-colors ${isFilterOpen || activeFiltersCount > 0 ? "border-b border-zinc-200" : ""
          }`}>
          <div
            onClick={() => setIsFilterOpen((v) => !v)}
            className="flex items-center gap-2.5 cursor-pointer select-none group flex-1"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${isFilterOpen || activeFiltersCount > 0
              ? "bg-green-500/10 text-green-700 border-green-600/20"
              : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}>
              <Filter className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider group-hover:text-green-700 transition-colors">
                  Filter & Search Sales
                </span>
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white shadow-2xs">
                    {activeFiltersCount} Active
                  </span>
                )}
                {isLoading && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Querying...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                {isFilterOpen
                  ? "Click to collapse filter console"
                  : activeFiltersCount > 0
                    ? `Active filters applied (${activeFiltersCount}). Click to expand filters.`
                    : "Filter across tickets by date range, payment method, cashier, status, or amount."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all active:scale-95"
              >
                <X className="w-3 h-3" />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${isFilterOpen
                ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isFilterOpen ? "Close Filters" : "Open Filters"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Body */}
        {isFilterOpen && (
          <div className="divide-y divide-zinc-100">
            {/* Quick Date Presets */}
            <div className="px-3 sm:px-4 py-2.5 bg-zinc-50/50 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Quick Presets:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickDate("today")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all active:scale-95"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("yesterday")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all active:scale-95"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("week")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all active:scale-95"
                >
                  Past 7D
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("month")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all active:scale-95"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("all")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all active:scale-95"
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Primary Filter Grid */}
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3 bg-white">
              {/* Search Query: spans 2 cols */}
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3 text-zinc-400" /> Search Sales
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Sale #, customer, phone, staff, cut..."
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* From Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" /> From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              {/* To Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" /> To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              {/* Payment Method */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-zinc-400" /> Payment
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Payments</option>
                  <option value="cash">💵 Cash Only</option>
                  <option value="mpesa">📱 M-Pesa Only</option>
                  <option value="card">💳 Card Only</option>
                </select>
              </div>

              {/* Sale Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-zinc-400" /> Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Secondary Filters: Cashier, Amount Range, Sorting */}
            <div className="p-3 sm:p-4 bg-zinc-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-end">
              {/* Cashier / Staff */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-zinc-400" /> Cashier / Staff
                </label>
                <select
                  value={cashierFilter}
                  onChange={(e) => {
                    setCashierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Cashiers / Staff</option>
                  {(paginated.filter_options?.cashiers || []).map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.name} {usr.role ? `(${usr.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                  Min Total (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              {/* Max Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                  Max Total (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10000"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              {/* Sort By & Direction */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-zinc-400" /> Sort Records
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  >
                    <option value="created_at">Date Created</option>
                    <option value="total">Total Amount</option>
                    <option value="sale_number">Sale Number</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDirection((d) => (d === "desc" ? "asc" : "desc"))}
                    className="h-10 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs shrink-0 transition-all active:scale-95"
                    title={`Sorting: ${sortDirection === "desc" ? "Descending" : "Ascending"}`}
                  >
                    {sortDirection === "desc" ? "↓ DESC" : "↑ ASC"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Badges Bar */}
        {activeFiltersCount > 0 && (
          <div className="px-3 sm:px-4 py-2 bg-zinc-100/70 border-t border-zinc-200/80 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active:</span>

              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-medium">
                  🔍 &quot;{search}&quot;
                  <button onClick={() => setSearch("")} className="hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-800 text-[11px] font-semibold">
                  📅 {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `From ${dateFrom}` : `Up to ${dateTo}`}
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="hover:text-green-950 ml-0.5"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {paymentFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                  💳 {paymentFilter.toUpperCase()}
                  <button onClick={() => setPaymentFilter("all")} className="hover:text-blue-950 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                  🏷️ {statusFilter.toUpperCase()}
                  <button onClick={() => setStatusFilter("all")} className="hover:text-amber-950 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {cashierFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-semibold">
                  👤 {selectedCashierName}
                  <button onClick={() => setCashierFilter("all")} className="hover:text-purple-950 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(minAmount || maxAmount) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  💵 {minAmount && maxAmount ? `KSh ${minAmount} - ${maxAmount}` : minAmount ? `≥ KSh ${minAmount}` : `≤ KSh ${maxAmount}`}
                  <button
                    onClick={() => {
                      setMinAmount("");
                      setMaxAmount("");
                    }}
                    className="hover:text-emerald-950 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <span className="text-[11px] font-semibold text-zinc-500">
              Found {paginated.total.toLocaleString()} record{paginated.total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* ── MILLION DOLLAR SALES TRANSACTION LEDGER TABLE ── */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs relative">
        {/* Loading Progress Bar overlay */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-100 overflow-hidden z-10">
            <div className="w-full h-full bg-green-600 animate-pulse origin-left" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 pl-4">Sale #</th>
                <th className="py-3.5 px-3">Date & Time</th>
                <th className="py-3.5 px-3">Cashier / Staff</th>
                <th className="py-3.5 px-3">Customer Details</th>
                <th className="py-3.5 px-3">Payment Tender</th>
                <th className="py-3.5 px-3 text-right">Items / Cuts</th>
                <th className="py-3.5 px-3 text-right">Amount (KSh)</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-zinc-300 stroke-[1.5]" />
                      <p className="font-semibold text-zinc-600 text-sm">No sales records found</p>
                      <p className="text-xs text-zinc-400 max-w-sm">
                        No transactions match your current search and filter criteria. Try clearing dates or resetting filters.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold transition-all"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.data.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-zinc-50/80 transition-colors group"
                  >
                    {/* Sale # */}
                    <td className="py-3.5 pl-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="text-zinc-900 group-hover:text-green-700 hover:underline flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500/70 shrink-0" />
                        <span>{sale.sale_number}</span>
                      </Link>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-3 text-zinc-600 whitespace-nowrap">
                      <div className="font-medium text-zinc-800">{formatDateTime(sale.created_at)}</div>
                    </td>

                    {/* Cashier */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center border border-zinc-200">
                          {sale.cashier_name ? sale.cashier_name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <span className="font-semibold text-zinc-800 text-xs">
                          {sale.cashier_name || "Cashier"}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-zinc-800">
                        {sale.customer_name || "Walk-in Customer"}
                      </div>
                      {sale.customer_phone && (
                        <div className="text-[10px] text-zinc-400 tabular-nums">
                          {sale.customer_phone}
                        </div>
                      )}
                    </td>

                    {/* Payment Tender */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {sale.payment_method === "cash" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <Banknote className="w-3 h-3 text-emerald-600" /> Cash
                        </span>
                      ) : sale.payment_method === "mpesa" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-200 text-[11px] font-bold">
                          <Smartphone className="w-3 h-3 text-green-600" /> M-Pesa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                          <CreditCard className="w-3 h-3 text-blue-600" /> Card
                        </span>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-3 text-right text-zinc-600 tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-zinc-800">
                        {sale.items?.length ?? 0}
                      </span>{" "}
                      <span className="text-[11px] text-zinc-400">
                        {sale.items?.length === 1 ? "cut" : "cuts"}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-3 text-right font-black text-zinc-900 tabular-nums text-sm whitespace-nowrap">
                      {formatCurrency(sale.total)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <StatusBadge status={sale.sale_status} type="sale" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-all shadow-2xs active:scale-90"
                          title="View sale audit details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setViewingReceiptSale(sale)}
                          className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-green-50 text-zinc-700 hover:text-green-700 hover:border-green-300 transition-all shadow-2xs active:scale-90"
                          title="Print customer thermal receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="p-3 bg-zinc-50/70 border-t border-zinc-200">
          <Pagination
            currentPage={paginated.current_page}
            lastPage={paginated.last_page}
            total={paginated.total}
            from={paginated.from}
            to={paginated.to}
            perPage={perPage}
            onPageChange={(page) => setCurrentPage(page)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingReceiptSale}
        sale={viewingReceiptSale}
        onClose={() => setViewingReceiptSale(null)}
      />
    </div>
  );
}
