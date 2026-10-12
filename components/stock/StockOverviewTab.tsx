"use client";

import React from "react";
import { StockExpenseAnalytics } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    UtensilsCrossed,
    PieChart,
    Percent,
} from "lucide-react";

interface StockOverviewTabProps {
    analytics: StockExpenseAnalytics | null;
    isLoading: boolean;
    onNavigateToIssues: () => void;
    onNavigateToStore: () => void;
}

export function StockOverviewTab({
    analytics,
    isLoading,
    onNavigateToIssues,
    onNavigateToStore,
}: StockOverviewTabProps) {
    if (isLoading || !analytics) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-zinc-100 rounded-xl border border-zinc-200" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 h-72 bg-zinc-100 rounded-xl border border-zinc-200" />
                    <div className="h-72 bg-zinc-100 rounded-xl border border-zinc-200" />
                </div>
            </div>
        );
    }

    const {
        total_sales_revenue,
        sales_transactions_count,
        total_stock_consumed,
        total_stock_purchased,
        in_kitchen_active_cost,
        gross_kitchen_margin,
        food_cost_ratio,
        category_breakdown,
        top_items,
        trend,
    } = analytics;

    // Food cost benchmark evaluation
    const isHealthyFoodCost = food_cost_ratio > 0 && food_cost_ratio <= 35;
    const isModerateFoodCost = food_cost_ratio > 35 && food_cost_ratio <= 45;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Executive Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Sales Revenue */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Restaurant Sales</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 break-words">{formatCurrency(total_sales_revenue)}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            <span>{sales_transactions_count} settled orders</span>
                        </div>
                    </div>
                </div>

                {/* Stock Expenses Consumed */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Kitchen Stock Used</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 break-words">{formatCurrency(total_stock_consumed)}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                            <span>Active in pots: {formatCurrency(in_kitchen_active_cost)}</span>
                        </div>
                    </div>
                </div>

                {/* Net Kitchen Margin */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Net Kitchen Margin</span>
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${gross_kitchen_margin >= 0 ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                                }`}
                        >
                            {gross_kitchen_margin >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                    <div>
                        <div
                            className={`text-xl sm:text-2xl font-bold break-words ${gross_kitchen_margin >= 0 ? "text-emerald-700" : "text-rose-600"
                                }`}
                        >
                            {formatCurrency(gross_kitchen_margin)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">Sales − Stock Expenses</div>
                    </div>
                </div>

                {/* Food Cost Ratio % */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Food Cost Ratio</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xl sm:text-2xl font-bold text-zinc-900">{food_cost_ratio}%</span>
                            <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isHealthyFoodCost
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isModerateFoodCost
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                    }`}
                            >
                                {isHealthyFoodCost ? "Optimal (<35%)" : isModerateFoodCost ? "Moderate" : "High Alert"}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">% of revenue spent on ingredients</div>
                    </div>
                </div>
            </div>

            {/* Daily Comparison Trend & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Sales vs Stock Expenses Daily Trend */}
                <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-zinc-900">Sales vs. Stock Expense Trend</h3>
                            <p className="text-xs text-zinc-500">Day-by-day comparison of POS revenue vs kitchen stock consumed</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs self-start sm:self-center">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                                <span className="text-zinc-600 font-medium">Sales</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                                <span className="text-zinc-600 font-medium">Stock</span>
                            </div>
                        </div>
                    </div>

                    {trend && trend.length > 0 ? (
                        <div className="space-y-3 pt-2">
                            {trend.map((day) => {
                                const maxVal = Math.max(
                                    ...trend.map((t) => Math.max(t.sales, t.expenses, 1))
                                );
                                const salesWidth = Math.min(100, Math.round((day.sales / maxVal) * 100));
                                const expensesWidth = Math.min(100, Math.round((day.expenses / maxVal) * 100));

                                return (
                                    <div key={day.date} className="text-xs border-b border-zinc-100 pb-2.5 last:border-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between font-medium text-zinc-700 gap-1 mb-1.5">
                                            <span className="font-semibold">{day.label}</span>
                                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                <span className="text-emerald-700 font-semibold">{formatCurrency(day.sales)}</span>
                                                <span className="text-zinc-300">/</span>
                                                <span className="text-amber-700 font-semibold">{formatCurrency(day.expenses)}</span>
                                                <span
                                                    className={`font-bold sm:min-w-16 sm:text-right ${day.net >= 0 ? "text-emerald-600" : "text-rose-600"
                                                        }`}
                                                >
                                                    Net: {formatCurrency(day.net)}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Visual Dual Bars */}
                                        <div className="space-y-1">
                                            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.max(salesWidth, 2)}%` }}
                                                />
                                            </div>
                                            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.max(expensesWidth, 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-zinc-400 text-sm">
                            No trend data recorded for this timeframe.
                        </div>
                    )}
                </div>

                {/* Category Expense Breakdown */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-zinc-900">Expense by Category</h3>
                                <p className="text-xs text-zinc-500">Distribution of stock ingredients used</p>
                            </div>
                            <PieChart className="w-5 h-5 text-zinc-400 shrink-0" />
                        </div>

                        {category_breakdown && category_breakdown.length > 0 ? (
                            <div className="space-y-3">
                                {category_breakdown.map((cat, idx) => (
                                    <div key={cat.category} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-zinc-800">{cat.category}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-zinc-600 font-semibold">{formatCurrency(cat.total_cost)}</span>
                                                <span className="text-zinc-400 font-normal">({cat.percentage}%)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${idx % 4 === 0
                                                        ? "bg-amber-500"
                                                        : idx % 4 === 1
                                                            ? "bg-emerald-500"
                                                            : idx % 4 === 2
                                                                ? "bg-blue-500"
                                                                : "bg-purple-500"
                                                    }`}
                                                style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-zinc-400 text-sm">
                                No ingredient categories logged yet.
                            </div>
                        )}
                    </div>

                    {/* Quick Action footer */}
                    <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Store Capital Outlay:</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(total_stock_purchased)}</span>
                    </div>
                </div>
            </div>

            {/* Top Consumed Items Card / Table */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900">Highest Consumed Raw Materials</h3>
                        <p className="text-xs text-zinc-500">Top ingredients used in kitchen cooking for this timeframe</p>
                    </div>
                    <button
                        onClick={onNavigateToIssues}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline self-start sm:self-center"
                    >
                        View Daily Kitchen Issues &rarr;
                    </button>
                </div>

                {top_items && top_items.length > 0 ? (
                    <div>
                        {/* Mobile Card List (< md) */}
                        <div className="block md:hidden divide-y divide-zinc-100">
                            {top_items.map((item) => {
                                const pct =
                                    total_stock_consumed > 0
                                        ? Math.round((item.total_cost / total_stock_consumed) * 100)
                                        : 0;

                                return (
                                    <div key={item.item_name} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                                <span>{item.item_name}</span>
                                            </div>
                                            <div className="text-zinc-500 mt-0.5">
                                                Used: {item.total_qty} {item.unit}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-zinc-900">{formatCurrency(item.total_cost)}</div>
                                            <span className="inline-block px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 mt-0.5">
                                                {pct}% share
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold">Ingredient</th>
                                        <th className="py-2.5 px-3 font-semibold">Total Quantity Used</th>
                                        <th className="py-2.5 px-3 font-semibold">Total Cost Incurred</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Cost Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {top_items.map((item) => {
                                        const pct =
                                            total_stock_consumed > 0
                                                ? Math.round((item.total_cost / total_stock_consumed) * 100)
                                                : 0;

                                        return (
                                            <tr key={item.item_name} className="hover:bg-zinc-50/60">
                                                <td className="py-2.5 px-3 font-medium text-zinc-900 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                    {item.item_name}
                                                </td>
                                                <td className="py-2.5 px-3 text-zinc-700">
                                                    {item.total_qty} {item.unit}
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold text-zinc-900">
                                                    {formatCurrency(item.total_cost)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 font-semibold text-zinc-700">
                                                        {pct}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-zinc-400 text-sm">
                        No ingredients consumed during this period.
                    </div>
                )}
            </div>
        </div>
    );
}
