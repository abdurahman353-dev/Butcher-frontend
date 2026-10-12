"use client";

import React, { useState } from "react";
import { RestaurantStockItem, CreateStockPayload } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import {
    Boxes,
    PlusCircle,
    AlertTriangle,
    Search,
    Edit2,
    Trash2,
    UtensilsCrossed,
    X,
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    SlidersHorizontal,
    ChevronDown,
} from "lucide-react";

interface StoreInventoryTabProps {
    stocks: RestaurantStockItem[];
    isLoading: boolean;
    onAddStock: (payload: CreateStockPayload) => Promise<void>;
    onUpdateStock: (
        id: number,
        payload: Partial<CreateStockPayload> & { current_quantity?: number }
    ) => Promise<void>;
    onDeleteStock: (id: number) => Promise<void>;
    onIssueQuick: (stockId: number) => void;
}

const STOCK_CATEGORIES = [
    "All Categories",
    "Flour & Grains",
    "Cooking Oil & Fats",
    "Vegetables & Produce",
    "Meat & Poultry",
    "Dairy & Eggs",
    "Spices & Seasoning",
    "Beverages & Sugar",
    "General Kitchen Supplies",
];

const PRESET_INGREDIENTS = [
    { name: "Wheat Flour (Baking)", cat: "Flour & Grains", unit: "KG", cost: 180 },
    { name: "Pishori Rice", cat: "Flour & Grains", unit: "KG", cost: 240 },
    { name: "Cooking Oil (Vegetable)", cat: "Cooking Oil & Fats", unit: "LITRE", cost: 280 },
    { name: "Irish Potatoes (Warua)", cat: "Vegetables & Produce", unit: "KG", cost: 90 },
    { name: "Red Onions", cat: "Vegetables & Produce", unit: "KG", cost: 110 },
    { name: "Tomatoes (Fresh)", cat: "Vegetables & Produce", unit: "KG", cost: 120 },
    { name: "Fresh Milk", cat: "Dairy & Eggs", unit: "LITRE", cost: 70 },
    { name: "Kitchen Cuts Beef", cat: "Meat & Poultry", unit: "KG", cost: 650 },
    { name: "White Sugar", cat: "Spices & Seasoning", unit: "KG", cost: 150 },
    { name: "Pilau Masala & Spices", cat: "Spices & Seasoning", unit: "KG", cost: 450 },
];

export function StoreInventoryTab({
    stocks,
    isLoading,
    onAddStock,
    onUpdateStock,
    onDeleteStock,
    onIssueQuick,
}: StoreInventoryTabProps) {
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingStock, setEditingStock] = useState<RestaurantStockItem | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [stockStatus, setStockStatus] = useState<"all" | "sufficient" | "low" | "out">("all");
    const [sortBy, setSortBy] = useState<"name_az" | "name_za" | "qty_high" | "qty_low" | "value_high" | "value_low" | "cost_high" | "cost_low">("name_az");
    const [supplierFilter, setSupplierFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // Inline quick-adjust (increment / dispense)
    const [adjustTarget, setAdjustTarget] = useState<{ id: number; mode: "increment" | "dispense" } | null>(null);
    const [adjustQty, setAdjustQty] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    const handleQuickAdjust = async (stock: RestaurantStockItem) => {
        const delta = parseFloat(adjustQty);
        if (isNaN(delta) || delta <= 0) return;
        const newQty = adjustTarget?.mode === "increment"
            ? stock.current_quantity + delta
            : Math.max(0, stock.current_quantity - delta);
        try {
            setIsAdjusting(true);
            await onUpdateStock(stock.id, { current_quantity: newQty });
            setAdjustTarget(null);
            setAdjustQty("");
        } finally {
            setIsAdjusting(false);
        }
    };

    // Form State for Add / Edit
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("Flour & Grains");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("KG");
    const [unitCost, setUnitCost] = useState("");
    const [minThreshold, setMinThreshold] = useState("5");
    const [supplier, setSupplier] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "bank" | "credit">("cash");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [notes, setNotes] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const resetForm = () => {
        setItemName("");
        setCategory("Flour & Grains");
        setQuantity("");
        setUnit("KG");
        setUnitCost("");
        setMinThreshold("5");
        setSupplier("");
        setPaymentMethod("cash");
        setInvoiceNumber("");
        setNotes("");
        setFormError(null);
    };

    const handleOpenAddModal = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (stock: RestaurantStockItem) => {
        setEditingStock(stock);
        setItemName(stock.item_name);
        setCategory(stock.category);
        setQuantity(String(stock.current_quantity));
        setUnit(stock.unit);
        setUnitCost(String(stock.unit_cost));
        setMinThreshold(String(stock.min_threshold));
        setSupplier(stock.supplier || "");
        setPaymentMethod((stock.payment_method as "cash" | "mpesa" | "bank" | "credit") || "cash");
        setInvoiceNumber(stock.invoice_number || "");
        setNotes(stock.notes || "");
        setFormError(null);
    };

    const handleSelectPreset = (preset: typeof PRESET_INGREDIENTS[0]) => {
        setItemName(preset.name);
        setCategory(preset.cat);
        setUnit(preset.unit);
        setUnitCost(String(preset.cost));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim()) {
            setFormError("Ingredient item name is required.");
            return;
        }

        const qty = parseFloat(quantity);
        const cost = parseFloat(unitCost);
        const min = parseFloat(minThreshold);

        if (isNaN(qty) || qty < 0) {
            setFormError("Quantity must be a valid number (0 or greater).");
            return;
        }
        if (isNaN(cost) || cost < 0) {
            setFormError("Unit cost must be a valid positive amount.");
            return;
        }

        try {
            setIsSubmitting(true);
            setFormError(null);

            if (editingStock) {
                await onUpdateStock(editingStock.id, {
                    item_name: itemName.trim(),
                    category,
                    quantity: qty,
                    current_quantity: qty,
                    unit,
                    unit_cost: cost,
                    min_threshold: isNaN(min) ? 5 : min,
                    supplier: supplier.trim() || undefined,
                    payment_method: paymentMethod,
                    invoice_number: invoiceNumber.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                setEditingStock(null);
                resetForm();
            } else {
                await onAddStock({
                    item_name: itemName.trim(),
                    category,
                    quantity: qty,
                    unit,
                    unit_cost: cost,
                    min_threshold: isNaN(min) ? 5 : min,
                    supplier: supplier.trim() || undefined,
                    payment_method: paymentMethod,
                    invoice_number: invoiceNumber.trim() || undefined,
                    notes: notes.trim() || undefined,
                });
                setIsAddModalOpen(false);
                resetForm();
            }
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || "Failed to save stock item.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived filter options
    const uniqueSuppliers = Array.from(new Set(stocks.map((s) => s.supplier).filter(Boolean))) as string[];

    // Filtered + sorted store stocks
    const filteredStocks = stocks
        .filter((stk) => {
            if (categoryFilter !== "All Categories" && stk.category !== categoryFilter) return false;
            if (stockStatus === "sufficient" && stk.current_quantity <= stk.min_threshold) return false;
            if (stockStatus === "low" && (stk.current_quantity === 0 || stk.current_quantity > stk.min_threshold)) return false;
            if (stockStatus === "out" && stk.current_quantity > 0) return false;
            if (supplierFilter !== "all" && stk.supplier !== supplierFilter) return false;
            if (paymentFilter !== "all" && stk.payment_method !== paymentFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                if (
                    !stk.item_name.toLowerCase().includes(q) &&
                    !stk.category.toLowerCase().includes(q) &&
                    !(stk.supplier?.toLowerCase().includes(q)) &&
                    !(stk.notes?.toLowerCase().includes(q)) &&
                    !(stk.invoice_number?.toLowerCase().includes(q))
                ) return false;
            }
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "name_az": return a.item_name.localeCompare(b.item_name);
                case "name_za": return b.item_name.localeCompare(a.item_name);
                case "qty_high": return b.current_quantity - a.current_quantity;
                case "qty_low": return a.current_quantity - b.current_quantity;
                case "value_high": return (b.current_quantity * b.unit_cost) - (a.current_quantity * a.unit_cost);
                case "value_low": return (a.current_quantity * a.unit_cost) - (b.current_quantity * b.unit_cost);
                case "cost_high": return b.unit_cost - a.unit_cost;
                case "cost_low": return a.unit_cost - b.unit_cost;
                default: return 0;
            }
        });

    const totalPages = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedStocks = filteredStocks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Reset to page 1 when filters change
    const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

    const totalValuation = stocks.reduce((acc, s) => acc + s.current_quantity * s.unit_cost, 0);
    const lowStockCount = stocks.filter((s) => s.current_quantity <= s.min_threshold).length;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Valuation and Quick Action Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6">
                    <div>
                        <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Store Raw Stock Valuation
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5 break-words">
                            {formatCurrency(totalValuation)}
                        </div>
                    </div>

                    <div className="sm:border-l sm:border-zinc-200 sm:pl-6">
                        <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Store Items
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                            {stocks.length} <span className="text-xs font-normal text-zinc-400">ingredients</span>
                        </div>
                    </div>

                    {lowStockCount > 0 && (
                        <div className="col-span-2 sm:col-span-1 sm:border-l sm:border-zinc-200 sm:pl-6">
                            <div className="text-[11px] sm:text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                Low Stock Alert
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-0.5">
                                {lowStockCount} <span className="text-xs font-normal text-rose-600">needs restock</span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors w-full sm:w-auto shrink-0"
                >
                    <PlusCircle className="w-4 h-4" />
                    Purchase / Restock Raw Material
                </button>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
                {/* Header row — always visible */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Title */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">Raw Store Materials Inventory</h3>
                        <span className="text-xs text-zinc-400 shrink-0">({filteredStocks.length} of {stocks.length})</span>
                    </div>

                    {/* Search — always visible */}
                    <div className="relative hidden sm:block">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
                            placeholder="Search..."
                            className="w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-zinc-50"
                        />
                    </div>

                    {/* Filter toggle */}
                    {(() => {
                        const activeCount = [categoryFilter !== "All Categories", stockStatus !== "all", sortBy !== "name_az", supplierFilter !== "all", paymentFilter !== "all"].filter(Boolean).length;
                        return (
                            <button
                                onClick={() => setShowFilters((v) => !v)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                    showFilters || activeCount > 0
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Filters
                                {activeCount > 0 && (
                                    <span className="ml-0.5 bg-white text-amber-700 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{activeCount}</span>
                                )}
                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
                            </button>
                        );
                    })()}
                </div>

                {/* Mobile search */}
                <div className="px-4 pb-3 sm:hidden">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
                            placeholder="Search name, category, supplier..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-zinc-50"
                        />
                    </div>
                </div>

                {/* Collapsible filter panel - arranged horizontally */}
                {/* Collapsible filter panel - arranged horizontally */}
                {showFilters && (
                    <div className="border-t border-zinc-100 px-3 sm:px-4 py-3 bg-gradient-to-r from-slate-50 via-amber-50/20 to-slate-50">
                        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3">
                            {/* Category Dropdown */}
                            <div className="w-full sm:w-auto flex-1 min-w-[160px] sm:max-w-xs">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => handleFilterChange(() => setCategoryFilter(e.target.value))}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    {STOCK_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Stock Status */}
                            <div className="w-full sm:w-auto min-w-0 sm:min-w-[260px]">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Stock Status</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {([
                                        { key: "all", label: "All Items", active: "bg-zinc-800 text-white", idle: "bg-white text-zinc-600 border-zinc-200" },
                                        { key: "sufficient", label: "✓ Sufficient", active: "bg-emerald-500 text-white shadow-emerald-200 shadow-sm", idle: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                        { key: "low", label: "⚠ Low Stock", active: "bg-amber-500 text-white shadow-amber-200 shadow-sm", idle: "bg-amber-50 text-amber-700 border-amber-200" },
                                        { key: "out", label: "✕ Out of Stock", active: "bg-rose-600 text-white shadow-rose-200 shadow-sm", idle: "bg-rose-50 text-rose-700 border-rose-200" },
                                    ] as const).map(({ key, label, active, idle }) => (
                                        <button key={key} type="button" onClick={() => handleFilterChange(() => setStockStatus(key))}
                                            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all text-center whitespace-nowrap ${stockStatus === key ? active : idle}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort by Dropdown */}
                            <div className="w-full sm:w-auto min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Sort by</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => handleFilterChange(() => setSortBy(e.target.value as any))}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="name_az">Name A → Z</option>
                                    <option value="name_za">Name Z → A</option>
                                    <option value="qty_high">Quantity: High → Low</option>
                                    <option value="qty_low">Quantity: Low → High</option>
                                    <option value="value_high">Total Value: High → Low</option>
                                    <option value="value_low">Total Value: Low → High</option>
                                    <option value="cost_high">Unit Cost: High → Low</option>
                                    <option value="cost_low">Unit Cost: Low → High</option>
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div className="w-full sm:w-auto min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Payment Method</label>
                                <select
                                    value={paymentFilter}
                                    onChange={(e) => handleFilterChange(() => setPaymentFilter(e.target.value as any))}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="all">All Payment Methods</option>
                                    <option value="cash">Cash</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="bank">Bank</option>
                                    <option value="credit">Credit</option>
                                </select>
                            </div>

                            {/* Supplier Dropdown */}
                            {uniqueSuppliers.length > 0 && (
                                <div className="w-full sm:w-auto min-w-[140px] flex-1 sm:flex-initial">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Supplier</label>
                                    <select
                                        value={supplierFilter}
                                        onChange={(e) => handleFilterChange(() => setSupplierFilter(e.target.value))}
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                    >
                                        <option value="all">All Suppliers</option>
                                        {uniqueSuppliers.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Clear All Filters */}
                            {(search || categoryFilter !== "All Categories" || stockStatus !== "all" || sortBy !== "name_az" || supplierFilter !== "all" || paymentFilter !== "all") && (
                                <div className="w-full sm:w-auto pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange(() => { setSearch(""); setCategoryFilter("All Categories"); setStockStatus("all"); setSortBy("name_az"); setSupplierFilter("all"); setPaymentFilter("all"); })}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
                                    >
                                        <X className="w-3.5 h-3.5" /> Clear All
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Inventory Content: Mobile Cards + Desktop Table */}
                {filteredStocks.length > 0 ? (
                    <div>
                        {/* Mobile Cards (< md) */}
                        <div className="block md:hidden divide-y divide-zinc-100">
                            {pagedStocks.map((stock) => {
                                const isLow = stock.current_quantity <= stock.min_threshold;
                                const valuation = stock.current_quantity * stock.unit_cost;

                                return (
                                    <div key={stock.id} className="py-3.5 space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-zinc-900 truncate">{stock.item_name}</div>
                                                <div className="text-[11px] text-zinc-500">{stock.category}</div>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${isLow
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-emerald-100 text-emerald-800"
                                                    }`}
                                            >
                                                {isLow ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                {isLow ? "Low Stock" : "Sufficient"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Balance</span>
                                                <span className={`font-bold ${isLow ? "text-rose-700" : "text-zinc-900"}`}>
                                                    {stock.current_quantity} {stock.unit}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Unit Cost</span>
                                                <span className="text-zinc-700 font-medium">{formatCurrency(stock.unit_cost)}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase">Valuation</span>
                                                <span className="font-bold text-zinc-900">{formatCurrency(valuation)}</span>
                                            </div>
                                        </div>

                                        {stock.supplier && (
                                            <div className="text-[11px] text-zinc-500">
                                                Supplier: <span className="font-medium text-zinc-700">{stock.supplier}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                                            <button
                                                onClick={() => onIssueQuick(stock.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                                            >
                                                <UtensilsCrossed className="w-3.5 h-3.5" />
                                                Issue
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                {/* Inline adjust row */}
                                                {adjustTarget?.id === stock.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            min="0.001"
                                                            step="0.001"
                                                            value={adjustQty}
                                                            onChange={(e) => setAdjustQty(e.target.value)}
                                                            placeholder="qty"
                                                            className="w-16 text-xs px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                                                        />
                                                        <button
                                                            onClick={() => handleQuickAdjust(stock)}
                                                            disabled={isAdjusting}
                                                            className={`px-2 py-1 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50 ${
                                                                adjustTarget.mode === "increment" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                                                            }`}
                                                        >
                                                            {isAdjusting ? "..." : "OK"}
                                                        </button>
                                                        <button onClick={() => { setAdjustTarget(null); setAdjustQty(""); }} className="text-zinc-400 hover:text-zinc-600">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => { setAdjustTarget({ id: stock.id, mode: "increment" }); setAdjustQty(""); }}
                                                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                                                            title="Add / Increment stock"
                                                        >
                                                            <ArrowUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setAdjustTarget({ id: stock.id, mode: "dispense" }); setAdjustQty(""); }}
                                                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                                                            title="Dispense / Reduce stock"
                                                        >
                                                            <ArrowDown className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEditModal(stock)}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Edit details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteStock(stock.id)}
                                                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
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
                                        <th className="py-2.5 px-3 font-semibold">Ingredient</th>
                                        <th className="py-2.5 px-3 font-semibold">Category</th>
                                        <th className="py-2.5 px-3 font-semibold">Store Balance</th>
                                        <th className="py-2.5 px-3 font-semibold">Unit Cost</th>
                                        <th className="py-2.5 px-3 font-semibold">Total Value</th>
                                        <th className="py-2.5 px-3 font-semibold">Min Threshold</th>
                                        <th className="py-2.5 px-3 font-semibold">Supplier</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {pagedStocks.map((stock) => {
                                        const isLow = stock.current_quantity <= stock.min_threshold;
                                        const valuation = stock.current_quantity * stock.unit_cost;

                                        return (
                                            <tr key={stock.id} className="hover:bg-zinc-50/70">
                                                <td className="py-3 px-3 font-bold text-zinc-900 flex items-center gap-2">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${isLow ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                                                            }`}
                                                    />
                                                    {stock.item_name}
                                                </td>
                                                <td className="py-3 px-3 text-zinc-600">{stock.category}</td>
                                                <td className="py-3 px-3">
                                                    <span
                                                        className={`font-bold ${isLow ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full" : "text-zinc-900"
                                                            }`}
                                                    >
                                                        {stock.current_quantity} {stock.unit}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-zinc-700 font-medium">
                                                    {formatCurrency(stock.unit_cost)} / {stock.unit}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-zinc-900">
                                                    {formatCurrency(valuation)}
                                                </td>
                                                <td className="py-3 px-3 text-zinc-500">
                                                    {stock.min_threshold} {stock.unit}
                                                </td>
                                                <td className="py-3 px-3 text-zinc-500 max-w-xs truncate">
                                                    {stock.supplier || "—"}
                                                </td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => onIssueQuick(stock.id)}
                                                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline mr-2 inline-flex items-center gap-1"
                                                    >
                                                        <UtensilsCrossed className="w-3 h-3" />
                                                        Issue
                                                    </button>

                                                    {/* Inline adjust */}
                                                    {adjustTarget?.id === stock.id ? (
                                                        <span className="inline-flex items-center gap-1 mr-1">
                                                            <input
                                                                autoFocus
                                                                type="number"
                                                                min="0.001"
                                                                step="0.001"
                                                                value={adjustQty}
                                                                onChange={(e) => setAdjustQty(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdjust(stock); if (e.key === "Escape") { setAdjustTarget(null); setAdjustQty(""); } }}
                                                                placeholder="qty"
                                                                className="w-14 text-xs px-1.5 py-0.5 border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                                                            />
                                                            <button
                                                                onClick={() => handleQuickAdjust(stock)}
                                                                disabled={isAdjusting}
                                                                className={`px-2 py-0.5 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 ${
                                                                    adjustTarget.mode === "increment" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                                                                }`}
                                                            >
                                                                {isAdjusting ? "..." : "OK"}
                                                            </button>
                                                            <button onClick={() => { setAdjustTarget(null); setAdjustQty(""); }} className="text-zinc-400 hover:text-zinc-600">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => { setAdjustTarget({ id: stock.id, mode: "increment" }); setAdjustQty(""); }}
                                                                className="text-emerald-600 hover:text-emerald-800 p-1 transition-colors"
                                                                title="Add / Increment quantity"
                                                            >
                                                                <ArrowUp className="w-3.5 h-3.5 inline" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setAdjustTarget({ id: stock.id, mode: "dispense" }); setAdjustQty(""); }}
                                                                className="text-rose-600 hover:text-rose-800 p-1 mr-1 transition-colors"
                                                                title="Dispense / Reduce quantity"
                                                            >
                                                                <ArrowDown className="w-3.5 h-3.5 inline" />
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => handleOpenEditModal(stock)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 mr-1 transition-colors"
                                                        title="Edit / Restock"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 inline" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteStock(stock.id)}
                                                        className="text-rose-600 hover:text-rose-800 p-1 transition-colors"
                                                        title="Delete item"
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

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-3 border-t border-zinc-100 gap-3 w-full">
                            <p className="text-xs text-zinc-500 text-center sm:text-left">
                                Showing <strong>{filteredStocks.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(safePage * PAGE_SIZE, filteredStocks.length)}</strong> of <strong>{filteredStocks.length}</strong> ingredients
                            </p>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </button>
                                <span className="px-2 font-bold text-zinc-700 text-xs shrink-0">
                                    {safePage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-zinc-400 text-sm">
                        No ingredients found matching your search or filters.
                    </div>
                )}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* MODAL: Record / Restock Raw Material */}
            {/* ───────────────────────────────────────────────────────────── */}
            {(isAddModalOpen || editingStock) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                                    <Boxes className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900">
                                        {editingStock ? "Edit / Restock Raw Material" : "Record Raw Material Purchase"}
                                    </h3>
                                    <p className="text-xs text-zinc-500">
                                        {editingStock ? "Update inventory balance or costs" : "Add wholesale stock to store inventory"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setEditingStock(null);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                            {formError && (
                                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Quick Preset Buttons (for new additions) */}
                            {!editingStock && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                        Quick Preset Ingredients
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESET_INGREDIENTS.map((item) => (
                                            <button
                                                key={item.name}
                                                type="button"
                                                onClick={() => handleSelectPreset(item)}
                                                className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors"
                                            >
                                                + {item.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Item Name */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Ingredient Item Name *
                                </label>
                                <input
                                    type="text"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="e.g. Wheat Flour (Exe / Baking), Cooking Oil"
                                    required
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {/* Category & Unit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    >
                                        {STOCK_CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Measurement Unit *
                                    </label>
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    >
                                        <option value="KG">Kilogram (KG)</option>
                                        <option value="LITRE">Litre (L)</option>
                                        <option value="BAG">Bag / Sack (50KG/90KG)</option>
                                        <option value="TIN">Tin / Debbe</option>
                                        <option value="PIECE">Piece / Unit</option>
                                        <option value="PACKET">Packet</option>
                                        <option value="BUNCH">Bunch</option>
                                    </select>
                                </div>
                            </div>

                            {/* Quantity & Unit Cost */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Store Quantity ({unit}) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="e.g. 50"
                                        required
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Unit Cost (KSh per {unit}) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={unitCost}
                                        onChange={(e) => setUnitCost(e.target.value)}
                                        placeholder="e.g. 180"
                                        required
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Live Outlay Calculation */}
                            {quantity && unitCost && !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(unitCost)) && (
                                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs flex justify-between font-semibold text-amber-900">
                                    <span>Total Purchase Outlay:</span>
                                    <span>{formatCurrency(parseFloat(quantity) * parseFloat(unitCost))}</span>
                                </div>
                            )}

                            {/* Low Stock Threshold & Supplier */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Low Stock Alert Level ({unit})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={minThreshold}
                                        onChange={(e) => setMinThreshold(e.target.value)}
                                        placeholder="e.g. 5"
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Supplier / Source
                                    </label>
                                    <input
                                        type="text"
                                        value={supplier}
                                        onChange={(e) => setSupplier(e.target.value)}
                                        placeholder="e.g. Unga Limited, Wakulima"
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Payment Method & Invoice */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    >
                                        <option value="cash">Cash (Register Drawer)</option>
                                        <option value="mpesa">M-Pesa Till / Paybill</option>
                                        <option value="bank">Bank Transfer</option>
                                        <option value="credit">Supplier Credit / Payable</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Invoice / Receipt #
                                    </label>
                                    <input
                                        type="text"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        placeholder="e.g. INV-9842"
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Received 2 sacks, good moisture content"
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-zinc-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingStock(null);
                                    }}
                                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs text-center"
                                >
                                    {isSubmitting ? "Saving..." : editingStock ? "Update Stock" : "Add to Store Inventory"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
