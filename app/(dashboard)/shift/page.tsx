"use client";

import React, { useState } from "react";
import { useShift } from "@/hooks/useShift";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { roundTo } from "@/lib/math";
import {
  Clock,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";

export default function ShiftPage() {
  const { shift, isShiftOpen, openShift, closeShift } = useShift();

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState<string>("5000");
  const [openNotes, setOpenNotes] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  // Close Shift Form State
  const [countedCash, setCountedCash] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closedSummary, setClosedSummary] = useState<any>(null);

  const numCounted = parseFloat(countedCash) || 0;
  const expectedCash = shift ? shift.opening_cash + shift.cash_sales : 0;
  const discrepancy = countedCash !== "" ? roundTo(numCounted - expectedCash, 2) : 0;

  const handleOpenShift = async () => {
    const floatNum = parseFloat(openingFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      alert("Please enter a valid opening float.");
      return;
    }
    setIsOpening(true);
    try {
      await openShift(floatNum, openNotes);
    } catch (e: any) {
      alert(e.message || "Failed to open shift.");
    } finally {
      setIsOpening(false);
    }
  };

  const handleCloseShift = async () => {
    if (countedCash === "") {
      alert("Please enter the counted cash in the drawer.");
      return;
    }
    setIsClosing(true);
    try {
      const closed = await closeShift(numCounted, closeNotes);
      setClosedSummary(closed);
    } catch (e: any) {
      alert(e.message || "Failed to close shift.");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Cashier Shift & Drawer Balancing
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Open shifts with cash float, monitor live till sales, and balance drawer cash at close.
        </p>
      </div>

      {/* Closed Summary Banner if recently closed */}
      {closedSummary && (
        <div className="p-5 bg-green-50 border border-green-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>Shift #{closedSummary.id} Successfully Closed & Reconciled</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-600">
            <div>
              <span className="text-zinc-500 block">Total Sales:</span>
              <strong className="text-zinc-900">{formatCurrency(closedSummary.total_sales)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block">Expected Cash:</span>
              <strong className="text-zinc-900">{formatCurrency(closedSummary.expected_cash)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block">Counted Cash:</span>
              <strong className="text-zinc-900">{formatCurrency(closedSummary.counted_cash)}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block">Variance:</span>
              <strong
                className={
                  closedSummary.difference === 0
                    ? "text-green-700 font-bold"
                    : closedSummary.difference > 0
                    ? "text-blue-700 font-bold"
                    : "text-rose-600 font-bold"
                }
              >
                {formatCurrency(closedSummary.difference)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Shift View: Either Open Active Shift or Open Shift Form */}
      {isShiftOpen && shift ? (
        <div className="space-y-6">
          {/* Active Shift Dashboard Card */}
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                  ● ACTIVE SHIFT #{shift.id}
                </span>
                <h2 className="text-lg font-bold text-zinc-900 mt-1.5">
                  Cashier: {shift.cashier_name}
                </h2>
                <p className="text-xs text-zinc-500">
                  Opened at {formatDateTime(shift.opened_at)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-zinc-500">Opening Cash Float</span>
                <p className="text-base font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(shift.opening_cash)}
                </p>
              </div>
            </div>

            {/* Live Drawer Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cash Sales */}
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500 text-xs">
                  <span>Cash Sales</span>
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-xl font-bold text-green-700 tabular-nums">
                  {formatCurrency(shift.cash_sales)}
                </div>
                <p className="text-[10px] text-zinc-400">Collected in till</p>
              </div>

              {/* M-Pesa Sales */}
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500 text-xs">
                  <span>M-Pesa Sales</span>
                  <Smartphone className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-xl font-bold text-green-700 tabular-nums">
                  {formatCurrency(shift.mpesa_sales)}
                </div>
                <p className="text-[10px] text-zinc-400">Direct till paybill</p>
              </div>

              {/* Card Sales */}
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-zinc-500 text-xs">
                  <span>Card Sales</span>
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-700 tabular-nums">
                  {formatCurrency(shift.card_sales)}
                </div>
                <p className="text-[10px] text-zinc-400">POS Card Machine</p>
              </div>
            </div>

            {/* Total Sales Summary Banner */}
            <div className="p-4 bg-green-50/50 border border-green-200 rounded-xl flex items-baseline justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-green-800 tracking-wider">
                  Total Shift Revenue
                </span>
                <p className="text-xs text-zinc-500">Combined cash, M-Pesa, and card transactions</p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums">
                {formatCurrency(shift.total_sales)}
              </div>
            </div>
          </div>

          {/* Close Shift & Drawer Reconciliation Card */}
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-base pb-3 border-b border-zinc-100">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Close Shift & Count Cash</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1">
                <span className="text-xs font-semibold uppercase text-zinc-500">
                  Expected Cash in Drawer
                </span>
                <div className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {formatCurrency(expectedCash)}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Float ({formatCurrency(shift.opening_cash)}) + Cash Sales ({formatCurrency(shift.cash_sales)})
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-zinc-700">
                  Counted Physical Cash in Drawer (KSh) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="e.g. 40500"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Live Variance Calculation */}
            {countedCash !== "" && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  discrepancy === 0
                    ? "bg-green-50 border-green-200 text-green-800"
                    : discrepancy > 0
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <span>
                  Drawer Balance:{" "}
                  {discrepancy === 0 ? "Perfect Match (Balanced)" : discrepancy > 0 ? "Over / Surplus" : "Shortage"}
                </span>
                <span className="text-base font-bold tabular-nums">
                  {discrepancy >= 0 ? `+${formatCurrency(discrepancy)}` : formatCurrency(discrepancy)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">
                Closing Notes / Audit Comments (Optional)
              </label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Verified with store manager, float handed over..."
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <button
              type="button"
              disabled={isClosing || countedCash === ""}
              onClick={handleCloseShift}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
            >
              <Lock className="w-4 h-4" />
              <span>{isClosing ? "Closing Shift..." : "Close Shift & Generate Summary"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Open Shift Form */
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-base pb-3 border-b border-zinc-100">
            <Unlock className="w-5 h-5 text-green-600" />
            <span>Open Cashier Shift</span>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            Enter the starting float in the cash drawer before processing customer meat orders.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1">
              Opening Cash Float (KSh) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              placeholder="5000"
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xl font-bold text-green-700 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {[2000, 3000, 5000, 10000].map((fl) => (
              <button
                key={fl}
                type="button"
                onClick={() => setOpeningFloat(fl.toString())}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 shadow-2xs"
              >
                {formatCurrency(fl)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">
              Shift Notes (Optional)
            </label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="e.g. Morning shift, float checked"
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <button
            type="button"
            disabled={isOpening}
            onClick={handleOpenShift}
            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
          >
            <Unlock className="w-4 h-4" />
            <span>{isOpening ? "Opening Shift..." : "Open Shift & Begin Selling"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
