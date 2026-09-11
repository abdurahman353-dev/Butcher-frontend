"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/services/api";
import { Sale } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import {
  AlertTriangle,
  X,
  LogOut,
  Clock,
  User,
  Receipt,
  CheckCircle2,
  Loader2,
  ExternalLink,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  isLoggingOut?: boolean;
}

type FetchState = "loading" | "ok" | "error";

export function EndShiftModal({
  isOpen,
  onClose,
  onConfirmLogout,
  isLoggingOut = false,
}: EndShiftModalProps) {
  const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [fetchKey, setFetchKey] = useState(0); // increment to retry

  // Typed-confirmation state — user must type "SIGN OUT" to proceed when pending orders exist
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      // Reset on close so next open starts fresh
      setConfirmText("");
      setPendingOrders([]);
      setTotalOwed(0);
      setFetchState("loading");
      return;
    }

    setFetchState("loading");
    setConfirmText("");

    // Call the API directly so we bypass any PaginationParams type restrictions
    apiClient
      .get<{ data: Sale[] }>("/sales", {
        params: {
          payment_status: "pending",
          per_page: 100,
          sort_by: "created_at",
          sort_direction: "desc",
        },
      })
      .then((res) => {
        const all: Sale[] = Array.isArray(res.data)
          ? (res.data as unknown as Sale[])
          : res.data?.data ?? [];

        const unpaid = all.filter(
          (s) =>
            s.payment_status === "pending" &&
            s.sale_status !== "refunded" &&
            s.sale_status !== "cancelled"
        );
        setPendingOrders(unpaid);
        setTotalOwed(unpaid.reduce((sum, s) => sum + Number(s.total || 0), 0));
        setFetchState("ok");
      })
      .catch(() => {
        // NEVER show "All Clear" on error — show an error state instead
        // so a network failure cannot mask unpaid orders
        setFetchState("error");
      });
  }, [isOpen, fetchKey]);

  if (!isOpen) return null;

  const hasPending = fetchState === "ok" && pendingOrders.length > 0;
  const isConfirmed = confirmText.trim().toUpperCase() === "SIGN OUT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div
          className={`px-5 pt-5 pb-4 border-b ${
            fetchState === "error"
              ? "border-red-200 bg-red-50"
              : hasPending
              ? "border-amber-200 bg-amber-50"
              : "border-zinc-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  fetchState === "error"
                    ? "bg-red-100 text-red-600"
                    : hasPending
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {fetchState === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : fetchState === "error" ? (
                  <WifiOff className="w-5 h-5" />
                ) : hasPending ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900">
                  {fetchState === "loading"
                    ? "Checking Shift Status..."
                    : fetchState === "error"
                    ? "⚠️ Cannot Verify Orders"
                    : hasPending
                    ? "⚠️ Unpaid Orders Detected"
                    : "End of Shift — All Clear"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {fetchState === "loading"
                    ? "Fetching your pending Pay Later orders..."
                    : fetchState === "error"
                    ? "Could not check for pending orders. Do NOT sign out until verified."
                    : hasPending
                    ? "You have Pay Later orders that haven't been collected yet"
                    : "No outstanding Pay Later orders. Safe to sign out."}
                </p>
              </div>
            </div>
            {fetchState !== "loading" && (
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 mt-0.5 shrink-0">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-3">
          {fetchState === "loading" && (
            <div className="flex items-center justify-center py-10 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Checking pending orders...</span>
            </div>
          )}

          {fetchState === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
              <WifiOff className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm font-bold text-red-800">Network Error</p>
              <p className="text-xs text-red-600">
                Could not reach the server to verify pending orders. Please check your connection and try again — or ask
                your manager to verify before signing out.
              </p>
              <button
                onClick={() => { setFetchState("loading"); setFetchKey((k) => k + 1); }}
                className="mt-2 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
              >
                Retry Check
              </button>
            </div>
          )}

          {fetchState === "ok" && hasPending && (
            <>
              {/* Summary banner */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wide">
                    Total Outstanding
                  </p>
                  <p className="text-xl font-black text-amber-900 tabular-nums">
                    {formatCurrency(totalOwed)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wide">
                    Unpaid Orders
                  </p>
                  <p className="text-xl font-black text-amber-900">{pendingOrders.length}</p>
                </div>
              </div>

              {/* Order list */}
              <div className="space-y-2">
                {pendingOrders.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-3 py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {sale.customer_name || "Walk-in Customer"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <Receipt className="w-3 h-3 shrink-0" />
                          <span className="font-mono">{sale.sale_number}</span>
                          <span>·</span>
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{formatDateTime(sale.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-amber-700 tabular-nums">
                        {formatCurrency(sale.total)}
                      </p>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">
                        Pay Later
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Settle now link */}
              <Link
                href="/sales?payment_method=credit&payment_status=pending"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                <Receipt className="w-4 h-4" />
                Settle Pending Orders Now
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </Link>

              {/* Typed confirmation gate */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  To sign out anyway, type <span className="font-mono bg-red-100 px-1 py-0.5 rounded">SIGN OUT</span> below:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type SIGN OUT to confirm..."
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                />
                <p className="text-[10px] text-red-600">
                  ⚠️ Signing out with unpaid orders means these amounts will be recorded as outstanding debts.
                </p>
              </div>
            </>
          )}

          {fetchState === "ok" && !hasPending && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3 border border-green-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-zinc-900">All Clear!</p>
              <p className="text-xs text-zinc-500 mt-1">
                No outstanding Pay Later orders. Your shift is fully reconciled.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex gap-2.5">
          {fetchState !== "loading" && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all"
            >
              {hasPending ? "Go Back & Settle" : "Cancel"}
            </button>
          )}

          {/* Sign out button — locked behind confirmation when pending orders exist */}
          {fetchState === "ok" && (
            <button
              type="button"
              onClick={onConfirmLogout}
              disabled={isLoggingOut || (hasPending && !isConfirmed)}
              title={hasPending && !isConfirmed ? "Type SIGN OUT above to confirm" : ""}
              className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 
                ${
                  hasPending && !isConfirmed
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white"
                } disabled:opacity-70`}
            >
              {isLoggingOut ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing out...</span></>
              ) : (
                <><LogOut className="w-4 h-4" /><span>{hasPending ? "Sign Out Anyway" : "Sign Out"}</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
