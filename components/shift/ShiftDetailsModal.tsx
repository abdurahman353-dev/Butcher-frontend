"use client";

import React from "react";
import { Shift } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Printer, X, Clock, Banknote, Smartphone, CreditCard, ShieldCheck } from "lucide-react";

interface ShiftDetailsModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftDetailsModal({ shift, isOpen, onClose }: ShiftDetailsModalProps) {
  if (!isOpen || !shift) return null;

  const handlePrint = () => {
    window.print();
  };

  const getDuration = (openedAt: string, closedAt?: string | null) => {
    const start = new Date(openedAt).getTime();
    const end = closedAt ? new Date(closedAt).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end < start) return "—";

    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    if (hours === 0) return `${mins} mins`;
    return `${hours}h ${mins}m`;
  };

  const isClosed = shift.status === "closed";
  const discrepancy = shift.difference ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs print:hidden" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white text-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 border border-zinc-200 max-h-[92vh] flex flex-col print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Shift #{shift.id} Z-Report</h3>
              <p className="text-[11px] text-zinc-500">Till Audit & Reconciliation Slip</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt / Slip Body */}
        <div className="p-4 sm:p-6 text-xs leading-relaxed space-y-4 overflow-y-auto font-mono text-zinc-900 flex-1 print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300">
            <div className="text-base sm:text-lg font-bold tracking-tight">🥩 PRIME CUT BUTCHERY</div>
            <p className="text-[11px] text-zinc-600">REGISTER SHIFT AUDIT / Z-REPORT</p>
            <p className="text-[10px] text-zinc-500">Argwings Kodhek Rd, Kilimani, Nairobi</p>
            <p className="text-[10px] text-zinc-500">Tel: +254 712 345 678 • PIN: P051283749Z</p>
          </div>

          {/* Shift Metadata */}
          <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">SHIFT NUMBER:</span>
              <span className="font-bold text-zinc-900">#{shift.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">STATUS:</span>
              <span
                className={`font-bold uppercase ${
                  shift.status === "open" ? "text-green-600" : "text-zinc-700"
                }`}
              >
                {shift.status === "open" ? "● OPEN / ACTIVE" : "CLOSED & RECONCILED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">CASHIER:</span>
              <span className="font-semibold text-zinc-900">{shift.cashier_name || `User #${shift.cashier_id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">OPENED AT:</span>
              <span className="text-zinc-800">{formatDateTime(shift.opened_at)}</span>
            </div>
            {shift.closed_at && (
              <div className="flex justify-between">
                <span className="text-zinc-500">CLOSED AT:</span>
                <span className="text-zinc-800">{formatDateTime(shift.closed_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">DURATION:</span>
              <span className="font-semibold text-zinc-800">{getDuration(shift.opened_at, shift.closed_at)}</span>
            </div>
          </div>

          {/* Starting Float */}
          <div className="pb-3 border-b border-dashed border-zinc-300">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-700">OPENING CASH FLOAT:</span>
              <span className="font-bold text-zinc-900 text-sm tabular-nums">
                {formatCurrency(shift.opening_cash)}
              </span>
            </div>
          </div>

          {/* Sales by Tender */}
          <div className="space-y-2 pb-3 border-b border-dashed border-zinc-300">
            <div className="text-[11px] font-bold uppercase text-zinc-500">SALES BY TENDER METHOD</div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <Banknote className="w-3.5 h-3.5 text-green-600 print:hidden" />
                <span>Cash Sales:</span>
              </span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(shift.cash_sales)}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <Smartphone className="w-3.5 h-3.5 text-green-600 print:hidden" />
                <span>M-Pesa Sales:</span>
              </span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(shift.mpesa_sales)}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <CreditCard className="w-3.5 h-3.5 text-blue-600 print:hidden" />
                <span>Card Sales:</span>
              </span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(shift.card_sales)}
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs items-center">
              <span className="font-bold text-zinc-900">TOTAL SHIFT REVENUE:</span>
              <span className="font-bold text-base text-zinc-900 tabular-nums">
                {formatCurrency(shift.total_sales)}
              </span>
            </div>
          </div>

          {/* Drawer Reconciliation (For Closed or Current) */}
          <div className="space-y-2 pb-3 border-b border-dashed border-zinc-300">
            <div className="text-[11px] font-bold uppercase text-zinc-500">DRAWER CASH RECONCILIATION</div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">Expected Cash (Float + Cash):</span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(shift.expected_cash)}
              </span>
            </div>
            {isClosed ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">Counted Physical Cash:</span>
                  <span className="font-bold text-zinc-900 tabular-nums">
                    {formatCurrency(shift.counted_cash ?? 0)}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center ${
                    discrepancy === 0
                      ? "bg-green-50 border-green-200 text-green-800"
                      : discrepancy > 0
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <span>
                    DRAWER VARIANCE:{" "}
                    {discrepancy === 0 ? "BALANCED" : discrepancy > 0 ? "OVERAGE (+)" : "SHORTAGE (-)"}
                  </span>
                  <span className="text-sm tabular-nums">
                    {discrepancy >= 0 ? `+${formatCurrency(discrepancy)}` : formatCurrency(discrepancy)}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ● Shift is currently active. Physical cash count pending drawer close.
              </div>
            )}
          </div>

          {/* Notes / Comments */}
          {shift.notes && (
            <div className="space-y-1 pb-3 border-b border-dashed border-zinc-300 text-[11px]">
              <span className="text-zinc-500 font-bold uppercase block">AUDIT COMMENTS:</span>
              <p className="text-zinc-800 italic bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                "{shift.notes}"
              </p>
            </div>
          )}

          {/* Sign-off footer */}
          <div className="text-center pt-2 space-y-2 text-[10px] text-zinc-500">
            <div className="flex justify-around pt-6 text-[10px]">
              <div className="border-t border-zinc-400 px-4 pt-1">Cashier Signature</div>
              <div className="border-t border-zinc-400 px-4 pt-1">Supervisor Signature</div>
            </div>
            <p className="pt-2 text-[9px] text-zinc-400">Generated by Prime Cut POS System</p>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden when printing) */}
        <div className="p-3 sm:p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl shadow-2xs transition-colors text-center"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Z-Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
