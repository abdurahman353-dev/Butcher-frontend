"use client";

import React, { useState, useEffect } from "react";
import { reportsService } from "@/services/reports.service";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"today" | "7days" | "30days">("today");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      try {
        const data = await reportsService.getReportAnalytics(period);
        setAnalytics(data);
      } catch (e) {
        console.error("Failed to load report analytics:", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, [period]);

  const cashAmount = analytics?.payment_breakdown?.cash || 0;
  const mpesaAmount = analytics?.payment_breakdown?.mpesa || 0;
  const cardAmount = analytics?.payment_breakdown?.card || 0;
  const totalRevenue = analytics?.revenue || 0;

  const cashPercent = totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 0;
  const mpesaPercent = totalRevenue > 0 ? Math.round((mpesaAmount / totalRevenue) * 100) : 0;
  const cardPercent = totalRevenue > 0 ? Math.round((cardAmount / totalRevenue) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Butcher Performance Reports
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Revenue breakdown, payment splits, top performing meat cuts, and profit margins.
          </p>
        </div>

        <div className="flex items-center p-1 bg-zinc-100 border border-zinc-200 rounded-xl self-start sm:self-auto">
          {(["today", "7days", "30days"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                period === p
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {p === "today" ? "Today" : p === "7days" ? "Past 7 Days" : "Past 30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
            <span>Period Revenue</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 tabular-nums">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-[11px] text-zinc-500">
            {analytics?.transactions || 0} completed transactions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
            <span>Estimated Profit</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700 tabular-nums">
            {formatCurrency(analytics?.estimated_profit || 0)}
          </div>
          <p className="text-[11px] text-zinc-500">Estimated ~28% gross margin</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
            <span>Reported Wastage Loss</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 tabular-nums">
            {formatCurrency(analytics?.wastage_cost || 0)}
          </div>
          <p className="text-[11px] text-zinc-500">Spoilage, damage & trimming</p>
        </div>
      </div>

      {/* Payment Split & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Payment Breakdown</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Tender share across cash, M-Pesa, and card</p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Cash */}
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-green-600" /> Cash ({cashPercent}%)
                </span>
                <span className="font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(cashAmount)}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${cashPercent}%` }}
                />
              </div>
            </div>

            {/* M-Pesa */}
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-green-600" /> M-Pesa ({mpesaPercent}%)
                </span>
                <span className="font-bold text-green-700 tabular-nums">
                  {formatCurrency(mpesaAmount)}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${mpesaPercent}%` }}
                />
              </div>
            </div>

            {/* Card */}
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Card ({cardPercent}%)
                </span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {formatCurrency(cardAmount)}
                </span>
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

        {/* Top-Selling Cuts by Weight & Revenue */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900">
              Top Selling Meat Cuts (by Weight KG)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Volume sold during the selected timeframe</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics?.top_products || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}kg`}
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
                  formatter={(value: any, name: any) => [
                    name === "weight" ? formatWeight(value) : formatCurrency(value),
                    name === "weight" ? "Weight Sold" : "Revenue",
                  ]}
                />
                <Bar dataKey="weight" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
