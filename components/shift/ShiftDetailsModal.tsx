"use client";

import React, { useState } from "react";
import { Shift } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Printer, X, Clock, Banknote, Smartphone, CreditCard, Pencil, Check, AlertTriangle } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { printElementInWindow } from "@/lib/printWindow";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";

interface ShiftDetailsModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called with the updated shift after a successful admin adjustment */
  onShiftUpdated?: (updated: Shift) => void;
}

export function ShiftDetailsModal({ shift, isOpen, onClose, onShiftUpdated }: ShiftDetailsModalProps) {
  const { settings } = useShopSettings();
  const { isAdmin } = useAuth();

  const [editing, setEditing] = useState(false);
  const [countedInput, setCountedInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen || !shift) return null;

  const isClosed = shift.status === "closed";

  const openEdit = () => {
    setCountedInput(String(shift.counted_cash ?? ""));
    setNotesInput("");
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveAdjustment = async () => {
    const val = parseFloat(countedInput);
    if (isNaN(val) || val < 0) {
      setSaveError("Enter a valid amount (0 or more).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.patch(`/shifts/${shift.id}/adjust`, {
        counted_cash: val,
        notes: notesInput.trim() || undefined,
      });
      const updated: Shift = res.data?.data ?? res.data;
      setEditing(false);
      onShiftUpdated?.(updated);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save. Try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

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
          <div className="text-center space-y-1 pb-3 border-b-2 border-black">
            <div className="text-base sm:text-lg font-black tracking-tight text-black uppercase">{settings.shop_name ? settings.shop_name.toUpperCase() : "BUTCHERY POS"}</div>
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
              <p className="text-xs font-black text-black pt-1 whitespace-pre-line border-t-2 border-black mt-1">
                {settings.receipt_header}
              </p>
            )}
          </div>

          {/* Shift Metadata */}
          <div className="space-y-1.5 pb-3 border-b-2 border-black text-xs text-black">
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
          <div className="pb-3 border-b-2 border-black">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-black">OPENING CASH FLOAT:</span>
              <span className="font-black text-black text-sm tabular-nums">
                {formatCurrency(shift.opening_cash)}
              </span>
            </div>
          </div>

          {/* Sales by Tender */}
          <div className="space-y-2 pb-3 border-b-2 border-black text-black">
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
            <div className="pt-2 border-t border-dashed border-black/40 flex justify-between text-xs items-center">
              <span className="font-bold text-black">Total Cash + M-Pesa:</span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency((Number(shift.cash_sales) || 0) + (Number(shift.mpesa_sales) || 0))}
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
          <div className="space-y-2 pb-3 border-b-2 border-black text-black">
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
                <div className="p-2 border-2 border-black rounded text-xs font-black flex justify-between items-center text-black">
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
              <div className="p-2 border-2 border-black rounded text-xs font-bold text-black">
                ● Shift is currently active. Physical cash count pending drawer close.
              </div>
            )}
          </div>

          {/* Notes / Comments */}
          {shift.notes && (
            <div className="space-y-1 pb-3 border-b-2 border-black text-xs text-black">
              <span className="font-black uppercase block text-black">AUDIT COMMENTS:</span>
              <p className="font-bold text-black border-2 border-black p-2 rounded">
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

        {/* ── Admin: Adjust Counted Cash Panel ── */}
        {isAdmin && isClosed && (
          <div className="shrink-0 print:hidden border-t border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
            {!editing ? (
              <button
                type="button"
                onClick={openEdit}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Admin: Correct Counted Cash Amount
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Correcting counted cash will recalculate the drawer variance.
                </p>
                <div>
                  <label className="text-[10px] font-black text-amber-800 block mb-1 uppercase">Corrected Counted Cash</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedInput}
                    onChange={(e) => setCountedInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-amber-800 block mb-1 uppercase">Reason / Note (optional)</label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Cashier miscounted notes"
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {saveError && <p className="text-[11px] text-red-600 font-bold">{saveError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >Cancel</button>
                  <button
                    type="button"
                    onClick={saveAdjustment}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    {saving ? <span>Saving…</span> : (<><Check className="w-3.5 h-3.5" />Save Correction</>)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
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
