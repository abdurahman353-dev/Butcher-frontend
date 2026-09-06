"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { salesService } from "@/services/sales.service";
import { Sale, PaginatedResponse } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { usePolling } from "@/hooks/usePolling";
import { Search, Eye, Printer, Receipt } from "lucide-react";

export default function SalesPage() {
  const [paginated, setPaginated] = useState<PaginatedResponse<Sale>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_sales");
      if (cached) setPaginated(JSON.parse(cached));
    } catch {}
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const res = await salesService.getSales({
        page: currentPage,
        per_page: perPage,
        search,
        payment_method: paymentFilter,
        status: statusFilter,
      });
      setPaginated(res);
      if (typeof window !== "undefined" && currentPage === 1 && search === "" && paymentFilter === "all" && statusFilter === "all") {
        localStorage.setItem("butcher_cached_sales", JSON.stringify(res));
      }
    } catch (e) {
      console.error("Failed to load sales:", e);
    }
  }, [currentPage, perPage, search, paymentFilter, statusFilter]);

  // Real-time polling every 10s
  usePolling(fetchSales, 10000);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Sales History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Browse and filter all POS butcher transactions, receipts, and returns.
          </p>
        </div>

        <Link
          href="/pos"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs self-start sm:self-auto active:scale-95"
        >
          + New Sale
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search sale #, customer name, or cashier..."
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by payment method"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by sale status"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 pl-4">Sale #</th>
                <th className="py-3.5 px-3">Date & Time</th>
                <th className="py-3.5 px-3">Cashier</th>
                <th className="py-3.5 px-3">Customer</th>
                <th className="py-3.5 px-3">Payment</th>
                <th className="py-3.5 px-3 text-right">Items</th>
                <th className="py-3.5 px-3 text-right">Total Amount</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No sales found matching the current filters.
                  </td>
                </tr>
              ) : (
                paginated.data.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 pl-4 font-mono font-semibold text-zinc-900">
                      <Link href={`/sales/${sale.id}`} className="hover:text-green-700 hover:underline">
                        {sale.sale_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-zinc-500">{formatDateTime(sale.created_at)}</td>
                    <td className="py-3 px-3 text-zinc-800 font-medium">{sale.cashier_name}</td>
                    <td className="py-3 px-3 text-zinc-600">{sale.customer_name || "Walk-in"}</td>
                    <td className="py-3 px-3 uppercase font-semibold text-zinc-700 text-[11px]">
                      {sale.payment_method}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                      {sale.items.length} {sale.items.length === 1 ? "cut" : "cuts"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-green-700 tabular-nums text-sm">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={sale.sale_status} type="sale" />
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors shadow-2xs"
                          title="View sale details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setViewingReceiptSale(sale)}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-green-700 transition-colors shadow-2xs"
                          title="Print receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="p-3 bg-zinc-50/60 border-t border-zinc-100">
          <Pagination
            currentPage={paginated.current_page}
            lastPage={paginated.last_page}
            total={paginated.total}
            from={paginated.from}
            to={paginated.to}
            perPage={perPage}
            onPageChange={(page) => setCurrentPage(page)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingReceiptSale}
        sale={viewingReceiptSale}
        onClose={() => setViewingReceiptSale(null)}
      />
    </div>
  );
}
