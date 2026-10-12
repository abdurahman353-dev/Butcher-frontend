"use client";

import React, { useState, useMemo } from "react";
import { StockExpenseAnalytics } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    UtensilsCrossed,
    PieChart,
    Percent,
    SlidersHorizontal,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar,
} from "lucide-react";

interface StockOverviewTabProps {
    analytics: StockExpenseAnalytics | null;
    isLoading: boolean;
    period: string;
    onPeriodChange: (p: string) => void;
    startDate: string;
    onStartDateChange: (d: string) => void;
    endDate: string;
    onEndDateChange: (d: string) => void;
    onNavigateToIssues: () => void;
    onNavigateToStore: () => void;
}

export function StockOverviewTab({
    analytics,
    isLoading,
    period,
    onPeriodChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    onNavigateToIssues,
    onNavigateToStore,
}: StockOverviewTabProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [trendFilter, setTrendFilter] = useState<"all" | "profit" | "loss">("all");
    const [trendSort, setTrendSort] = useState<"date_desc" | "date_asc" | "sales_high" | "expense_high">("date_desc");
    const [trendPage, setTrendPage] = useState(1);
    const [catPage, setCatPage] = useState(1);
    const [itemPage, setItemPage] = useState(1);
    const TREND_PAGE_SIZE = 5;
    const CAT_PAGE_SIZE = 4;
    const ITEM_PAGE_SIZE = 5;

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
    } = analytics || {
        total_sales_revenue: 0,
        sales_transactions_count: 0,
        total_stock_consumed: 0,
        total_stock_purchased: 0,
        in_kitchen_active_cost: 0,
        gross_kitchen_margin: 0,
        food_cost_ratio: 0,
        category_breakdown: [],
        top_items: [],
        trend: [],
    };

    // Filtered & sorted trend data
    const filteredTrend = useMemo(() => {
        let items = [...(trend || [])];
        if (startDate) {
            const s = new Date(startDate + "T00:00:00");
            items = items.filter((d) => new Date(d.date) >= s);
        }
        if (endDate) {
            const e = new Date(endDate + "T23:59:59");
            items = items.filter((d) => new Date(d.date) <= e);
        }
        if (trendFilter === "profit") {
            items = items.filter((d) => d.net >= 0);
        } else if (trendFilter === "loss") {
            items = items.filter((d) => d.net < 0);
        }
        items.sort((a, b) => {
            if (trendSort === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (trendSort === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (trendSort === "sales_high") return b.sales - a.sales;
            if (trendSort === "expense_high") return b.expenses - a.expenses;
            return 0;
        });
        return items;
    }, [trend, startDate, endDate, trendFilter, trendSort]);

    const totalTrendPages = Math.max(1, Math.ceil(filteredTrend.length / TREND_PAGE_SIZE));
    const safeTrendPage = Math.min(trendPage, totalTrendPages);
    const pagedTrend = filteredTrend.slice((safeTrendPage - 1) * TREND_PAGE_SIZE, safeTrendPage * TREND_PAGE_SIZE);

    // Paginated categories
    const categories = category_breakdown || [];
    const totalCatPages = Math.max(1, Math.ceil(categories.length / CAT_PAGE_SIZE));
    const safeCatPage = Math.min(catPage, totalCatPages);
    const pagedCategories = categories.slice((safeCatPage - 1) * CAT_PAGE_SIZE, safeCatPage * CAT_PAGE_SIZE);

    // Paginated top items
    const items = top_items || [];
    const totalItemPages = Math.max(1, Math.ceil(items.length / ITEM_PAGE_SIZE));
    const safeItemPage = Math.min(itemPage, totalItemPages);
    const pagedItems = items.slice((safeItemPage - 1) * ITEM_PAGE_SIZE, safeItemPage * ITEM_PAGE_SIZE);

    const activeFilterCount = [
        Boolean(startDate),
        Boolean(endDate),
        period !== "today" && !startDate && !endDate,
        trendFilter !== "all",
        trendSort !== "date_desc",
    ].filter(Boolean).length;

    // Food cost benchmark evaluation
    const isHealthyFoodCost = food_cost_ratio > 0 && food_cost_ratio <= 35;
    const isModerateFoodCost = food_cost_ratio > 35 && food_cost_ratio <= 45;

    if (isLoading && !analytics) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-zinc-100 rounded-xl border border-zinc-200" />
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

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Filter Card - Arranged Horizontally */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900">P&L & Analytics Filters</h3>
                        {activeFilterCount > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {activeFilterCount} active
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                            showFilters || activeFilterCount > 0
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200"
                                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                        }`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-white text-amber-700 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 via-amber-50/20 to-slate-50 border-t border-zinc-100">
                        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3">
                            {/* From Date */}
                            <div className="w-[calc(50%-5px)] sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">From Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        onStartDateChange(e.target.value);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                />
                            </div>

                            {/* To Date */}
                            <div className="w-[calc(50%-5px)] sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        onEndDateChange(e.target.value);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                />
                            </div>

                            {/* Quick Preset Dropdown */}
                            <div className="w-full sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Quick Range</label>
                                <select
                                    value={startDate || endDate ? "custom" : period}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== "custom") {
                                            onStartDateChange("");
                                            onEndDateChange("");
                                            onPeriodChange(val);
                                            setTrendPage(1);
                                        }
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="this_month">This Month</option>
                                    {startDate || endDate ? <option value="custom">Custom Range</option> : null}
                                </select>
                            </div>

                            {/* Margin Filter */}
                            <div className="w-full sm:w-auto sm:min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Margin Status</label>
                                <select
                                    value={trendFilter}
                                    onChange={(e) => {
                                        setTrendFilter(e.target.value as any);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="all">All Days</option>
                                    <option value="profit">Net Profit (Sales &gt; Stock)</option>
                                    <option value="loss">Net Loss (Stock &gt; Sales)</option>
                                </select>
                            </div>

                            {/* Sort Trend */}
                            <div className="w-full sm:w-auto sm:min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Sort Trend By</label>
                                <select
                                    value={trendSort}
                                    onChange={(e) => {
                                        setTrendSort(e.target.value as any);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="date_desc">Date (Newest First)</option>
                                    <option value="date_asc">Date (Oldest First)</option>
                                    <option value="sales_high">Sales (Highest First)</option>
                                    <option value="expense_high">Stock (Highest First)</option>
                                </select>
                            </div>

                            {/* Reset Button */}
                            {(startDate || endDate || period !== "today" || trendFilter !== "all" || trendSort !== "date_desc") && (
                                <div className="w-full sm:w-auto pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onStartDateChange("");
                                            onEndDateChange("");
                                            onPeriodChange("today");
                                            setTrendFilter("all");
                                            setTrendSort("date_desc");
                                            setTrendPage(1);
                                            setCatPage(1);
                                            setItemPage(1);
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
                                    >
                                        <X className="w-3.5 h-3.5" /> Reset Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

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
                <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
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

                        {pagedTrend && pagedTrend.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                {pagedTrend.map((day) => {
                                    const maxVal = Math.max(
                                        ...filteredTrend.map((t) => Math.max(t.sales, t.expenses, 1))
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
                                No trend data matches the selected filters.
                            </div>
                        )}
                    </div>

                    {/* Trend Pagination Footer - Always Visible */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 w-full">
                        <span className="text-center sm:text-left">
                            Showing {filteredTrend.length === 0 ? 0 : (safeTrendPage - 1) * TREND_PAGE_SIZE + 1}–{Math.min(safeTrendPage * TREND_PAGE_SIZE, filteredTrend.length)} of {filteredTrend.length} days
                        </span>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5">
                            <button
                                type="button"
                                onClick={() => setTrendPage((p) => Math.max(1, p - 1))}
                                disabled={safeTrendPage <= 1}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="px-2 font-bold text-zinc-700 text-center shrink-0">
                                {safeTrendPage} / {totalTrendPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTrendPage((p) => Math.min(totalTrendPages, p + 1))}
                                disabled={safeTrendPage >= totalTrendPages}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
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

                        {pagedCategories && pagedCategories.length > 0 ? (
                            <div className="space-y-3">
                                {pagedCategories.map((cat, idx) => (
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

                    {/* Category Pagination Footer - Always Visible */}
                    <div>
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 mb-2">
                            <span>
                                {categories.length === 0 ? 0 : (safeCatPage - 1) * CAT_PAGE_SIZE + 1}–{Math.min(safeCatPage * CAT_PAGE_SIZE, categories.length)} of {categories.length} categories
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                                    disabled={safeCatPage <= 1}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] shadow-xs"
                                >
                                    <ChevronLeft className="w-3 h-3" /> Prev
                                </button>
                                <span className="px-1.5 font-bold text-zinc-700 text-[11px]">
                                    {safeCatPage} / {totalCatPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCatPage((p) => Math.min(totalCatPages, p + 1))}
                                    disabled={safeCatPage >= totalCatPages}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] shadow-xs"
                                >
                                    Next <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Action footer */}
                        <div className="pt-3 border-t border-zinc-100 mt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Store Capital Outlay:</span>
                            <span className="font-bold text-zinc-900">{formatCurrency(total_stock_purchased)}</span>
                        </div>
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

                {pagedItems && pagedItems.length > 0 ? (
                    <div>
                        {/* Mobile Card List (< md) */}
                        <div className="block md:hidden divide-y divide-zinc-100">
                            {pagedItems.map((item) => {
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
                                    {pagedItems.map((item) => {
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

                        {/* Top Items Pagination Footer - Always Visible */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 w-full">
                            <span className="text-center sm:text-left">
                                Showing {items.length === 0 ? 0 : (safeItemPage - 1) * ITEM_PAGE_SIZE + 1}–{Math.min(safeItemPage * ITEM_PAGE_SIZE, items.length)} of {items.length} ingredients
                            </span>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                                    disabled={safeItemPage <= 1}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                                </button>
                                <span className="px-2 font-bold text-zinc-700 text-center shrink-0">
                                    {safeItemPage} / {totalItemPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
                                    disabled={safeItemPage >= totalItemPages}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
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
