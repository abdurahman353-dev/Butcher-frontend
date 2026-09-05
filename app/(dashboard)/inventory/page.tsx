"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchInventory = useCallback(async () => {
    try {
      const [prodsRes, movsRes] = await Promise.all([
        productsService.getProducts({ per_page: 100 }),
        inventoryService.getMovements({
          page: currentPage,
          per_page: 20,
          search,
          status: statusFilter,
        }),
      ]);
      setProducts(prodsRes.data);
      setMovementsPaginated(movsRes);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchInventory();

    const handleDataChange = () => fetchInventory();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => window.removeEventListener("butcher:data-change", handleDataChange);
  }, [fetchInventory]);

  const filteredProducts = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter === "low_stock") return p.current_stock <= p.min_stock;
    if (statusFilter === "out_of_stock") return p.current_stock <= 0;
    if (statusFilter === "good") return p.current_stock > p.min_stock;
    return true;
  });

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

        {/* 3 Quick Action Shortcuts */}
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
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
            <span>Adjustment</span>
          </Link>

          <Link
            href="/inventory/wastage"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Log Wastage</span>
          </Link>
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

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cut name or SKU..."
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter inventory by stock status"
          className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
        >
          <option value="all">All Inventory</option>
          <option value="good">Good Stock Level</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* TAB 1: Current Stock Levels Table */}
      {activeTab === "levels" ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="py-3.5 pl-4">Product Cut</th>
                  <th className="py-3.5 px-3">SKU</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3 text-right">Available Weight</th>
                  <th className="py-3.5 px-3 text-right">Min Threshold</th>
                  <th className="py-3.5 px-3 text-right">Buying Cost / KG</th>
                  <th className="py-3.5 px-3 text-right">Est. Valuation</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProducts.map((p) => {
                  const isOut = p.current_stock <= 0;
                  const isLow = !isOut && p.current_stock <= p.min_stock;
                  const stockStatus = isOut ? "out_of_stock" : isLow ? "low_stock" : "good";
                  const valuation = p.current_stock * (p.buying_cost_per_kg || p.price_per_kg * 0.75);

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 pl-4 font-semibold text-zinc-900">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-zinc-500">{p.sku}</td>
                      <td className="py-3 px-3 text-zinc-700">{p.category_name}</td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-sm">
                        <span
                          className={
                            isOut ? "text-rose-600" : isLow ? "text-amber-700" : "text-green-700"
                          }
                        >
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
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/inventory/stock-in?product_id=${p.id}`}
                            className="px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[10px] font-semibold"
                          >
                            + Stock
                          </Link>
                          <Link
                            href={`/inventory/adjust?product_id=${p.id}`}
                            className="px-2 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-[10px] font-semibold shadow-2xs"
                          >
                            Adjust
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {movementsPaginated.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movementsPaginated.data.map((m) => (
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
