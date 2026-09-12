"use client";

import React from "react";
import { Shift } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Printer, X, Clock, Banknote, Smartphone, CreditCard, ShieldCheck } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { printElementInWindow } from "@/lib/printWindow";

interface ShiftDetailsModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftDetailsModal({ shift, isOpen, onClose }: ShiftDetailsModalProps) {
  const { settings } = useShopSettings();
  if (!isOpen || !shift) return null;

  const handlePrint = () => {
    printElementInWindow("shift-slip", `Shift #${shift?.id ?? ""} Z-Report`);
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
        <div id="shift-slip" className="p-4 sm:p-6 text-xs leading-relaxed space-y-4 overflow-y-auto font-mono text-black font-bold flex-1 print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-black">
            <div className="text-base sm:text-lg font-black tracking-tight text-black">🥩 {settings.shop_name ? settings.shop_name.toUpperCase() : "BUTCHERY POS"}</div>
            <p className="text-xs font-black tracking-wider text-black">REGISTER SHIFT AUDIT / Z-REPORT</p>
            {settings.address && <p className="text-xs font-bold text-black leading-snug">{settings.address}</p>}
            {(settings.phone || settings.email || settings.tax_pin) && (
              <div className="text-[11px] font-bold text-black space-y-0.5">
                {settings.phone && <p>Tel: {settings.phone}</p>}
                {settings.email && <p>Email: {settings.email}</p>}
                {settings.tax_pin && <p>PIN: {settings.tax_pin}</p>}
              </div>
            )}
            {settings.receipt_header && (
              <p className="text-xs font-black text-black pt-1 whitespace-pre-line border-t-2 border-dashed border-black mt-1">
                {settings.receipt_header}
              </p>
            )}
          </div>

          {/* Shift Metadata */}
          <div className="space-y-1.5 pb-3 border-b-2 border-dashed border-black text-xs text-black">
            <div className="flex justify-between">
              <span className="font-bold text-black">SHIFT NUMBER:</span>
              <span className="font-black text-black">#{shift.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-black">STATUS:</span>
              <span className="font-black uppercase text-black">
                {shift.status === "open" ? "● OPEN / ACTIVE" : "CLOSED & RECONCILED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-black">CASHIER:</span>
              <span className="font-black text-black">{shift.cashier_name || `User #${shift.cashier_id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-black">OPENED AT:</span>
              <span className="font-black text-black">{formatDateTime(shift.opened_at)}</span>
            </div>
            {shift.closed_at && (
              <div className="flex justify-between">
                <span className="font-bold text-black">CLOSED AT:</span>
                <span className="font-black text-black">{formatDateTime(shift.closed_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-bold text-black">DURATION:</span>
              <span className="font-black text-black">{getDuration(shift.opened_at, shift.closed_at)}</span>
            </div>
          </div>

          {/* Starting Float */}
          <div className="pb-3 border-b-2 border-dashed border-black">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-black">OPENING CASH FLOAT:</span>
              <span className="font-black text-black text-sm tabular-nums">
                {formatCurrency(shift.opening_cash)}
              </span>
            </div>
          </div>

          {/* Sales by Tender */}
          <div className="space-y-2 pb-3 border-b-2 border-dashed border-black text-black">
            <div className="text-xs font-black uppercase text-black">SALES BY TENDER METHOD</div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 font-bold text-black">
                <Banknote className="w-3.5 h-3.5 text-black print:hidden" />
                <span>Cash Sales:</span>
              </span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(shift.cash_sales)}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 font-bold text-black">
                <Smartphone className="w-3.5 h-3.5 text-black print:hidden" />
                <span>M-Pesa Sales:</span>
              </span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(shift.mpesa_sales)}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="flex items-center gap-1.5 font-bold text-black">
                <CreditCard className="w-3.5 h-3.5 text-black print:hidden" />
                <span>Card Sales:</span>
              </span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(shift.card_sales)}
              </span>
            </div>
            <div className="pt-2 border-t-2 border-black flex justify-between text-xs items-center">
              <span className="font-black text-black">TOTAL SHIFT REVENUE:</span>
              <span className="font-black text-base text-black tabular-nums">
                {formatCurrency(shift.total_sales)}
              </span>
            </div>
          </div>

          {/* Drawer Reconciliation (For Closed or Current) */}
          <div className="space-y-2 pb-3 border-b-2 border-dashed border-black text-black">
            <div className="text-xs font-black uppercase text-black">DRAWER CASH RECONCILIATION</div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-black">Expected Cash (Float + Cash):</span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(shift.expected_cash)}
              </span>
            </div>
            {isClosed ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-black">Counted Physical Cash:</span>
                  <span className="font-black text-black tabular-nums">
                    {formatCurrency(shift.counted_cash ?? 0)}
                  </span>
                </div>
                <div className="p-2 border-2 border-dashed border-black rounded text-xs font-black flex justify-between items-center text-black">
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
              <div className="p-2 border-2 border-dashed border-black rounded text-xs font-bold text-black">
                ● Shift is currently active. Physical cash count pending drawer close.
              </div>
            )}
          </div>

          {/* Notes / Comments */}
          {shift.notes && (
            <div className="space-y-1 pb-3 border-b-2 border-dashed border-black text-xs text-black">
              <span className="font-black uppercase block text-black">AUDIT COMMENTS:</span>
              <p className="font-bold text-black border-2 border-dashed border-black p-2 rounded">
                "{shift.notes}"
              </p>
            </div>
          )}

          {/* Sign-off footer */}
          <div className="text-center pt-2 space-y-2 text-xs text-black font-bold">
            {settings.receipt_footer && (
              <p className="text-xs text-black font-black whitespace-pre-line pb-1">
                {settings.receipt_footer}
              </p>
            )}
            <div className="flex justify-around pt-4 text-xs font-black">
              <div className="border-t-2 border-black px-4 pt-1">Cashier Signature</div>
              <div className="border-t-2 border-black px-4 pt-1">Supervisor Signature</div>
            </div>
            <p className="pt-2 text-[11px] text-black font-bold">Generated by {settings.shop_name} POS System</p>
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
