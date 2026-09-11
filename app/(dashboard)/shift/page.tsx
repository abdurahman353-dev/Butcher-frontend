"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useShift } from "@/hooks/useShift";
import { shiftsService } from "@/services/shifts.service";
import { Shift, Sale } from "@/types";
import apiClient from "@/services/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { roundTo } from "@/lib/math";
import { useSystemDialog } from "@/contexts/DialogContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShiftDetailsModal } from "@/components/shift/ShiftDetailsModal";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import {
  Clock,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Lock,
  Unlock,
  History,
  RefreshCw,
  Search,
  Receipt,
  Eye,
  X,
  User,
  ArrowRight,
  TrendingUp,
  Scale,
  Calendar,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function ShiftPage() {
  const { shift, isShiftOpen, openShift, closeShift, isLoading: isShiftLoading } = useShift();
  const { confirm, alert } = useSystemDialog();
  const { settings } = useShopSettings();

  // Tab State: "active" for current till, "history" for all shifts
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Live clock — ticks every second so active shift durations are real-time
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Open Shift Form State - strictly entered by cashier, no hardcodes
  const [openingFloat, setOpeningFloat] = useState<string>("");
  const [openNotes, setOpenNotes] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  // Close Shift Form State
  const [countedCash, setCountedCash] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closedSummary, setClosedSummary] = useState<Shift | null>(null);

  // Shift History Real-Data State (Strictly loaded from database via API)
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Filter States for High Volume Shifts
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [discrepancyFilter, setDiscrepancyFilter] = useState<
    "all" | "balanced" | "any_discrepancy" | "shortage" | "overage"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_sales" | "largest_variance">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination State
  const [historyPage, setHistoryPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Modal State
  const [selectedShiftForModal, setSelectedShiftForModal] = useState<Shift | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Pending Pay Later Orders state (loaded when shift close is attempted)
  const [pendingPayLaterOrders, setPendingPayLaterOrders] = useState<Sale[]>([]);
  const [showPendingWarning, setShowPendingWarning] = useState(false);

  const numCounted = parseFloat(countedCash) || 0;
  const expectedCash = shift ? shift.opening_cash + shift.cash_sales : 0;
  const discrepancy = countedCash !== "" ? roundTo(numCounted - expectedCash, 2) : 0;

  // Fetch real shift records from backend API
  const loadHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (cashierFilter !== "all") params.cashier_id = cashierFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      if (discrepancyFilter !== "all") params.discrepancy = discrepancyFilter;
      if (search.trim()) params.search = search.trim();

      const data = await shiftsService.getShiftHistory(params);
      setShiftsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load shift history:", e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [statusFilter, cashierFilter, dateFrom, dateTo, discrepancyFilter, search]);

  // Reload history only when filters change — no butcher:data-change listener
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenShift = async () => {
    if (!openingFloat.trim() || isNaN(parseFloat(openingFloat)) || parseFloat(openingFloat) < 0) {
      await alert({
        title: "Cash Float Required",
        message: "Please manually enter your starting cash float before opening the shift.",
        type: "warning",
      });
      return;
    }
    const floatNum = parseFloat(openingFloat);

    const confirmed = await confirm({
      title: "Open Register Shift",
      message: `Open register shift with an opening cash float of ${formatCurrency(
        floatNum
      )}?`,
      confirmText: "Yes, Open Shift",
      cancelText: "Cancel",
      type: "info",
    });

    if (!confirmed) return;

    setIsOpening(true);
    try {
      await openShift(floatNum, openNotes);
      await loadHistory();
      await alert({
        title: "Shift Opened",
        message: `Your till is now open with ${formatCurrency(floatNum)} float. POS terminal is ready for sales.`,
        type: "success",
      });
    } catch (e: any) {
      await alert({
        title: "Failed to Open Shift",
        message: e.message || "Failed to open shift.",
        type: "danger",
      });
    } finally {
      setIsOpening(false);
    }
  };

  const handleCloseShift = async () => {
    if (countedCash === "") {
      await alert({
        title: "Cash Amount Required",
        message: "Please enter the physical cash counted in the drawer before closing the shift.",
        type: "warning",
      });
      return;
    }

    // ── STEP 1: Check for unpaid Pay Later orders before allowing close ──
    try {
      const res = await apiClient.get<{ data: Sale[] }>("/sales", {
        params: { payment_status: "pending", per_page: 100 },
      });
      const all: Sale[] = Array.isArray(res.data)
        ? (res.data as unknown as Sale[])
        : res.data?.data ?? [];
      const unpaid = all.filter(
        (s) =>
          s.payment_status === "pending" &&
          s.sale_status !== "refunded" &&
          s.sale_status !== "cancelled"
      );
      if (unpaid.length > 0) {
        setPendingPayLaterOrders(unpaid);
        setShowPendingWarning(true);
        return; // Block shift close — show warning modal instead
      }
    } catch {
      // Network error — warn and block
      await alert({
        title: "Cannot Verify Pending Orders",
        message:
          "Could not check for unpaid Pay Later orders (network error). Please verify manually that all Pay Later orders have been settled before closing the shift.",
        type: "warning",
      });
      return;
    }

    // ── STEP 2: Proceed with normal confirm dialog ──
    await doCloseShift();
  };

  // Separated so it can be called both from handleCloseShift (no pending) and
  // from the "Close Anyway" action in the pending warning modal.
  const doCloseShift = async () => {
    const diffText =
      discrepancy === 0
        ? "Drawer is perfectly balanced."
        : discrepancy > 0
          ? `Drawer has an overage of +${formatCurrency(discrepancy)}.`
          : `Drawer has a shortage of -${formatCurrency(Math.abs(discrepancy))}.`;

    const confirmed = await confirm({
      title: "Confirm Shift Closure",
      message: `Are you sure you want to close and reconcile this shift?\n\nExpected Cash: ${formatCurrency(
        expectedCash
      )}\nCounted Cash: ${formatCurrency(numCounted)}\n${diffText}\n\nThis will lock the register till session.`,
      confirmText: "Yes, Reconcile & Close",
      cancelText: "Cancel",
      type: discrepancy === 0 ? "warning" : "danger",
    });

    if (!confirmed) return;

    setIsClosing(true);
    try {
      const closed = await closeShift(numCounted, closeNotes);
      setClosedSummary(closed);
      setShowPendingWarning(false);
      await loadHistory();
      await alert({
        title: "Shift Closed & Reconciled",
        message: `Shift #${closed.id} has been closed successfully. Total sales: ${formatCurrency(
          closed.total_sales
        )}.`,
        type: "success",
      });
    } catch (e: any) {
      await alert({
        title: "Failed to Close Shift",
        message: e.message || "Failed to close shift.",
        type: "danger",
      });
    } finally {
      setIsClosing(false);
    }
  };

  const openShiftDetails = (s: Shift) => {
    setSelectedShiftForModal(s);
    setIsDetailsModalOpen(true);
  };

  const getDuration = (openedAt: string, closedAt?: string | null) => {
    const start = new Date(openedAt).getTime();
    // Use live nowTick for open shifts so the counter ticks every second
    const end = closedAt ? new Date(closedAt).getTime() : nowTick;
    if (isNaN(start) || isNaN(end) || end < start) return "—";

    const diffSeconds = Math.floor((end - start) / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    const secs = diffSeconds % 60;

    if (hours === 0 && mins === 0) return `${secs}s`;
    if (hours === 0) return `${mins}m ${secs}s`;
    return `${hours}h ${mins}m`;
  };

  // Distinct Cashiers list dynamically derived from real records
  const uniqueCashiers = useMemo(() => {
    const map = new Map<number, string>();
    shiftsList.forEach((s) => {
      if (s.cashier_id && s.cashier_name) {
        map.set(s.cashier_id, s.cashier_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [shiftsList]);

  // Count of active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== "all") count++;
    if (cashierFilter !== "all") count++;
    if (discrepancyFilter !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [search, statusFilter, cashierFilter, discrepancyFilter, dateFrom, dateTo, sortBy]);

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCashierFilter("all");
    setDiscrepancyFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setHistoryPage(1);
  };

  const setQuickDate = (preset: "today" | "this_week" | "this_month" | "all") => {
    const now = new Date();
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      const d = now.toISOString().slice(0, 10);
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.setDate(diff));
      setDateFrom(startOfWeek.toISOString().slice(0, 10));
      setDateTo(new Date().toISOString().slice(0, 10));
    } else if (preset === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(startOfMonth.toISOString().slice(0, 10));
      setDateTo(new Date().toISOString().slice(0, 10));
    }
    setHistoryPage(1);
  };

  // Sort and filter real shift records
  const filteredAndSortedShifts = useMemo(() => {
    const list = shiftsList.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (cashierFilter !== "all" && String(s.cashier_id) !== String(cashierFilter)) return false;
      if (dateFrom) {
        const opened = new Date(s.opened_at).getTime();
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        if (opened < fromTime) return false;
      }
      if (dateTo) {
        const opened = new Date(s.opened_at).getTime();
        const toTime = new Date(`${dateTo}T23:59:59`).getTime();
        if (opened > toTime) return false;
      }
      if (discrepancyFilter !== "all") {
        const diff = Number(s.difference ?? 0);
        if (discrepancyFilter === "balanced" && (s.status !== "closed" || diff !== 0)) return false;
        if (discrepancyFilter === "any_discrepancy" && (s.status !== "closed" || diff === 0)) return false;
        if (discrepancyFilter === "shortage" && (s.status !== "closed" || diff >= 0)) return false;
        if (discrepancyFilter === "overage" && (s.status !== "closed" || diff <= 0)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = `#${s.id}`.includes(q) || String(s.id).includes(q);
        const matchCashier = s.cashier_name?.toLowerCase().includes(q);
        const matchNotes = s.notes?.toLowerCase().includes(q);
        if (!matchId && !matchCashier && !matchNotes) return false;
      }
      return true;
    });

    if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());
    } else if (sortBy === "highest_sales") {
      list.sort((a, b) => Number(b.total_sales) - Number(a.total_sales));
    } else if (sortBy === "largest_variance") {
      list.sort((a, b) => Math.abs(Number(b.difference ?? 0)) - Math.abs(Number(a.difference ?? 0)));
    } else {
      // default: newest
      list.sort((a, b) => b.id - a.id);
    }

    return list;
  }, [shiftsList, statusFilter, cashierFilter, dateFrom, dateTo, discrepancyFilter, search, sortBy]);

  // Summary Metrics strictly computed from the real filtered records
  const stats = useMemo(() => {
    const total = filteredAndSortedShifts.length;
    const activeCount = filteredAndSortedShifts.filter((s) => s.status === "open").length;
    const closedCount = filteredAndSortedShifts.filter((s) => s.status === "closed").length;
    const totalSales = filteredAndSortedShifts.reduce((acc, s) => acc + (Number(s.total_sales) || 0), 0);
    const totalCashSales = filteredAndSortedShifts.reduce((acc, s) => acc + (Number(s.cash_sales) || 0), 0);
    const totalMpesaSales = filteredAndSortedShifts.reduce((acc, s) => acc + (Number(s.mpesa_sales) || 0), 0);
    const totalCardSales = filteredAndSortedShifts.reduce((acc, s) => acc + (Number(s.card_sales) || 0), 0);
    const netVariance = filteredAndSortedShifts
      .filter((s) => s.status === "closed")
      .reduce((acc, s) => acc + (Number(s.difference) || 0), 0);

    return {
      total,
      activeCount,
      closedCount,
      totalSales,
      totalCashSales,
      totalMpesaSales,
      totalCardSales,
      netVariance,
    };
  }, [filteredAndSortedShifts]);

  // Export filtered shifts to real CSV
  const handleExportCSV = () => {
    if (filteredAndSortedShifts.length === 0) return;
    const headers = [
      "Shift ID",
      "Status",
      "Cashier",
      "Opened At",
      "Closed At",
      "Duration",
      "Opening Float (KSh)",
      "Cash Sales (KSh)",
      "M-Pesa Sales (KSh)",
      "Card Sales (KSh)",
      "Total Sales (KSh)",
      "Expected Cash (KSh)",
      "Counted Cash (KSh)",
      "Variance (KSh)",
      "Audit Notes",
    ];

    const rows = filteredAndSortedShifts.map((s) => [
      `#${s.id}`,
      s.status.toUpperCase(),
      `"${(s.cashier_name || `User #${s.cashier_id}`).replace(/"/g, '""')}"`,
      `"${formatDateTime(s.opened_at)}"`,
      `"${s.closed_at ? formatDateTime(s.closed_at) : "Active"}"`,
      `"${getDuration(s.opened_at, s.closed_at)}"`,
      s.opening_cash,
      s.cash_sales,
      s.mpesa_sales,
      s.card_sales,
      s.total_sales,
      s.expected_cash,
      s.counted_cash ?? 0,
      s.difference ?? 0,
      `"${(s.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const prefix = (settings.shop_name || "shifts").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute(
      "download",
      `${prefix}_shifts_audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredAndSortedShifts.length / perPage) || 1;
  const paginatedShifts = useMemo(() => {
    const start = (historyPage - 1) * perPage;
    return filteredAndSortedShifts.slice(start, start + perPage);
  }, [filteredAndSortedShifts, historyPage, perPage]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto select-none">

      {/* ── PAY LATER PENDING WARNING MODAL ── */}
      {showPendingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    ⚠️ Cannot Close Shift — Unpaid Orders
                  </h2>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    You have <span className="font-bold text-amber-700">{pendingPayLaterOrders.length} Pay Later {pendingPayLaterOrders.length === 1 ? "order" : "orders"}</span> that have not been paid.
                    Collect payment before closing your shift.
                  </p>
                </div>
              </div>
            </div>

            {/* Order list */}
            <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-2">
              {/* Total owed */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wide">Total Outstanding</p>
                  <p className="text-xl font-black text-amber-900 tabular-nums">
                    {formatCurrency(pendingPayLaterOrders.reduce((s, o) => s + Number(o.total || 0), 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wide">Orders</p>
                  <p className="text-xl font-black text-amber-900">{pendingPayLaterOrders.length}</p>
                </div>
              </div>

              {pendingPayLaterOrders.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-3 py-2.5 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">
                        {sale.customer_name || "Walk-in Customer"}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Receipt className="w-3 h-3 shrink-0" />
                        <span className="font-mono">{sale.sale_number}</span>
                        <span>·</span>
                        <span>{formatDateTime(sale.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-amber-700 tabular-nums">
                      {formatCurrency(sale.total)}
                    </p>
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">
                      Pay Later
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex flex-col gap-2">
              <a
                href="/sales?payment_method=credit&payment_status=pending"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                <Receipt className="w-4 h-4" />
                Go Settle Pending Orders
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPendingWarning(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => { setShowPendingWarning(false); await doCloseShift(); }}
                  disabled={isClosing}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Close Shift Anyway
                </button>
              </div>
              <p className="text-[10px] text-center text-zinc-400">
                ⚠️ Closing anyway means these amounts remain as outstanding receivables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Professional Inline Tab Switcher */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-200/60 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Cashier Shifts & Till Audit
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Register float management, drawer cash balancing, and full shift audit logs.
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="inline-flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start sm:self-center shrink-0">
          <button
            type="button"
            id="tab-active-shift"
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "active"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-bold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isShiftOpen ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
            />
            <span>Active Shift & Till</span>
            {isShiftOpen && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                Live
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-shift-history"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "history"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-bold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
              }`}
          >
            <History className="w-3.5 h-3.5 text-zinc-500" />
            <span>Shift History & Audit</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === "history"
                  ? "bg-zinc-200 text-zinc-800"
                  : "bg-zinc-200/60 text-zinc-600"
                }`}
            >
              {shiftsList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: ACTIVE SHIFT & REGISTER TILL                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto">
          {/* Closed Summary Banner if recently closed */}
          {closedSummary && (
            <div className="p-4 sm:p-5 bg-green-50 border border-green-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>Shift #{closedSummary.id} Successfully Closed & Reconciled</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => openShiftDetails(closedSummary)}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Z-Report Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-green-100 text-green-800 border border-green-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Audit Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-600 pt-2 border-t border-green-200/60">
                <div className="p-2 bg-white/70 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase">Total Sales</span>
                  <strong className="text-zinc-900 text-sm">{formatCurrency(closedSummary.total_sales)}</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase">Expected Cash</span>
                  <strong className="text-zinc-900 text-sm">{formatCurrency(closedSummary.expected_cash)}</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase">Counted Cash</span>
                  <strong className="text-zinc-900 text-sm">{formatCurrency(closedSummary.counted_cash ?? 0)}</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] uppercase">Variance</span>
                  <strong
                    className={`text-sm ${(closedSummary.difference ?? 0) === 0
                        ? "text-green-700 font-bold"
                        : (closedSummary.difference ?? 0) > 0
                          ? "text-blue-700 font-bold"
                          : "text-rose-600 font-bold"
                      }`}
                  >
                    {formatCurrency(closedSummary.difference ?? 0)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Main Shift View: Loading, Active Live Shift, or Open Shift Form */}
          {isShiftLoading && !shift ? (
            <div className="p-8 sm:p-12 bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl max-w-lg mx-auto text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-green-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-zinc-900">Loading Till Session...</p>
              <p className="text-xs text-zinc-500">Checking active shift status</p>
            </div>
          ) : isShiftOpen && shift ? (
            <div className="space-y-5 sm:space-y-6">
              {/* Active Shift Dashboard Card */}
              <div className="p-4 sm:p-6 bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                      ACTIVE SHIFT #{shift.id}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mt-1.5">
                      Cashier: {shift.cashier_name}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Opened at {formatDateTime(shift.opened_at)} • Duration: {getDuration(shift.opened_at)}
                    </p>
                  </div>

                  <div className="bg-zinc-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:text-right border sm:border-none border-zinc-100 flex sm:block items-center justify-between">
                    <span className="text-xs text-zinc-500 block">Opening Cash Float</span>
                    <p className="text-base sm:text-lg font-bold text-zinc-900 tabular-nums">
                      {formatCurrency(shift.opening_cash)}
                    </p>
                  </div>
                </div>

                {/* Live Drawer Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cash Sales */}
                  <div className="p-3.5 sm:p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold">Cash Sales</span>
                      <Banknote className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-xl font-bold text-green-700 tabular-nums">
                      {formatCurrency(shift.cash_sales)}
                    </div>
                    <p className="text-[10px] text-zinc-400">Physical notes & coins in drawer</p>
                  </div>

                  {/* M-Pesa Sales */}
                  <div className="p-3.5 sm:p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold">M-Pesa Sales</span>
                      <Smartphone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-xl font-bold text-green-700 tabular-nums">
                      {formatCurrency(shift.mpesa_sales)}
                    </div>
                    <p className="text-[10px] text-zinc-400">Direct till paybill</p>
                  </div>

                  {/* Card Sales */}
                  <div className="p-3.5 sm:p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold">Card Sales</span>
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xl font-bold text-blue-700 tabular-nums">
                      {formatCurrency(shift.card_sales)}
                    </div>
                    <p className="text-[10px] text-zinc-400">POS Card Machine</p>
                  </div>
                </div>

                {/* Total Sales Summary Banner */}
                <div className="p-4 bg-green-50/70 border border-green-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] sm:text-xs uppercase font-bold text-green-800 tracking-wider">
                      Total Shift Revenue
                    </span>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Combined cash, M-Pesa, and card transactions</p>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-900 tabular-nums">
                    {formatCurrency(shift.total_sales)}
                  </div>
                </div>
              </div>

              {/* Close Shift & Drawer Reconciliation Card */}
              <div className="p-4 sm:p-6 bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-base pb-3 border-b border-zinc-100">
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Close Shift & Count Cash</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold uppercase text-zinc-500 block">
                      Expected Cash in Drawer
                    </span>
                    <div className="text-2xl font-bold text-zinc-900 tabular-nums">
                      {formatCurrency(expectedCash)}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Float ({formatCurrency(shift.opening_cash)}) + Cash Sales ({formatCurrency(shift.cash_sales)})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase text-zinc-700">
                      Counted Physical Cash in Drawer (KSh) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      placeholder="e.g. 40500"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Live Variance Calculation */}
                {countedCash !== "" && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${discrepancy === 0
                        ? "bg-green-50 border-green-200 text-green-800"
                        : discrepancy > 0
                          ? "bg-blue-50 border-blue-200 text-blue-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                  >
                    <span>
                      Drawer Balance:{" "}
                      {discrepancy === 0 ? "Perfect Match (Balanced)" : discrepancy > 0 ? "Over / Surplus" : "Shortage"}
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      {discrepancy >= 0 ? `+${formatCurrency(discrepancy)}` : formatCurrency(discrepancy)}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    Closing Notes / Audit Comments (Optional)
                  </label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="e.g. Verified with store manager, float handed over..."
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  disabled={isClosing || countedCash === ""}
                  onClick={handleCloseShift}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isClosing ? "Closing Shift..." : "Close Shift & Generate Summary"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Open Shift Form */
            <div className="p-4 sm:p-6 bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl max-w-lg mx-auto space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-base pb-3 border-b border-zinc-100">
                <Unlock className="w-5 h-5 text-green-600" />
                <span>Open Cashier Shift</span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Enter the starting float in the cash drawer before processing customer meat orders.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1">
                  Opening Cash Float (KSh) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="Enter opening cash float (e.g. 2500)"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-base sm:text-lg font-bold text-green-700 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Shift Notes (Optional)
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g. Morning shift, float verified"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <button
                type="button"
                disabled={isOpening || !openingFloat.trim()}
                onClick={handleOpenShift}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isOpening ? "Opening Shift..." : "Open Shift & Begin Selling"}</span>
              </button>
            </div>
          )}

          {/* Quick Past Shifts Teaser if history exists */}
          {shiftsList.length > 0 && (
            <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {shiftsList.length} shift{shiftsList.length === 1 ? "" : "s"} logged in audit history
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors"
              >
                <span>View All Shifts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: SHIFT HISTORY & TILL AUDIT                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Summary Metric Cards: Computed strictly from real filtered data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* 1. Total Shifts */}
            <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
                <span className="font-semibold">Filtered Shifts</span>
                <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 tabular-nums">
                {stats.total}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                {stats.activeCount} open • {stats.closedCount} closed
              </p>
            </div>

            {/* 2. Total Revenue */}
            <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
                <span className="font-semibold">Shift Sales</span>
                <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-700 tabular-nums truncate">
                {formatCurrency(stats.totalSales)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                Total for matching shifts
              </p>
            </div>

            {/* 3. Cash in Till */}
            <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
                <span className="font-semibold">Cash Collections</span>
                <Banknote className="w-4 h-4 text-green-600 shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 tabular-nums truncate">
                {formatCurrency(stats.totalCashSales)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                M-Pesa: {formatCurrency(stats.totalMpesaSales)}
              </p>
            </div>

            {/* 4. Net Variance */}
            <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500">
                <span className="font-semibold">Net Variance</span>
                <Scale className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${stats.netVariance === 0
                    ? "text-green-700"
                    : stats.netVariance > 0
                      ? "text-blue-700"
                      : "text-rose-600"
                  }`}
              >
                {stats.netVariance >= 0 ? `+${formatCurrency(stats.netVariance)}` : formatCurrency(stats.netVariance)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                {stats.netVariance === 0
                  ? "Drawers balanced"
                  : stats.netVariance > 0
                    ? "Net cash surplus"
                    : "Net cash shortage"}
              </p>
            </div>
          </div>

          {/* ── HIGH-CAPACITY FILTER & SEARCH CONSOLE ── */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Main Search & Quick Action Toolbar */}
            <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Search shift #, cashier, notes..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setHistoryPage(1);
                  }}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-medium focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs shrink-0"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Active / Open Only</option>
                  <option value="closed">Closed Only</option>
                </select>

                {/* Toggle More Filters Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((prev) => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border shadow-2xs shrink-0 ${showAdvancedFilters || activeFiltersCount > 0
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                >
                  <Filter className="w-3.5 h-3.5 text-green-700" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-green-600 text-white text-[10px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Action Buttons: Export & Refresh */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-2.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredAndSortedShifts.length === 0}
                  className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Export filtered shift audits to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={isHistoryLoading}
                  className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Reload Shift List from Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* ── EXPANDABLE ADVANCED FILTERS PANEL ── */}
            {showAdvancedFilters && (
              <div className="p-3.5 bg-zinc-50/70 border-t border-zinc-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Cashier Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Cashier / Station
                    </label>
                    <select
                      value={cashierFilter}
                      onChange={(e) => {
                        setCashierFilter(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-hidden focus:border-green-600 shadow-2xs"
                    >
                      <option value="all">All Cashiers ({uniqueCashiers.length})</option>
                      {uniqueCashiers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Discrepancy Filter */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Drawer Reconciliation
                    </label>
                    <select
                      value={discrepancyFilter}
                      onChange={(e) => {
                        setDiscrepancyFilter(e.target.value as any);
                        setHistoryPage(1);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-hidden focus:border-green-600 shadow-2xs"
                    >
                      <option value="all">All Reconciliations</option>
                      <option value="balanced">Balanced Only (KSh 0.00)</option>
                      <option value="any_discrepancy">Discrepancies Only (Over/Short)</option>
                      <option value="shortage">Shortages Only (- Short)</option>
                      <option value="overage">Overages Only (+ Surplus)</option>
                    </select>
                  </div>

                  {/* 3. Date Range (From & To) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-hidden focus:border-green-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-hidden focus:border-green-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Quick Date Presets & Sorting Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-200/60 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setQuickDate("today")}
                      className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate("this_week")}
                      className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                    >
                      This Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate("this_month")}
                      className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate("all")}
                      className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                    >
                      All Time
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Sort By:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as any);
                        setHistoryPage(1);
                      }}
                      className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-800 font-medium focus:outline-hidden shadow-2xs"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="highest_sales">Highest Sales</option>
                      <option value="largest_variance">Largest Discrepancy</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RESPONSIVE MOBILE VIEW: CARDS FOR MOBILE (< md) ── */}
          <div className="block md:hidden space-y-3">
            {filteredAndSortedShifts.length === 0 ? (
              <EmptyState
                title="No shifts found"
                description={
                  activeFiltersCount > 0
                    ? "No shifts match your filter criteria. Try resetting filters."
                    : "No cashier shifts have been recorded in the database yet."
                }
                icon={Clock}
                actionLabel={activeFiltersCount > 0 ? "Reset Filters" : undefined}
                onAction={activeFiltersCount > 0 ? clearAllFilters : undefined}
              />
            ) : (
              paginatedShifts.map((s) => {
                const isClosed = s.status === "closed";
                const diff = s.difference ?? 0;
                return (
                  <div
                    key={s.id}
                    className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3"
                  >
                    {/* Top Row: Shift #, Status Badge, Details Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-900 px-2 py-1 rounded-lg border border-zinc-200">
                          #{s.id}
                        </span>
                        <StatusBadge status={s.status} type="shift" />
                      </div>

                      <button
                        type="button"
                        onClick={() => openShiftDetails(s)}
                        className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Z-Report</span>
                      </button>
                    </div>

                    {/* Cashier & Timestamps */}
                    <div className="space-y-1 text-xs border-b border-zinc-100 pb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Cashier:</span>
                        <span className="font-bold text-zinc-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {s.cashier_name || `User #${s.cashier_id}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Opened:</span>
                        <span className="text-zinc-700 font-semibold">{formatDateTime(s.opened_at)}</span>
                      </div>
                      {isClosed ? (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">Closed:</span>
                          <span className="text-zinc-700 font-semibold">{formatDateTime(s.closed_at)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">Closed:</span>
                          <span className="text-emerald-600 font-semibold">Still Active</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Duration:</span>
                        <span className={`font-bold tabular-nums ${!isClosed ? "text-emerald-700" : "text-zinc-800"}`}>
                          {getDuration(s.opened_at, s.closed_at)}
                          {!isClosed && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block align-middle" />}
                        </span>
                      </div>
                    </div>

                    {/* Financial Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-zinc-50 rounded-xl space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Opening Float</span>
                        <span className="font-bold text-zinc-800 tabular-nums">
                          {formatCurrency(s.opening_cash)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-zinc-50 rounded-xl space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Total Sales</span>
                        <span className="font-bold text-green-700 tabular-nums">
                          {formatCurrency(s.total_sales)}
                        </span>
                        <div className="text-[9px] text-zinc-400 flex gap-1">
                          <span>C: {formatCurrency(s.cash_sales)}</span>
                          <span>•</span>
                          <span>M: {formatCurrency(s.mpesa_sales)}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-zinc-50 rounded-xl space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Drawer Reconciled</span>
                        <span className="font-bold text-zinc-800 tabular-nums">
                          {isClosed ? formatCurrency(s.counted_cash ?? 0) : "In Progress"}
                        </span>
                        <div className="text-[9px] text-zinc-400">
                          Exp: {formatCurrency(s.expected_cash)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-zinc-50 rounded-xl space-y-0.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Drawer Variance</span>
                        {isClosed ? (
                          <span
                            className={`inline-block font-bold text-xs tabular-nums ${diff === 0
                                ? "text-green-700"
                                : diff > 0
                                  ? "text-blue-700"
                                  : "text-rose-600"
                              }`}
                          >
                            {diff === 0
                              ? "Balanced (0.00)"
                              : diff > 0
                                ? `+${formatCurrency(diff)}`
                                : formatCurrency(diff)}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">Open till</span>
                        )}
                      </div>
                    </div>

                    {/* Audit Notes if any */}
                    {s.notes && (
                      <div className="text-[11px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-100 italic">
                        "{s.notes}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── RESPONSIVE DESKTOP VIEW: DATA TABLE (>= md) ── */}
          <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pl-4"># Shift</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Cashier</th>
                    <th className="py-3 px-3">Opened / Closed</th>
                    <th className="py-3 px-3 text-right">Float</th>
                    <th className="py-3 px-3 text-right">Total Sales</th>
                    <th className="py-3 px-3 text-right">Expected / Counted</th>
                    <th className="py-3 px-3 text-right">Variance</th>
                    <th className="py-3 pr-4 text-center">Z-Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAndSortedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8">
                        <EmptyState
                          title="No shifts found"
                          description={
                            activeFiltersCount > 0
                              ? "No shifts match your filter criteria. Try clearing or adjusting filters."
                              : "No cashier shifts have been recorded in the database yet."
                          }
                          icon={Clock}
                          actionLabel={activeFiltersCount > 0 ? "Reset Filters" : undefined}
                          onAction={activeFiltersCount > 0 ? clearAllFilters : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedShifts.map((s) => {
                      const isClosed = s.status === "closed";
                      const diff = s.difference ?? 0;
                      return (
                        <tr key={s.id} className="hover:bg-zinc-50/70 transition-colors">
                          {/* Shift ID */}
                          <td className="py-3 pl-4 font-mono font-bold text-zinc-900">
                            #{s.id}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <StatusBadge status={s.status} type="shift" />
                          </td>

                          {/* Cashier */}
                          <td className="py-3 px-3 font-semibold text-zinc-900">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{s.cashier_name || `User #${s.cashier_id}`}</span>
                            </div>
                          </td>

                          {/* Opened / Closed Timestamps & Duration */}
                          <td className="py-3 px-3 text-zinc-600">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-zinc-400 w-12 shrink-0">Opened:</span>
                                <span className="font-semibold text-zinc-800">{formatDateTime(s.opened_at)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-zinc-400 w-12 shrink-0">Closed:</span>
                                {isClosed ? (
                                  <span className="font-semibold text-zinc-800">{formatDateTime(s.closed_at)}</span>
                                ) : (
                                  <span className="text-emerald-600 font-semibold">Still Active</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-zinc-400 w-12 shrink-0">Duration:</span>
                                <span className={`font-bold tabular-nums ${!isClosed ? "text-emerald-700" : "text-zinc-600"}`}>
                                  {getDuration(s.opened_at, s.closed_at)}
                                  {!isClosed && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block align-middle" />}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Opening Float */}
                          <td className="py-3 px-3 text-right font-medium text-zinc-700 tabular-nums">
                            {formatCurrency(s.opening_cash)}
                          </td>

                          {/* Total Sales */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-zinc-900 tabular-nums block">
                              {formatCurrency(s.total_sales)}
                            </span>
                            <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400">
                              <span className="text-green-700">C: {formatCurrency(s.cash_sales)}</span>
                              <span>•</span>
                              <span className="text-emerald-700">M: {formatCurrency(s.mpesa_sales)}</span>
                            </div>
                          </td>

                          {/* Expected vs Counted */}
                          <td className="py-3 px-3 text-right tabular-nums">
                            <div className="font-semibold text-zinc-800">
                              {isClosed ? formatCurrency(s.counted_cash ?? 0) : "Pending count"}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Exp: {formatCurrency(s.expected_cash)}
                            </div>
                          </td>

                          {/* Variance */}
                          <td className="py-3 px-3 text-right tabular-nums">
                            {isClosed ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${diff === 0
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : diff > 0
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                              >
                                {diff === 0
                                  ? "Balanced"
                                  : diff > 0
                                    ? `+${formatCurrency(diff)}`
                                    : formatCurrency(diff)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 pr-4 text-center">
                            <button
                              type="button"
                              onClick={() => openShiftDetails(s)}
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition-colors shadow-2xs cursor-pointer"
                              title="View full shift slip and Z-Report"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination for both mobile and desktop with selectable records per page */}
          {filteredAndSortedShifts.length > 0 && (
            <div className="p-3 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-xs">
              <Pagination
                currentPage={historyPage}
                lastPage={totalPages}
                total={filteredAndSortedShifts.length}
                from={(historyPage - 1) * perPage + 1}
                to={Math.min(historyPage * perPage, filteredAndSortedShifts.length)}
                onPageChange={(p) => setHistoryPage(p)}
                perPage={perPage}
                onPerPageChange={(newPer) => {
                  setPerPage(newPer);
                  setHistoryPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Z-Report / Shift Details Modal */}
      <ShiftDetailsModal
        shift={selectedShiftForModal}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedShiftForModal(null);
        }}
      />
    </div>
  );
}
