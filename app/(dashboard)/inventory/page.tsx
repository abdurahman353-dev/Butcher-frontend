"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Product, InventoryMovement, PaginatedResponse } from "@/types";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import {
  Boxes,
  PlusCircle,
  SlidersHorizontal,
  Trash2,
  Search,
  AlertTriangle,
  PackageX,
  DollarSign,
  ChevronDown,
  ArrowUpDown,
  X,
  Filter,
} from "lucide-react";

type SortKey = "name" | "current_stock" | "min_stock" | "price_per_kg" | "valuation";
type SortDir = "asc" | "desc";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"levels" | "movements">("levels");
  const [products, setProducts] = useState<Product[]>([]);
  const [movementsPaginated, setMovementsPaginated] = useState<PaginatedResponse<InventoryMovement>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [movTypeFilter, setMovTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchInventory = useCallback(async () => {
    try {
      const [prodsRes, movsRes] = await Promise.all([
        productsService.getProducts({ per_page: 500 }),
        inventoryService.getMovements({
          page: currentPage,
          per_page: 20,
          search,
          status: statusFilter,
        }),
      ]);
      setProducts(prodsRes.data);
      setMovementsPaginated(movsRes);
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_cached_products", JSON.stringify(prodsRes.data));
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_products");
      if (cached) setProducts(JSON.parse(cached));
    } catch {}

    fetchInventory();

    const intervalId = setInterval(fetchInventory, 10000);
    const handleDataChange = () => fetchInventory();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("butcher:data-change", handleDataChange);
    };
  }, [fetchInventory]);

  // Derive unique categories from products
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category_name).filter(Boolean)));
    return cats.sort();
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Text search — name or SKU
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    // Stock status filter
    if (statusFilter === "low_stock") list = list.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock);
    else if (statusFilter === "out_of_stock") list = list.filter((p) => p.current_stock <= 0);
    else if (statusFilter === "good") list = list.filter((p) => p.current_stock > p.min_stock);

    // Category filter
    if (categoryFilter !== "all") list = list.filter((p) => p.category_name === categoryFilter);

    // Sort
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "current_stock") { av = a.current_stock; bv = b.current_stock; }
      else if (sortKey === "min_stock") { av = a.min_stock; bv = b.min_stock; }
      else if (sortKey === "price_per_kg") { av = a.price_per_kg; bv = b.price_per_kg; }
      else if (sortKey === "valuation") {
        av = (a.current_stock || 0) * (a.buying_cost_per_kg || a.price_per_kg * 0.75);
        bv = (b.current_stock || 0) * (b.buying_cost_per_kg || b.price_per_kg * 0.75);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [products, search, statusFilter, categoryFilter, sortKey, sortDir]);

  // Real-time KPI calculations
  const kpis = useMemo(() => {
    const totalValue = products.reduce(
      (sum, p) => sum + (p.current_stock || 0) * (p.buying_cost_per_kg || p.price_per_kg * 0.75),
      0
    );
    const lowStock = products.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock).length;
    const outOfStock = products.filter((p) => p.current_stock <= 0).length;
    const goodStock = products.filter((p) => p.current_stock > p.min_stock).length;
    return { totalValue, lowStock, outOfStock, goodStock, total: products.length };
  }, [products]);

  // Filtered movements by type
  const filteredMovements = useMemo(() => {
    if (movTypeFilter === "all") return movementsPaginated.data;
    return movementsPaginated.data.filter((m) => m.type === movTypeFilter);
  }, [movementsPaginated.data, movTypeFilter]);

  // Active filter count for badge
  const activeFilterCount = [
    statusFilter !== "all",
    categoryFilter !== "all",
    search.trim() !== "",
  ].filter(Boolean).length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSortKey("name");
    setSortDir("asc");
  };

  const SortTh = ({
    label,
    col,
    className = "",
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) => (
    <th
      className={`py-3.5 px-3 cursor-pointer select-none hover:text-zinc-800 transition-colors ${className}`}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortKey === col ? "text-green-600" : "text-zinc-400"}`}
        />
      </span>
    </th>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Stock & Inventory Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Real-time meat weight levels, supplier stock-in replenishments, audit adjustments, and wastage.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/inventory/stock-in"
            className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Stock In</span>
          </Link>

          <Link
            href="/inventory/adjust"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Adjustment</span>
          </Link>

          <Link
            href="/inventory/wastage"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Log Wastage</span>
          </Link>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stock Value</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-zinc-900 tabular-nums tracking-tight mt-1">
            {formatCurrency(kpis.totalValue)}
          </div>
          <p className="text-[11px] text-green-700 font-semibold">Est. inventory valuation</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Meat Cuts</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-zinc-900 tabular-nums tracking-tight mt-1">
            {kpis.total}
          </div>
          <p className="text-[11px] text-zinc-500 font-medium">{kpis.goodStock} at good levels</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-xs flex flex-col gap-1 border ${kpis.lowStock > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Low Stock</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl font-bold tabular-nums tracking-tight mt-1 ${kpis.lowStock > 0 ? "text-amber-700" : "text-zinc-900"}`}>
            {kpis.lowStock}
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("low_stock")}
            className="text-[11px] text-amber-700 font-semibold text-left hover:underline"
          >
            {kpis.lowStock > 0 ? "View low stock cuts →" : "All well stocked"}
          </button>
        </div>

        <div className={`rounded-2xl p-4 shadow-xs flex flex-col gap-1 border ${kpis.outOfStock > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-zinc-200"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Out of Stock</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
              <PackageX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl font-bold tabular-nums tracking-tight mt-1 ${kpis.outOfStock > 0 ? "text-rose-700" : "text-zinc-900"}`}>
            {kpis.outOfStock}
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("out_of_stock")}
            className="text-[11px] text-rose-700 font-semibold text-left hover:underline"
          >
            {kpis.outOfStock > 0 ? "View out of stock →" : "All items in stock"}
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("levels")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "levels"
              ? "bg-green-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          🥩 Current Stock Levels ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "movements"
              ? "bg-green-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          📋 Stock Movement Audit Trail
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      {activeTab === "levels" ? (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Header / Toggle */}
          <div className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 transition-colors ${showFilters || activeFilterCount > 0 ? "border-b border-zinc-200" : ""}`}>
            <div
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2.5 cursor-pointer select-none group flex-1"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${showFilters || activeFilterCount > 0 ? "bg-green-500/10 border-green-600/20" : "bg-zinc-100 border-zinc-200"}`}>
                <Filter className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider group-hover:text-green-700 transition-colors">Filter Inventory</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white">{activeFilterCount} Active</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {showFilters ? "Click to collapse" : activeFilterCount > 0 ? `${activeFilterCount} filter(s) applied. Click to expand.` : "Filter by status, category, and sort order."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all active:scale-95"
                >
                  <X className="w-3 h-3" /> Reset ({activeFilterCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${showFilters ? "bg-zinc-900 text-white border-zinc-900" : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showFilters ? "Close" : "Open Filters"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Collapsible filter body */}
          {showFilters && (
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white border-b border-zinc-100">
              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3 text-zinc-400" /> Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, SKU, or category…"
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Stock Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="good">✅ Good Level</option>
                  <option value="low_stock">⚠️ Low Stock</option>
                  <option value="out_of_stock">🚫 Out of Stock</option>
                </select>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-zinc-400" /> Sort Records
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  >
                    <option value="name">Name (A–Z)</option>
                    <option value="current_stock">Stock Weight</option>
                    <option value="min_stock">Min Threshold</option>
                    <option value="price_per_kg">Price / KG</option>
                    <option value="valuation">Est. Valuation</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="h-10 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs shrink-0 transition-all active:scale-95"
                  >
                    {sortDir === "asc" ? "↑ ASC" : "↓ DESC"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active:</span>
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-medium">
                  🔍 &quot;{search}&quot;
                  <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-800 text-[11px] font-semibold">
                  📊 {statusFilter.replace("_", " ").toUpperCase()}
                  <button onClick={() => setStatusFilter("all")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                  🥩 {categoryFilter}
                  <button onClick={() => setCategoryFilter("all")}><X className="w-3 h-3" /></button>
                </span>
              )}
              <span className="text-[10px] text-zinc-400 ml-auto">{filteredProducts.length} of {products.length} items</span>
            </div>
          )}
        </div>
      ) : (
        /* Movements filter bar — also collapsible */
        <div className="bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center p-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movements by product name…"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <select
            value={movTypeFilter}
            onChange={(e) => setMovTypeFilter(e.target.value)}
            aria-label="Filter by movement type"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="all">All Movement Types</option>
            <option value="stock_in">📦 Stock In</option>
            <option value="sale">🛒 Sale</option>
            <option value="wastage">🗑️ Wastage</option>
            <option value="adjustment">⚖️ Adjustment</option>
          </select>
        </div>
      )}

      {/* TAB 1: Current Stock Levels Table */}
      {activeTab === "levels" ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <SortTh label="Product Cut" col="name" className="pl-4" />
                  <th className="py-3.5 px-3">SKU</th>
                  <th className="py-3.5 px-3">Category</th>
                  <SortTh label="Available Weight" col="current_stock" className="text-right" />
                  <SortTh label="Min Threshold" col="min_stock" className="text-right" />
                  <SortTh label="Cost / KG" col="price_per_kg" className="text-right" />
                  <SortTh label="Est. Valuation" col="valuation" className="text-right" />
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-zinc-400 text-sm">
                      No meat cuts match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOut = p.current_stock <= 0;
                    const isLow = !isOut && p.current_stock <= p.min_stock;
                    const stockStatus = isOut ? "out_of_stock" : isLow ? "low_stock" : "good";
                    const valuation =
                      (p.current_stock || 0) * (p.buying_cost_per_kg || p.price_per_kg * 0.75);

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 pl-4 font-semibold text-zinc-900">{p.name}</td>
                        <td className="py-3 px-3 font-mono text-zinc-500">{p.sku}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-semibold">
                            {p.category_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-sm">
                          <span className={isOut ? "text-rose-600" : isLow ? "text-amber-700" : "text-green-700"}>
                            {formatWeight(p.current_stock)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                          {formatWeight(p.min_stock)}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                          {p.buying_cost_per_kg ? formatCurrency(p.buying_cost_per_kg) : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-zinc-900 tabular-nums">
                          {formatCurrency(valuation)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={stockStatus} type="stock" />
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/inventory/stock-in?product_id=${p.id}`}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs active:scale-95"
                              title={`Add stock to ${p.name}`}
                            >
                              + Stock
                            </Link>
                            <Link
                              href={`/inventory/adjust?product_id=${p.id}`}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs active:scale-95"
                              title={`Adjust ${p.name}`}
                            >
                              Adjust
                            </Link>
                            <Link
                              href={`/inventory/wastage?product_id=${p.id}`}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs active:scale-95"
                              title={`Log wastage for ${p.name}`}
                            >
                              Waste
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: Stock Movements Audit Trail */
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="py-3.5 pl-4">Timestamp</th>
                  <th className="py-3.5 px-3">Cut Name</th>
                  <th className="py-3.5 px-3">Activity Type</th>
                  <th className="py-3.5 px-3 text-right">Quantity (KG)</th>
                  <th className="py-3.5 px-3 text-right">Before</th>
                  <th className="py-3.5 px-3 text-right">After</th>
                  <th className="py-3.5 px-3">User</th>
                  <th className="py-3.5 pr-4">Notes / Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 pl-4 text-zinc-500">{formatDateTime(m.created_at)}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-900">{m.product_name}</td>
                      <td className="py-3 px-3 uppercase font-semibold text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            m.type === "stock_in"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : m.type === "sale"
                              ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                              : m.type === "wastage"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {m.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums">
                        <span className={m.quantity >= 0 ? "text-green-700" : "text-rose-600"}>
                          {m.quantity > 0 ? `+${formatWeight(m.quantity)}` : formatWeight(m.quantity)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                        {formatWeight(m.previous_stock)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-zinc-900 tabular-nums">
                        {formatWeight(m.new_stock)}
                      </td>
                      <td className="py-3 px-3 text-zinc-700">{m.user_name}</td>
                      <td className="py-3 pr-4 text-zinc-500">{m.reason || m.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-zinc-50/60 border-t border-zinc-100">
            <Pagination
              currentPage={movementsPaginated.current_page}
              lastPage={movementsPaginated.last_page}
              total={movementsPaginated.total}
              from={movementsPaginated.from}
              to={movementsPaginated.to}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
