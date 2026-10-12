"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSystemDialog } from "@/contexts/DialogContext";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { restaurantStockService } from "@/services/restaurantStock.service";
import {
    RestaurantStockItem,
    KitchenIssue,
    StockExpenseAnalytics,
    CreateStockPayload,
    IssueToKitchenPayload,
    ReconcileKitchenIssuePayload,
} from "@/types";
import { StockOverviewTab } from "@/components/stock/StockOverviewTab";
import { KitchenIssuesTab } from "@/components/stock/KitchenIssuesTab";
import { StoreInventoryTab } from "@/components/stock/StoreInventoryTab";
import {
    UtensilsCrossed,
    Boxes,
    TrendingUp,
    RefreshCw,
    AlertCircle,
    ShieldAlert,
    ArrowLeft,
    ChevronDown,
    Info,
} from "lucide-react";

export default function RestaurantStockPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { confirm } = useSystemDialog();
    const isRestaurant = user?.company?.business_type === "restaurant";

    // Tab State
    const [activeTab, setActiveTab] = useState<"overview" | "issues" | "store">("overview");

    // Timeframe Filter for Overview & Issues
    const [period, setPeriod] = useState<string>("today");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Data States
    const [analytics, setAnalytics] = useState<StockExpenseAnalytics | null>(null);
    const [stocks, setStocks] = useState<RestaurantStockItem[]>([]);
    const [issues, setIssues] = useState<KitchenIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOfflinePreview, setIsOfflinePreview] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Fetch all stock data
    const loadData = useCallback(async (isSilent = false) => {
        if (!isRestaurant) return;

        if (!isSilent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const analyticsParams: { period?: string; start_date?: string; end_date?: string } = {};
            if (startDate) analyticsParams.start_date = startDate;
            if (endDate) analyticsParams.end_date = endDate;
            if (period && !startDate && !endDate) analyticsParams.period = period;

            const [analyticsRes, stockRes, issuesRes] = await Promise.all([
                restaurantStockService.getAnalytics(analyticsParams),
                restaurantStockService.getStock({ per_page: "all" }),
                restaurantStockService.getKitchenIssues({ per_page: "all" }),
            ]);

            setAnalytics(analyticsRes);

            const stockItems = Array.isArray(stockRes.data) ? stockRes.data : stockRes.data.data;
            setStocks(stockItems || []);

            const issueItems = Array.isArray(issuesRes.data) ? issuesRes.data : issuesRes.data.data;
            setIssues(issueItems || []);

            if (stockRes.is_offline_preview || issuesRes.is_offline_preview || analyticsRes.is_offline_preview) {
                setIsOfflinePreview(true);
            }
        } catch (err: any) {
            console.error("Failed to load restaurant stock data:", err);
            setFeedbackMessage({
                type: "error",
                text: err?.message || err?.response?.data?.message || "Failed to load stock data.",
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [isRestaurant, period, startDate, endDate]);

    useEffect(() => {
        if (!isAuthLoading && isRestaurant) {
            loadData();
        }
    }, [isAuthLoading, isRestaurant, loadData]);

    // Listen for data refresh events
    useEffect(() => {
        const handleDataChange = () => {
            loadData(true);
        };
        window.addEventListener("butcher:data-change", handleDataChange);
        return () => window.removeEventListener("butcher:data-change", handleDataChange);
    }, [loadData]);

    // Auto-clear feedback messages
    useEffect(() => {
        if (feedbackMessage) {
            const timer = setTimeout(() => setFeedbackMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

    // Actions
    const handleAddStock = async (payload: CreateStockPayload) => {
        const res = await restaurantStockService.recordStockPurchase(payload);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleUpdateStock = async (
        id: number,
        payload: Partial<CreateStockPayload> & { current_quantity?: number }
    ) => {
        const res = await restaurantStockService.updateStock(id, payload);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleDeleteStock = async (id: number) => {
        const confirmed = await confirm({
            title: "Delete Stock Item",
            message: "Are you sure you want to permanently delete this ingredient from store? This cannot be undone.",
            confirmText: "Yes, Delete",
            cancelText: "Cancel",
            type: "danger",
        });
        if (!confirmed) return;
        const res = await restaurantStockService.deleteStock(id);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleIssueStock = async (payload: IssueToKitchenPayload) => {
        const res = await restaurantStockService.issueToKitchen(payload);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleReconcileIssue = async (
        issueId: number,
        payload: ReconcileKitchenIssuePayload
    ) => {
        const res = await restaurantStockService.reconcileKitchenIssue(issueId, payload);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleDeleteIssue = async (issueId: number) => {
        const confirmed = await confirm({
            title: "Cancel Kitchen Issue",
            message: "Cancel this kitchen issue and restore the stock back to the store?",
            confirmText: "Yes, Cancel & Restore",
            cancelText: "Keep Issue",
            type: "warning",
        });
        if (!confirmed) return;
        const res = await restaurantStockService.deleteKitchenIssue(issueId);
        setFeedbackMessage({ type: "success", text: res.message });
        loadData(true);
    };

    const handleQuickIssueFromStore = (_stockId: number) => {
        setActiveTab("issues");
    };

    // Guard: If not a restaurant business
    if (!isAuthLoading && !isRestaurant) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
                <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">Restaurant Only Feature</h2>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                        The Kitchen Stock & Expense Tracking module is exclusively designed for restaurant accounts to manage raw ingredient batches (wheat, rice, cooking oil) and compute food cost margins against POS orders.
                    </p>
                    <Link
                        href="/inventory"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Butchery Inventory
                    </Link>
                </div>
            </div>
        );
    }

    const activeInKitchenCount = issues.filter((i) => i.status === "in_kitchen").length;

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-20 min-w-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                        <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight truncate">
                            Kitchen Stock & Expenses
                        </h1>
                        <p className="text-xs text-zinc-500 line-clamp-1 sm:line-clamp-none">
                            Track raw store ingredients, daily cooking issues, and reconcile food cost margins against POS sales.
                        </p>
                    </div>
                </div>

                {/* Global Controls: Refresh */}
                <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => loadData(true)}
                        disabled={isRefreshing || isLoading}
                        className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                        title="Refresh Data"
                        aria-label="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Offline / Preview Mode Information Banner */}
            {isOfflinePreview && (
                <div className="p-3 sm:p-3.5 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-900 text-xs flex items-start sm:items-center gap-2.5 shadow-xs">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1">
                        <span className="font-bold">Interactive Preview Active: </span>
                        <span className="text-amber-800">
                            Stock items, kitchen issues, and reconciliation are saved in your local workspace so you can test all features smoothly.
                        </span>
                    </div>
                </div>
            )}

            {/* Toast Feedback */}
            {feedbackMessage && (
                <div
                    className={`p-3 sm:p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${feedbackMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                >
                    <span>{feedbackMessage.text}</span>
                    <button
                        onClick={() => setFeedbackMessage(null)}
                        className="text-zinc-400 hover:text-zinc-700 ml-3 text-base leading-none"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Responsive Navigation Tabs (Horizontally scrollable on mobile) */}
            <div className="border-b border-zinc-200 overflow-x-auto scrollbar-none no-scrollbar -mx-3 sm:mx-0 px-3 sm:px-0">
                <nav className="flex space-x-2 sm:space-x-6 min-w-max pb-px">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`py-2.5 sm:py-3 px-2 sm:px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === "overview"
                                ? "border-amber-600 text-amber-700"
                                : "border-transparent text-zinc-500 hover:text-zinc-900"
                            }`}
                    >
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        <span>Executive Summary & P&L</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("issues")}
                        className={`py-2.5 sm:py-3 px-2 sm:px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === "issues"
                                ? "border-amber-600 text-amber-700"
                                : "border-transparent text-zinc-500 hover:text-zinc-900"
                            }`}
                    >
                        <UtensilsCrossed className="w-4 h-4 shrink-0" />
                        <span>Daily Kitchen Issues</span>
                        {activeInKitchenCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                                {activeInKitchenCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("store")}
                        className={`py-2.5 sm:py-3 px-2 sm:px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === "store"
                                ? "border-amber-600 text-amber-700"
                                : "border-transparent text-zinc-500 hover:text-zinc-900"
                            }`}
                    >
                        <Boxes className="w-4 h-4 shrink-0" />
                        <span>Raw Store Stock ({stocks.length})</span>
                    </button>
                </nav>
            </div>

            {/* Tab Panels */}
            <div className="min-w-0">
                {activeTab === "overview" && (
                    <StockOverviewTab
                        analytics={analytics}
                        isLoading={isLoading}
                        period={period}
                        onPeriodChange={setPeriod}
                        startDate={startDate}
                        onStartDateChange={setStartDate}
                        endDate={endDate}
                        onEndDateChange={setEndDate}
                        onNavigateToIssues={() => setActiveTab("issues")}
                        onNavigateToStore={() => setActiveTab("store")}
                    />
                )}

                {activeTab === "issues" && (
                    <KitchenIssuesTab
                        issues={issues}
                        stocks={stocks}
                        isLoading={isLoading}
                        onIssueStock={handleIssueStock}
                        onReconcile={handleReconcileIssue}
                        onDeleteIssue={handleDeleteIssue}
                    />
                )}

                {activeTab === "store" && (
                    <StoreInventoryTab
                        stocks={stocks}
                        isLoading={isLoading}
                        onAddStock={handleAddStock}
                        onUpdateStock={handleUpdateStock}
                        onDeleteStock={handleDeleteStock}
                        onIssueQuick={handleQuickIssueFromStore}
                    />
                )}
            </div>
        </div>
    );
}
