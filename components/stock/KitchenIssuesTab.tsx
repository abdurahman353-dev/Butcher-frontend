"use client";

import React, { useState } from "react";
import { KitchenIssue, RestaurantStockItem } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import {
    UtensilsCrossed,
    PlusCircle,
    CheckCircle,
    AlertCircle,
    Clock,
    RotateCcw,
    Trash2,
    Search,
    Check,
    X,
    Sparkles,
} from "lucide-react";

interface KitchenIssuesTabProps {
    issues: KitchenIssue[];
    stocks: RestaurantStockItem[];
    isLoading: boolean;
    onIssueStock: (payload: {
        stock_id: number;
        issued_quantity: number;
        expected_dish?: string;
        notes?: string;
    }) => Promise<void>;
    onReconcile: (
        issueId: number,
        payload: {
            remaining_quantity: number;
            return_to_store?: boolean;
            notes?: string;
        }
    ) => Promise<void>;
    onDeleteIssue: (issueId: number) => Promise<void>;
}

export function KitchenIssuesTab({
    issues,
    stocks,
    isLoading,
    onIssueStock,
    onReconcile,
    onDeleteIssue,
}: KitchenIssuesTabProps) {
    // Modal states
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [reconcileTarget, setReconcileTarget] = useState<KitchenIssue | null>(null);

    // Issue Form State
    const [selectedStockId, setSelectedStockId] = useState<number | "">("");
    const [issuedQuantity, setIssuedQuantity] = useState<string>("");
    const [expectedDish, setExpectedDish] = useState<string>("");
    const [issueNotes, setIssueNotes] = useState<string>("");
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
    const [issueError, setIssueError] = useState<string | null>(null);

    // Reconcile Form State
    const [remainingQuantity, setRemainingQuantity] = useState<string>("0");
    const [returnToStore, setReturnToStore] = useState<boolean>(true);
    const [reconcileNotes, setReconcileNotes] = useState<string>("");
    const [isSubmittingReconcile, setIsSubmittingReconcile] = useState(false);
    const [reconcileError, setReconcileError] = useState<string | null>(null);

    // Filter State
    const [statusFilter, setStatusFilter] = useState<"all" | "in_kitchen" | "reconciled">("all");
    const [search, setSearch] = useState("");

    const selectedStock = stocks.find((s) => s.id === Number(selectedStockId));

    // Quick preset chips for rapid selection
    const commonDishPresets = [
        "Breakfast Chapatis & Mandazi",
        "Lunch Pilau / Biryani",
        "Ugali & Stew",
        "Fried Rice & Meat",
        "Kitchen Cooking Oil",
        "Afternoon Tea (Chai)",
    ];

    const handleOpenIssueModal = (preselectedStockId?: number) => {
        if (preselectedStockId) {
            setSelectedStockId(preselectedStockId);
        } else if (stocks.length > 0) {
            setSelectedStockId(stocks[0].id);
        }
        setIssuedQuantity("");
        setExpectedDish("");
        setIssueNotes("");
        setIssueError(null);
        setIsIssueModalOpen(true);
    };

    const handleSubmitIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStockId || !issuedQuantity) {
            setIssueError("Please select an ingredient and enter the quantity to issue.");
            return;
        }

        const qty = parseFloat(issuedQuantity);
        if (isNaN(qty) || qty <= 0) {
            setIssueError("Quantity must be a positive number.");
            return;
        }

        if (selectedStock && qty > selectedStock.current_quantity) {
            setIssueError(
                `Cannot issue ${qty} ${selectedStock.unit}. Only ${selectedStock.current_quantity} ${selectedStock.unit} available in store.`
            );
            return;
        }

        try {
            setIsSubmittingIssue(true);
            setIssueError(null);
            await onIssueStock({
                stock_id: Number(selectedStockId),
                issued_quantity: qty,
                expected_dish: expectedDish || undefined,
                notes: issueNotes || undefined,
            });
            setIsIssueModalOpen(false);
        } catch (err: any) {
            setIssueError(err.response?.data?.message || err.message || "Failed to issue stock.");
        } finally {
            setIsSubmittingIssue(false);
        }
    };

    const handleOpenReconcileModal = (issue: KitchenIssue) => {
        setReconcileTarget(issue);
        setRemainingQuantity("0");
        setReturnToStore(true);
        setReconcileNotes("");
        setReconcileError(null);
    };

    const handleSubmitReconcile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reconcileTarget) return;

        const remaining = parseFloat(remainingQuantity);
        if (isNaN(remaining) || remaining < 0) {
            setReconcileError("Remaining quantity must be 0 or greater.");
            return;
        }

        if (remaining > reconcileTarget.issued_quantity) {
            setReconcileError(
                `Leftover cannot exceed the originally issued ${reconcileTarget.issued_quantity} ${reconcileTarget.unit}.`
            );
            return;
        }

        try {
            setIsSubmittingReconcile(true);
            setReconcileError(null);
            await onReconcile(reconcileTarget.id, {
                remaining_quantity: remaining,
                return_to_store: returnToStore,
                notes: reconcileNotes || undefined,
            });
            setReconcileTarget(null);
        } catch (err: any) {
            setReconcileError(err.response?.data?.message || err.message || "Failed to reconcile closing count.");
        } finally {
            setIsSubmittingReconcile(false);
        }
    };

    // Filtered issues
    const filteredIssues = issues.filter((iss) => {
        if (statusFilter !== "all" && iss.status !== statusFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            const matchName = iss.item_name.toLowerCase().includes(q);
            const matchDish = iss.expected_dish?.toLowerCase().includes(q);
            const matchNotes = iss.notes?.toLowerCase().includes(q);
            if (!matchName && !matchDish && !matchNotes) return false;
        }
        return true;
    });

    const activeKitchenIssues = issues.filter((i) => i.status === "in_kitchen");

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header and Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900">Daily Kitchen Issues & Variance</h2>
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            {activeKitchenIssues.length} Cooking
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                        Issue raw store ingredients to kitchen pots, then reconcile closing counts at shift end to record exact usage.
                    </p>
                </div>

                <button
                    onClick={() => handleOpenIssueModal()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors w-full sm:w-auto shrink-0"
                >
                    <PlusCircle className="w-4 h-4" />
                    Issue Stock to Kitchen
                </button>
            </div>

            {/* Active in Kitchen Section */}
            {activeKitchenIssues.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-4 sm:p-5 rounded-xl border border-amber-200/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <h3 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wider">
                                Currently Cooking / In-Kitchen Batches ({activeKitchenIssues.length})
                            </h3>
                        </div>
                        <span className="text-xs text-amber-800 font-medium">
                            Total in pots:{" "}
                            <strong>
                                {formatCurrency(activeKitchenIssues.reduce((acc, curr) => acc + curr.issued_cost, 0))}
                            </strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeKitchenIssues.map((issue) => (
                            <div
                                key={issue.id}
                                className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-900 truncate">{issue.item_name}</h4>
                                            <p className="text-xs font-semibold text-amber-700 mt-0.5">
                                                {issue.issued_quantity} {issue.unit} ({formatCurrency(issue.issued_cost)})
                                            </p>
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3" />
                                            In Kitchen
                                        </span>
                                    </div>

                                    {issue.expected_dish && (
                                        <div className="mt-2 text-xs text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span className="truncate">{issue.expected_dish}</span>
                                        </div>
                                    )}

                                    <div className="mt-2 text-[11px] text-zinc-400">
                                        Issued: {formatDateTime(issue.issued_at)} by {issue.issued_by_name || "Staff"}
                                    </div>
                                </div>

                                <div className="mt-3 sm:mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenReconcileModal(issue)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Reconcile Count
                                    </button>

                                    <button
                                        onClick={() => onDeleteIssue(issue.id)}
                                        title="Cancel issue and return to store"
                                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Issues History & Filters */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900">Kitchen Issue Ledger</h3>
                        <span className="text-xs text-zinc-400">({filteredIssues.length} records)</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                        {/* Search */}
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search ingredient, dish..."
                                className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "all" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setStatusFilter("in_kitchen")}
                                className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "in_kitchen"
                                        ? "bg-white text-zinc-900 shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900"
                                    }`}
                            >
                                In Kitchen
                            </button>
                            <button
                                onClick={() => setStatusFilter("reconciled")}
                                className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "reconciled"
                                        ? "bg-white text-zinc-900 shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900"
                                    }`}
                            >
                                Reconciled
                            </button>
                        </div>
                    </div>
                </div>

                {/* Ledger Content: Responsive Mobile Cards + Desktop Table */}
                {filteredIssues.length > 0 ? (
                    <div>
                        {/* Mobile Cards (< md) */}
                        <div className="block md:hidden divide-y divide-zinc-100">
                            {filteredIssues.map((issue) => {
                                const isReconciled = issue.status === "reconciled";

                                return (
                                    <div key={issue.id} className="py-3 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-sm text-zinc-900">{issue.item_name}</div>
                                                <div className="text-[11px] text-zinc-400">{formatDateTime(issue.issued_at)}</div>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isReconciled
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-amber-100 text-amber-800"
                                                    }`}
                                            >
                                                {isReconciled ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {isReconciled ? "Reconciled" : "In Kitchen"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Issued</span>
                                                <span className="font-medium text-zinc-800">
                                                    {issue.issued_quantity} {issue.unit}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Net Used</span>
                                                <span className="font-bold text-amber-900">
                                                    {isReconciled ? `${issue.used_quantity} ${issue.unit}` : "Cooking"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Leftover</span>
                                                <span className="text-zinc-700">
                                                    {isReconciled ? `${issue.remaining_quantity} ${issue.unit}` : "—"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Actual Cost</span>
                                                <span className="font-bold text-emerald-700">
                                                    {isReconciled ? formatCurrency(issue.actual_cost_used) : `~${formatCurrency(issue.issued_cost)}`}
                                                </span>
                                            </div>
                                        </div>

                                        {issue.expected_dish && (
                                            <div className="text-xs text-zinc-600 truncate">
                                                <span className="text-zinc-400">Purpose: </span>
                                                {issue.expected_dish}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-2 pt-1">
                                            {!isReconciled && (
                                                <button
                                                    onClick={() => handleOpenReconcileModal(issue)}
                                                    className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-bold"
                                                >
                                                    Reconcile Count
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDeleteIssue(issue.id)}
                                                className="p-1 text-zinc-400 hover:text-rose-600"
                                                title="Delete issue record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[11px] border-y border-zinc-200">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                                        <th className="py-2.5 px-3 font-semibold">Ingredient</th>
                                        <th className="py-2.5 px-3 font-semibold">Issued Qty</th>
                                        <th className="py-2.5 px-3 font-semibold">Leftover (Store)</th>
                                        <th className="py-2.5 px-3 font-semibold">Net Used (Cooked)</th>
                                        <th className="py-2.5 px-3 font-semibold">Actual Cost Used</th>
                                        <th className="py-2.5 px-3 font-semibold">Expected Dish</th>
                                        <th className="py-2.5 px-3 font-semibold">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredIssues.map((issue) => {
                                        const isReconciled = issue.status === "reconciled";

                                        return (
                                            <tr key={issue.id} className="hover:bg-zinc-50/70">
                                                <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                                                    {formatDateTime(issue.issued_at)}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-zinc-900">
                                                    {issue.item_name}
                                                </td>
                                                <td className="py-3 px-3 font-medium text-zinc-700">
                                                    {issue.issued_quantity} {issue.unit}
                                                </td>
                                                <td className="py-3 px-3 text-zinc-600">
                                                    {isReconciled ? `${issue.remaining_quantity} ${issue.unit}` : "—"}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-zinc-900">
                                                    {isReconciled ? (
                                                        <span className="text-amber-800">
                                                            {issue.used_quantity} {issue.unit}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">In cooking</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-zinc-900">
                                                    {isReconciled ? (
                                                        <span className="text-emerald-700">
                                                            {formatCurrency(issue.actual_cost_used)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">
                                                            ~{formatCurrency(issue.issued_cost)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-zinc-600 max-w-xs truncate">
                                                    {issue.expected_dish || "—"}
                                                </td>
                                                <td className="py-3 px-3">
                                                    {isReconciled ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                                            <Check className="w-3 h-3" />
                                                            Reconciled
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                                            <Clock className="w-3 h-3" />
                                                            In Kitchen
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    {!isReconciled ? (
                                                        <button
                                                            onClick={() => handleOpenReconcileModal(issue)}
                                                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline mr-2"
                                                        >
                                                            Reconcile
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        onClick={() => onDeleteIssue(issue.id)}
                                                        title="Delete issue record"
                                                        className="text-zinc-400 hover:text-rose-600 p-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 inline" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-zinc-400 text-sm">
                        No kitchen issue records match your filters.
                    </div>
                )}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* MODAL 1: Issue Stock to Kitchen */}
            {/* ───────────────────────────────────────────────────────────── */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                                    <UtensilsCrossed className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900">Issue Ingredients to Kitchen</h3>
                                    <p className="text-xs text-zinc-500">Release raw materials from store to cooking pots</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsIssueModalOpen(false)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitIssue} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                            {issueError && (
                                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{issueError}</span>
                                </div>
                            )}

                            {/* Select Raw Ingredient */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Raw Stock Ingredient *
                                </label>
                                <select
                                    value={selectedStockId}
                                    onChange={(e) => setSelectedStockId(e.target.value ? Number(e.target.value) : "")}
                                    required
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                >
                                    <option value="" disabled>
                                        Select ingredient from store...
                                    </option>
                                    {stocks.map((stk) => (
                                        <option key={stk.id} value={stk.id}>
                                            {stk.item_name} ({stk.current_quantity} {stk.unit} available in store @ {formatCurrency(stk.unit_cost)}/{stk.unit})
                                        </option>
                                    ))}
                                </select>

                                {selectedStock && (
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        Store Stock:{" "}
                                        <strong className="text-zinc-800">
                                            {selectedStock.current_quantity} {selectedStock.unit}
                                        </strong>{" "}
                                        | Unit cost: {formatCurrency(selectedStock.unit_cost)}
                                    </p>
                                )}
                            </div>

                            {/* Issued Quantity */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Quantity to Issue ({selectedStock?.unit || "KG / Litres"}) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={issuedQuantity}
                                        onChange={(e) => setIssuedQuantity(e.target.value)}
                                        placeholder="e.g. 10.0"
                                        required
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold">
                                        {selectedStock?.unit || "Units"}
                                    </span>
                                </div>
                                {selectedStock && issuedQuantity && !isNaN(parseFloat(issuedQuantity)) && (
                                    <p className="text-[11px] text-amber-800 font-medium mt-1">
                                        Estimated batch cost:{" "}
                                        <strong>
                                            {formatCurrency(parseFloat(issuedQuantity) * selectedStock.unit_cost)}
                                        </strong>
                                    </p>
                                )}
                            </div>

                            {/* Expected Dish Preset & Input */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Expected Dish / Purpose
                                </label>
                                <input
                                    type="text"
                                    value={expectedDish}
                                    onChange={(e) => setExpectedDish(e.target.value)}
                                    placeholder="e.g. Breakfast Chapatis, Lunch Pilau, Cooking Oil"
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />

                                {/* Quick Presets */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {commonDishPresets.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setExpectedDish(preset)}
                                            className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Notes / Shift Details
                                </label>
                                <textarea
                                    rows={2}
                                    value={issueNotes}
                                    onChange={(e) => setIssueNotes(e.target.value)}
                                    placeholder="Shift details or instructions for kitchen cooks..."
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsIssueModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingIssue}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                                >
                                    {isSubmittingIssue ? "Issuing..." : "Confirm & Issue to Kitchen"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* MODAL 2: Reconcile Closing Count */}
            {/* ───────────────────────────────────────────────────────────── */}
            {reconcileTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900">Reconcile Closing Count</h3>
                                    <p className="text-xs text-zinc-500">Record closing leftover to compute exact usage</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReconcileTarget(null)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitReconcile} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                            {reconcileError && (
                                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{reconcileError}</span>
                                </div>
                            )}

                            {/* Batch Summary */}
                            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs space-y-1">
                                <div className="flex justify-between font-bold text-zinc-900">
                                    <span>Ingredient: {reconcileTarget.item_name}</span>
                                    <span>Unit Cost: {formatCurrency(reconcileTarget.unit_cost)}</span>
                                </div>
                                <div className="flex justify-between text-zinc-600">
                                    <span>Originally Issued: {reconcileTarget.issued_quantity} {reconcileTarget.unit}</span>
                                    <span>Initial Value: {formatCurrency(reconcileTarget.issued_cost)}</span>
                                </div>
                                {reconcileTarget.expected_dish && (
                                    <div className="text-zinc-500 italic">
                                        Purpose: {reconcileTarget.expected_dish}
                                    </div>
                                )}
                            </div>

                            {/* Remaining Leftover */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Leftover / Uncooked Quantity in Kitchen ({reconcileTarget.unit}) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        max={reconcileTarget.issued_quantity}
                                        value={remainingQuantity}
                                        onChange={(e) => setRemainingQuantity(e.target.value)}
                                        required
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold">
                                        {reconcileTarget.unit}
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">
                                    Enter 0 if all {reconcileTarget.issued_quantity} {reconcileTarget.unit} were completely cooked and sold.
                                </p>
                            </div>

                            {/* Live Calculation Preview */}
                            {(() => {
                                const rem = parseFloat(remainingQuantity) || 0;
                                const netUsed = Math.max(0, reconcileTarget.issued_quantity - rem);
                                const actualCost = netUsed * reconcileTarget.unit_cost;

                                return (
                                    <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs space-y-1">
                                        <div className="flex justify-between text-emerald-950 font-bold">
                                            <span>Net Ingredient Used:</span>
                                            <span>
                                                {netUsed.toFixed(3)} {reconcileTarget.unit}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-emerald-900 font-semibold">
                                            <span>Actual Expense Recorded:</span>
                                            <span>{formatCurrency(actualCost)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Checkbox: Return leftover to store */}
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700">
                                <input
                                    type="checkbox"
                                    checked={returnToStore}
                                    onChange={(e) => setReturnToStore(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                                />
                                <span>Return unused {reconcileTarget.unit} back to store stock balance</span>
                            </label>

                            {/* Reconciliation Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Closing Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={reconcileNotes}
                                    onChange={(e) => setReconcileNotes(e.target.value)}
                                    placeholder="e.g. 50 chapatis produced, minimal waste"
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setReconcileTarget(null)}
                                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReconcile}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                                >
                                    {isSubmittingReconcile ? "Saving..." : "Save Reconciliation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
