"use client";

import React, { useState } from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import {
  X,
  Clock,
  User,
  Hash,
  ChevronRight,
  ChevronDown,
  Search,
  AlertCircle,
  ShoppingBag,
  Tag,
} from "lucide-react";

interface UnpaidOrdersPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  unpaidSales: Sale[];
  onSelectSale: (sale: Sale) => void;
}

function formatDate(dt: string) {
  try {
    return new Date(dt).toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dt;
  }
}

export function UnpaidOrdersPickerModal({
  isOpen,
  onClose,
  unpaidSales,
  onSelectSale,
}: UnpaidOrdersPickerModalProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const filtered = unpaidSales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.sale_number?.toLowerCase().includes(q) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white border border-zinc-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh]">

        {/* Drag pill */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-zinc-300 sm:hidden" />

        {/* HEADER */}
        <div className="px-4 pt-7 pb-4 sm:pt-4 sm:px-5 sm:py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-amber-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shadow-sm shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">Collect Payment</h2>
              <p className="text-[11px] text-amber-700 font-semibold leading-tight mt-0.5">
                {unpaidSales.length} Pay Later Bill{unpaidSales.length !== 1 ? "s" : ""} — Select one to collect
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-white/60 rounded-lg -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-error tip */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-start gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-blue-700 font-medium leading-snug">
            Tap <strong>▼ View Items</strong> to see what was ordered before collecting — prevents selecting the wrong bill.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by bill no. or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-zinc-400 font-medium text-zinc-800"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bill List — fixed height shows first 2 bills, scroll for more */}
        <div
          className="overflow-y-scroll p-3 space-y-2.5 shrink-0"
          style={{ height: "290px" }}
        >
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-zinc-300" />
              <span>No matching bills found.</span>
            </div>
          ) : (
            filtered.map((sale) => {
              const isExpanded = expandedId === sale.id;
              const itemCount = sale.items?.length ?? 0;

              return (
                <div
                  key={sale.id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                    isExpanded ? "border-amber-400 shadow-md" : "border-zinc-200"
                  }`}
                >
                  {/* ── BILL SUMMARY ROW ── */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5 flex-1">
                      {/* Bill number + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Hash className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-black text-zinc-900 text-sm tracking-wide">{sale.sale_number}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold uppercase">Unpaid</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-2.5 h-2.5" />
                          {itemCount} cut{itemCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-sm font-semibold text-zinc-700 truncate">
                          {sale.customer_name || "Walk-in Customer"}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs text-zinc-400">{formatDate(sale.created_at)}</span>
                      </div>

                      {/* View items toggle */}
                      {itemCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold mt-1 transition-colors ${
                            isExpanded ? "text-amber-600" : "text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          {isExpanded ? "Hide Items" : `▼ View Items (${itemCount})`}
                        </button>
                      )}
                    </div>

                    {/* Amount + Collect button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xl font-black text-amber-700 tabular-nums">{formatCurrency(Number(sale.total))}</div>
                        <div className="text-[10px] text-zinc-400 font-medium">Outstanding</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSale(sale);
                          onClose();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl border border-amber-600 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        Collect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── EXPANDABLE ITEMS PREVIEW ── */}
                  {isExpanded && itemCount > 0 && (
                    <div className="border-t border-amber-100 bg-amber-50/40 px-4 py-3 space-y-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Order Contents:</p>
                      {sale.items.map((item, idx) => (
                        <div key={item.id ?? idx} className="flex items-center justify-between gap-2 py-1.5 border-b border-amber-100/60 last:border-0">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-zinc-900 truncate">{item.product_name}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span>{formatWeight(Number(item.weight))}</span>
                              <span className="text-zinc-300">•</span>
                              <span>{formatCurrency(Number(item.price_per_kg))}/kg</span>
                              {item.discount && Number(item.discount) > 0 && (
                                <>
                                  <span className="text-zinc-300">•</span>
                                  <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                                    <Tag className="w-3 h-3" />
                                    -{formatCurrency(Number(item.discount))}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-zinc-900 tabular-nums shrink-0">
                            {formatCurrency(Number(item.subtotal))}
                          </span>
                        </div>
                      ))}

                      {/* Totals row */}
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-wide">Total Due</span>
                        <span className="text-base font-black text-amber-700 tabular-nums">{formatCurrency(Number(sale.total))}</span>
                      </div>

                      {/* Notes if any */}
                      {sale.notes && (
                        <div className="text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 mt-1">
                          <span className="font-semibold text-zinc-700">Note: </span>{sale.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/80 shrink-0">
          <p className="text-xs text-zinc-400 text-center">
            Always verify order items before collecting payment
          </p>
        </div>
      </div>
    </div>
  );
}
