"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { reportsService } from "@/services/reports.service";
import { DashboardSummary } from "@/types";
import { formatCurrency, formatWeight, formatTimeOnly } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePolling } from "@/hooks/usePolling";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Clock,
  CheckCircle2,
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartPeriod, setChartPeriod] = useState<"today" | "week" | "month">("today");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_dashboard_summary");
      if (cached) setSummary(JSON.parse(cached));
    } catch {}
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await reportsService.getDashboardSummary();
      setSummary(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_cached_dashboard_summary", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to load dashboard summary:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time: poll every 10 seconds
  usePolling(fetchSummary, 10000);

  const currentChartData =
    chartPeriod === "today"
      ? summary?.sales_chart.today || []
      : chartPeriod === "week"
      ? summary?.sales_chart.week || []
      : summary?.sales_chart.month || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Welcome & Fast POS CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥩</span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Butcher Shop Overview
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Real-time monitoring of daily sales, profit margins, inventory levels, and counter transactions.
          </p>
        </div>

        <Link
          href="/pos"
          className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Launch POS Terminal</span>
        </Link>
      </div>

      {/* 4 Core Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {formatCurrency(summary?.today_sales)}
            </div>
            <p className="text-[11px] text-green-700 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Gross Revenue
            </p>
          </div>
        </div>

        {/* Today's Transactions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {summary?.today_transactions || 0}
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              Completed Counter Orders
            </p>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Est. Profit</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-green-700 tabular-nums tracking-tight">
              {formatCurrency(summary?.today_profit)}
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              Revenue Less Meat Cost
            </p>
          </div>
        </div>

        {/* Current Stock Value */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {formatCurrency(summary?.current_stock_value)}
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {summary?.low_stock_count || 0} cuts low
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart and Low Stock List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (Span 2) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Sales Revenue Trend</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time revenue performance comparison</p>
            </div>

            {/* Range Toggle */}
            <div className="flex items-center p-1 bg-zinc-100 border border-zinc-200 rounded-xl self-start">
              {(["today", "week", "month"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    chartPeriod === period
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {period === "today" ? "Today" : period === "week" ? "7 Days" : "Monthly Trend"}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                    return val.toString();
                  }}
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
                  formatter={(value: any) => [formatCurrency(value), "Sales"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Priority Alerts */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Low Stock Cuts</h2>
              </div>
              <Link
                href="/inventory"
                className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Meat cuts requiring immediate supplier order or stock-in.
            </p>

            <div className="space-y-2.5">
              {!summary?.low_stock_products || summary.low_stock_products.length === 0 ? (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-xs text-zinc-500">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  All meat inventory levels are healthy!
                </div>
              ) : (
                summary.low_stock_products.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900">{p.name}</h4>
                      <p className="text-[10px] text-zinc-500">Min: {formatWeight(p.min_stock)}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-700 tabular-nums">
                        {formatWeight(p.current_stock)}
                      </span>
                      <p className="text-[9px] font-bold text-rose-600 uppercase">
                        {p.current_stock <= 0 ? "Out" : "Low"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/inventory/stock-in"
            className="mt-4 w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>+ Add Stock In</span>
          </Link>
        </div>
      </div>

      {/* Recent Sales Activity Table */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Recent Transactions</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Latest completed point-of-sale transactions</p>
          </div>
          <Link
            href="/sales"
            className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center gap-1"
          >
            <span>View All Sales</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50/80">
                <th className="py-3 pl-3">Sale #</th>
                <th className="py-3">Time</th>
                <th className="py-3">Cashier</th>
                <th className="py-3">Customer</th>
                <th className="py-3">Payment</th>
                <th className="py-3 text-right">Amount</th>
                <th className="py-3 pr-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!summary?.recent_sales || summary.recent_sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-400">
                    No sales recorded yet. Head to POS to make the first transaction!
                  </td>
                </tr>
              ) : (
                summary.recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 pl-3 font-mono font-semibold text-zinc-900">
                      <Link href={`/sales/${sale.id}`} className="hover:text-green-700 hover:underline">
                        {sale.sale_number}
                      </Link>
                    </td>
                    <td className="py-3 text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formatTimeOnly(sale.created_at)}
                    </td>
                    <td className="py-3 text-zinc-800 font-medium">{sale.cashier_name}</td>
                    <td className="py-3 text-zinc-600">{sale.customer_name || "Walk-in"}</td>
                    <td className="py-3 uppercase font-semibold text-zinc-700 text-[11px]">{sale.payment_method}</td>
                    <td className="py-3 text-right font-bold text-green-700 tabular-nums">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <StatusBadge status={sale.sale_status} type="sale" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
