"use client";

import React, { useState } from "react";
import { RestaurantTable } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import {
  Users,
  Receipt,
  Plus,
  RefreshCw,
  Search,
  UtensilsCrossed,
} from "lucide-react";

interface TableMapViewProps {
  tables: RestaurantTable[];
  activeTableId?: number | null;
  onSelectTable: (table: RestaurantTable) => void;
  onRefresh: () => void;
  onOpenAddTableModal: () => void;
  isLoading?: boolean;
}

export function TableMapView({
  tables,
  activeTableId,
  onSelectTable,
  onRefresh,
  onOpenAddTableModal,
  isLoading = false,
}: TableMapViewProps) {
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const zones = Array.from(new Set(tables.map((t) => t.zone || "Main Floor")));

  const filteredTables = tables.filter((t) => {
    const matchesZone =
      selectedZone === "all" || (t.zone || "Main Floor") === selectedZone;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.table_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesZone && matchesSearch;
  });

  const emptyCount = tables.filter((t) => t.status === "grey").length;
  const unprintedCount = tables.filter((t) => t.status === "red").length;
  const printedCount = tables.filter((t) => t.status === "yellow").length;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200 shadow-2xs shrink-0">

        {/* Title row */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-zinc-900 tracking-tight">
              Floor Tables
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500">
              {isLoading ? (
                <span className="inline-block w-8 h-3 rounded bg-zinc-200 animate-pulse align-middle" />
              ) : (
                `${tables.length} Total`
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 active:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Floor"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Add Table — admin & cashier only */}
            {!isWaiter && (
              <button
                type="button"
                onClick={onOpenAddTableModal}
                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Table</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Legend pills */}
        <div className="px-4 pb-2.5 flex flex-wrap items-center gap-2">
          {isLoading ? (
            <>
              <div className="h-6 w-20 rounded-lg bg-zinc-100 border border-zinc-200 animate-pulse" />
              <div className="h-6 w-28 rounded-lg bg-rose-50/70 border border-rose-200/70 animate-pulse" />
              <div className="h-6 w-24 rounded-lg bg-amber-50/70 border border-amber-200/70 animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                Empty ({emptyCount})
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Unprinted Bill ({unprintedCount})
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Bill Printed ({printedCount})
              </div>
            </>
          )}
        </div>

        {/* Search + Zone filter */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          {/* Search input — matches checkout modal input style */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search table number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Zone pill tabs — matches checkout tab style */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 border border-zinc-200 rounded-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedZone("all")}
              className={`px-3 py-1 text-[11px] rounded-lg font-bold whitespace-nowrap transition-all ${
                selectedZone === "all"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              All Zones
            </button>
            {zones.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1 text-[11px] rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedZone === zone
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table Grid ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between p-3.5 rounded-2xl border-2 border-zinc-200/80 bg-white min-h-[140px] shadow-xs animate-pulse"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="h-7 w-10 rounded-lg bg-zinc-200" />
                    <div className="h-4 w-14 rounded-md bg-zinc-100" />
                  </div>
                  <div className="h-3.5 w-24 rounded bg-zinc-200/80 mb-2" />
                  <div className="h-3 w-20 rounded bg-zinc-100" />
                </div>
                <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between">
                  <div className="h-3 w-12 rounded bg-zinc-100" />
                  <div className="h-3 w-10 rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
              <UtensilsCrossed className="w-6 h-6 text-zinc-300" />
            </div>
            <p className="text-sm font-bold text-zinc-600">
              {tables.length === 0 ? "No tables configured yet" : "No tables match your filter"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {tables.length === 0
                ? "Click \"+ Add Table\" above to set up your floor tables."
                : "Try selecting all zones or clear your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredTables.map((table) => {
              const isSelected = activeTableId === table.id;

              // Colour scheme per status
              let cardClasses =
                "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:shadow-md";
              let badgeClasses = "bg-zinc-100 border border-zinc-200 text-zinc-500";
              let badgeText = "AVAILABLE";
              let numberColor = "text-zinc-800";
              let bottomBorder = "border-zinc-100";

              if (table.status === "red") {
                cardClasses =
                  "bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100/80 hover:shadow-md";
                badgeClasses = "bg-rose-600 border-rose-600 text-white";
                badgeText = "ACTIVE";
                numberColor = "text-rose-800";
                bottomBorder = "border-rose-200/70";
              } else if (table.status === "yellow") {
                cardClasses =
                  "bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/80 hover:shadow-md";
                badgeClasses = "bg-amber-400 border-amber-400 text-amber-950";
                badgeText = "BILLED";
                numberColor = "text-amber-800";
                bottomBorder = "border-amber-200/70";
              }

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => onSelectTable(table)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.97] cursor-pointer min-h-[140px] shadow-sm ${cardClasses} ${
                    isSelected
                      ? "ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-100 shadow-md scale-[1.02]"
                      : ""
                  }`}
                >
                  {/* ─ Top section ─ */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      {/* Big table number */}
                      <span className={`font-mono text-2xl font-black leading-none tracking-tight ${numberColor}`}>
                        {table.table_number}
                      </span>
                      {/* Status badge */}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-widest shrink-0 border ${badgeClasses}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    {/* Table name */}
                    <p className="text-xs font-bold text-zinc-900 line-clamp-1 leading-snug">
                      {table.name}
                    </p>

                    {/* Zone & optional Capacity */}
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                      {table.capacity ? (
                        <>
                          <Users className="w-3 h-3 shrink-0" />
                          <span>Cap: {table.capacity}</span>
                          <span className="text-zinc-300">•</span>
                        </>
                      ) : null}
                      <span className="truncate">{table.zone || "Main Floor"}</span>
                    </div>
                  </div>

                  {/* ─ Bottom section ─ */}
                  <div className={`pt-2 mt-2 border-t ${bottomBorder} flex items-end justify-between gap-1`}>
                    {table.active_bills_count > 0 ? (
                      <>
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                            <Receipt className="w-3 h-3" />
                            {table.active_bills_count}{" "}
                            {table.active_bills_count === 1 ? "Bill" : "Bills"}
                          </div>
                          <div className="text-xs font-black text-emerald-700 mt-0.5">
                            {formatCurrency(table.total_active_amount)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-700 transition-colors">
                          View →
                        </span>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-[11px] font-medium text-zinc-400">Empty</span>
                        <span className="text-[10px] font-bold text-zinc-400 group-hover:text-emerald-600 transition-colors">
                          + Open
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
