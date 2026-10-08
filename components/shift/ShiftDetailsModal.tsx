"use client";

import React, { useState, useRef } from "react";
import { Shift } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Printer, X, Clock, Banknote, Smartphone, CreditCard, Pencil, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useSystemDialog } from "@/contexts/DialogContext";
import { printElementInWindow } from "@/lib/printWindow";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { checkHealth, detectAgentState, ensureTokenClearedOn401, getToken, printEscPos } from "@/lib/printAgent/client";
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
  const { alert } = useSystemDialog();

  const [editing, setEditing] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState("");
  const [cashExpensesInput, setCashExpensesInput] = useState("");
  const [countedMpesaInput, setCountedMpesaInput] = useState("");
  const [mpesaExpensesInput, setMpesaExpensesInput] = useState("");
  const [mpesaTxCountInput, setMpesaTxCountInput] = useState("");
  const [expenseNotesInput, setExpenseNotesInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const inFlightRef = useRef(false);

  if (!isOpen || !shift) return null;

  const isClosed = shift.status === "closed";

  const openEdit = () => {
    setCountedCashInput(shift.counted_cash !== null && shift.counted_cash !== undefined ? String(shift.counted_cash) : "");
    setCashExpensesInput(shift.cash_expenses !== null && shift.cash_expenses !== undefined ? String(shift.cash_expenses) : "");
    setCountedMpesaInput(shift.counted_mpesa !== null && shift.counted_mpesa !== undefined ? String(shift.counted_mpesa) : "");
    setMpesaExpensesInput(shift.mpesa_expenses !== null && shift.mpesa_expenses !== undefined ? String(shift.mpesa_expenses) : "");
    setMpesaTxCountInput(shift.mpesa_transactions_count !== null && shift.mpesa_transactions_count !== undefined ? String(shift.mpesa_transactions_count) : "");
    setExpenseNotesInput(shift.expense_notes || "");
    setNotesInput("");
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveAdjustment = async () => {
    const valCash = parseFloat(countedCashInput);
    if (isNaN(valCash) || valCash < 0) {
      setSaveError("Please enter a valid Counted Physical Cash amount (0 or more).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, any> = {
        counted_cash: valCash,
        cash_expenses: cashExpensesInput.trim() !== "" ? parseFloat(cashExpensesInput) || 0 : 0,
        counted_mpesa: countedMpesaInput.trim() !== "" ? parseFloat(countedMpesaInput) || 0 : null,
        mpesa_expenses: mpesaExpensesInput.trim() !== "" ? parseFloat(mpesaExpensesInput) || 0 : 0,
        mpesa_transactions_count: mpesaTxCountInput.trim() !== "" ? parseInt(mpesaTxCountInput, 10) || 0 : null,
        expense_notes: expenseNotesInput.trim() || null,
        notes: notesInput.trim() || undefined,
      };
      const res = await api.patch(`/shifts/${shift.id}/adjust`, payload);
      const updated: Shift = res.data?.data ?? res.data;
      setEditing(false);
      onShiftUpdated?.(updated);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save shift adjustment. Try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!shift || inFlightRef.current) return;
    inFlightRef.current = true;
    setIsPrinting(true);
    try {
      const token = getToken();
      if (!token) {
        const detected = await detectAgentState();
        if (!detected.health || (!detected.printer && !detected.error)) {
          setIsPrintAgentOpen(true);
          return;
        }
      }
      const escpos = buildShiftEscPos(shift, settings);
      const res = await printEscPos(escpos, {
        title: `Shift #${shift.id} Z-Report`,
        clientRef: `shift-${shift.id}-${Date.now()}`,
      });
      if (res.status === "FAILED") {
        await alert({
          title: "Print Failed",
          message: res.error || "The Z-Report could not be printed.",
          type: "danger",
        });
        setIsPrintAgentOpen(true);
        return;
      }
      if (res.status === "PENDING" && res.reason) {
        await alert({
          title: "Report Queued",
          message: "The Z-Report is waiting for the printer. It will print automatically when available.",
          type: "info",
        });
        return;
      }
    } catch (err: any) {
      if (ensureTokenClearedOn401(err)) {
        setIsPrintAgentOpen(true);
        return;
      }
      try {
        await checkHealth();
      } catch {
        setIsPrintAgentOpen(true);
        return;
      }
      await alert({
        title: "Print Failed",
        message: err?.message || "The Print Agent returned an error.",
        type: "warning",
      });
      setIsPrintAgentOpen(true);
    } finally {
      setIsPrinting(false);
      inFlightRef.current = false;
    }
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
  const cashSales = Number(shift.cash_sales) || 0;
  const mpesaSales = Number(shift.mpesa_sales) || 0;
  const openingCash = Number(shift.opening_cash) || 0;
  const cashExpenses = Number(shift.cash_expenses) || 0;
  const mpesaExpenses = Number(shift.mpesa_expenses) || 0;
  const totalExpenses = cashExpenses + mpesaExpenses;

  const grossExpectedCash = openingCash + cashSales;
  const netExpectedPhysicalCash = grossExpectedCash - cashExpenses;
  const netExpectedMpesa = mpesaSales - mpesaExpenses;

  // Live calculations for admin editing console
  const liveCountedCash = parseFloat(countedCashInput) || 0;
  const liveCashExpenses = cashExpensesInput.trim() !== "" ? parseFloat(cashExpensesInput) || 0 : 0;
  const liveCashVariance = (liveCountedCash + liveCashExpenses) - grossExpectedCash;

  const liveCountedMpesa = parseFloat(countedMpesaInput) || 0;
  const liveMpesaExpenses = mpesaExpensesInput.trim() !== "" ? parseFloat(mpesaExpensesInput) || 0 : 0;
  const liveMpesaEntered = countedMpesaInput.trim() !== "";
  const liveMpesaVariance = (liveCountedMpesa + liveMpesaExpenses) - mpesaSales;

  const liveNetVariance = liveCashVariance + (liveMpesaEntered ? liveMpesaVariance : 0);

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

          {/* ── Shift Expenses & Till Payouts Section (Prominent) ── */}
          <div className="space-y-2 pb-3 border-b-2 border-black text-black">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black uppercase text-black">SHIFT EXPENSES &amp; PAYOUTS</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${totalExpenses > 0 ? "bg-black text-white" : "bg-zinc-100 text-black"}`}>
                {totalExpenses > 0 ? "PAYOUTS RECORDED" : "NO EXPENSES"}
              </span>
            </div>
            
            <div className="flex justify-between text-xs items-center">
              <span className="font-bold text-black">- Cash Expenses (From Drawer):</span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(cashExpenses)}
              </span>
            </div>

            <div className="flex justify-between text-xs items-center">
              <span className="font-bold text-black">- M-Pesa Expenses (From Till):</span>
              <span className="font-black text-black tabular-nums">
                {formatCurrency(mpesaExpenses)}
              </span>
            </div>

            <div className="pt-1.5 border-t border-dashed border-black/50 flex justify-between text-xs items-center">
              <span className="font-black text-black uppercase">TOTAL SHIFT EXPENSES:</span>
              <span className="font-black text-sm text-black tabular-nums">
                {formatCurrency(totalExpenses)}
              </span>
            </div>

            {shift.expense_notes ? (
              <div className="mt-1.5 pt-1.5 border-t border-dashed border-black/30 text-xs">
                <span className="font-black uppercase text-[10px] text-black block mb-0.5">
                  EXPENSE DETAILS / VOUCHER REASONS:
                </span>
                <p className="p-2 border-2 border-black rounded bg-zinc-50 font-mono text-[11px] font-bold text-black leading-snug whitespace-pre-wrap">
                  {shift.expense_notes}
                </p>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 font-bold italic pt-0.5">
                ● No expense voucher reasons specified.
              </div>
            )}
          </div>

          {/* Dual Reconciliation: Cash Drawer & M-Pesa Till */}
          <div className="space-y-3 pb-3 border-b-2 border-black text-black">
            {/* 1. Cash Drawer Breakdown */}
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase text-black flex justify-between">
                <span>1. CASH DRAWER AUDIT</span>
                <span>(NOTES &amp; COINS)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-black">Opening Cash Float:</span>
                <span className="font-black text-black tabular-nums">
                  {formatCurrency(openingCash)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-black">+ Cash Sales Collected:</span>
                <span className="font-black text-black tabular-nums">
                  +{formatCurrency(cashSales)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-black">Gross Cash in Register:</span>
                <span className="font-black text-black tabular-nums">
                  {formatCurrency(grossExpectedCash)}
                </span>
              </div>
              {cashExpenses > 0 && (
                <div className="flex justify-between text-xs text-black">
                  <span className="font-bold text-black">- Less Cash Expenses Paid:</span>
                  <span className="font-black text-black tabular-nums">
                    -{formatCurrency(cashExpenses)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-dashed border-black/30">
                <span className="font-black text-black">Net Expected Physical Cash:</span>
                <span className="font-black text-black tabular-nums">
                  {formatCurrency(netExpectedPhysicalCash)}
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
                  <div
                    className={`p-2 border-2 rounded text-[11px] font-black flex justify-between items-center ${
                      discrepancy === 0
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                        : discrepancy > 0
                        ? "bg-blue-50 border-blue-600 text-blue-900"
                        : "bg-rose-50 border-rose-600 text-rose-900"
                    } print:border-black print:text-black print:bg-white`}
                  >
                    <span>
                      CASH VARIANCE:{" "}
                      {discrepancy === 0
                        ? "BALANCED (0.00)"
                        : discrepancy > 0
                        ? "EXCESS / SURPLUS (+)"
                        : "SHORTAGE / DEFICIT (-)"}
                    </span>
                    <span className="tabular-nums">
                      {discrepancy >= 0 ? `+${formatCurrency(discrepancy)}` : formatCurrency(discrepancy)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-zinc-600 font-bold italic">
                  ● Physical count pending drawer close.
                </div>
              )}
            </div>

            {/* 2. M-Pesa Phone Audit */}
            <div className="space-y-1.5 pt-2 border-t border-dashed border-black/40">
              <div className="text-xs font-black uppercase text-black flex justify-between">
                <span>2. M-PESA TILL AUDIT</span>
                <span>(PHONE / SMS)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-black">Expected M-Pesa (POS Sales):</span>
                <span className="font-black text-black tabular-nums">
                  {formatCurrency(mpesaSales)}
                </span>
              </div>
              {mpesaExpenses > 0 && (
                <div className="flex justify-between text-xs text-black">
                  <span className="font-bold text-black">- Less M-Pesa Expenses Paid:</span>
                  <span className="font-black text-black tabular-nums">
                    -{formatCurrency(mpesaExpenses)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-dashed border-black/30">
                <span className="font-black text-black">Net Expected on Phone:</span>
                <span className="font-black text-black tabular-nums">
                  {formatCurrency(netExpectedMpesa)}
                </span>
              </div>
              {isClosed && shift.counted_mpesa !== null && shift.counted_mpesa !== undefined ? (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-black">Counted on Phone:</span>
                    <span className="font-black text-black tabular-nums">
                      {formatCurrency(shift.counted_mpesa)}
                      {shift.mpesa_transactions_count ? ` (${shift.mpesa_transactions_count} SMS txs)` : ""}
                    </span>
                  </div>
                  <div
                    className={`p-2 border-2 rounded text-[11px] font-black flex justify-between items-center ${
                      (shift.mpesa_difference ?? 0) === 0
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                        : (shift.mpesa_difference ?? 0) > 0
                        ? "bg-blue-50 border-blue-600 text-blue-900"
                        : "bg-rose-50 border-rose-600 text-rose-900"
                    } print:border-black print:text-black print:bg-white`}
                  >
                    <span>
                      M-PESA VARIANCE:{" "}
                      {(shift.mpesa_difference ?? 0) === 0
                        ? "BALANCED (0.00)"
                        : (shift.mpesa_difference ?? 0) > 0
                        ? "EXCESS / SURPLUS (+)"
                        : "SHORTAGE / DEFICIT (-)"}
                    </span>
                    <span className="tabular-nums">
                      {(shift.mpesa_difference ?? 0) >= 0
                        ? `+${formatCurrency(shift.mpesa_difference ?? 0)}`
                        : formatCurrency(shift.mpesa_difference ?? 0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-zinc-600 font-bold italic">
                  ● M-Pesa phone audit: {isClosed ? "Not counted on phone" : "Pending shift close"}
                </div>
              )}
            </div>

            {/* Overall Combined Variance on Slip if closed */}
            {isClosed && (
              <div
                className={`p-2 border-2 rounded text-[11px] font-black flex justify-between items-center ${
                  (discrepancy + (shift.mpesa_difference ?? 0)) === 0
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                    : (discrepancy + (shift.mpesa_difference ?? 0)) > 0
                    ? "bg-blue-50 border-blue-600 text-blue-900"
                    : "bg-rose-50 border-rose-600 text-rose-900"
                } print:border-black print:text-black print:bg-white`}
              >
                <span>
                  OVERALL SHIFT VARIANCE:{" "}
                  {(discrepancy + (shift.mpesa_difference ?? 0)) === 0
                    ? "BALANCED (0.00)"
                    : (discrepancy + (shift.mpesa_difference ?? 0)) > 0
                    ? "NET EXCESS / SURPLUS (+)"
                    : "NET SHORTAGE / DEFICIT (-)"}
                </span>
                <span className="tabular-nums">
                  {(discrepancy + (shift.mpesa_difference ?? 0)) >= 0
                    ? `+${formatCurrency(discrepancy + (shift.mpesa_difference ?? 0))}`
                    : formatCurrency(discrepancy + (shift.mpesa_difference ?? 0))}
                </span>
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

        {/* ── Admin: Comprehensive Shift Reconciliation Editor ── */}
        {isAdmin && isClosed && (
          <div className="shrink-0 print:hidden border-t-2 border-amber-300 bg-amber-50/70 p-4 space-y-3 max-h-[45vh] overflow-y-auto">
            {!editing ? (
              <button
                type="button"
                onClick={openEdit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-zinc-950 border border-amber-500 transition-all shadow-xs active:scale-98 cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-zinc-950" />
                <span>Admin: Edit &amp; Adjust Full Shift Reconciliation</span>
              </button>
            ) : (
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Admin Shift Adjustment Console</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Shift #{shift.id}
                  </span>
                </div>

                {/* Section 1: Physical Cash Drawer */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-zinc-700 block">
                    1. Cash Drawer Audit (Counted &amp; Expenses)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-zinc-800 block mb-0.5 uppercase">
                        Counted Cash in Drawer (KSh) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={countedCashInput}
                        onChange={(e) => setCountedCashInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 border-2 border-zinc-300 focus:border-zinc-900 rounded-lg text-xs font-black bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-800 block mb-0.5 uppercase">
                        Cash Expenses Paid (KSh)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashExpensesInput}
                        onChange={(e) => setCashExpensesInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 border-2 border-zinc-300 focus:border-zinc-900 rounded-lg text-xs font-black bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-bold flex justify-between items-center pt-1 border-t border-zinc-200">
                    <span className="text-zinc-600">Reconciled Cash Variance:</span>
                    <span
                      className={`font-black tabular-nums ${
                        liveCashVariance === 0
                          ? "text-emerald-700"
                          : liveCashVariance > 0
                          ? "text-blue-700"
                          : "text-rose-700"
                      }`}
                    >
                      {liveCashVariance >= 0
                        ? `+${formatCurrency(liveCashVariance)}`
                        : formatCurrency(liveCashVariance)}
                    </span>
                  </div>
                </div>

                {/* Section 2: M-Pesa Till Audit */}
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-900 block">
                    2. M-Pesa Phone Audit (Counted, Expenses &amp; SMS)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-emerald-950 block mb-0.5 uppercase">
                        Counted M-Pesa on Phone (KSh)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={countedMpesaInput}
                        onChange={(e) => setCountedMpesaInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 border-2 border-emerald-300 focus:border-emerald-700 rounded-lg text-xs font-black bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-emerald-950 block mb-0.5 uppercase">
                        M-Pesa Expenses Paid (KSh)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={mpesaExpensesInput}
                        onChange={(e) => setMpesaExpensesInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 border-2 border-emerald-300 focus:border-emerald-700 rounded-lg text-xs font-black bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-emerald-950 block mb-0.5 uppercase">
                        M-Pesa SMS / Tx Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={mpesaTxCountInput}
                        onChange={(e) => setMpesaTxCountInput(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full px-2.5 py-1.5 border-2 border-emerald-300 focus:border-emerald-700 rounded-lg text-xs font-black bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                  {liveMpesaEntered && (
                    <div className="text-[11px] font-bold flex justify-between items-center pt-1 border-t border-emerald-200">
                      <span className="text-emerald-800">Reconciled M-Pesa Variance:</span>
                      <span
                        className={`font-black tabular-nums ${
                          liveMpesaVariance === 0
                            ? "text-emerald-700"
                            : liveMpesaVariance > 0
                            ? "text-blue-700"
                            : "text-rose-700"
                        }`}
                      >
                        {liveMpesaVariance >= 0
                          ? `+${formatCurrency(liveMpesaVariance)}`
                          : formatCurrency(liveMpesaVariance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Section 3: Expense Details / Voucher Reasons */}
                <div>
                  <label className="text-[10px] font-black text-zinc-900 block mb-0.5 uppercase">
                    Expense Details / Voucher Reasons
                  </label>
                  <input
                    type="text"
                    value={expenseNotesInput}
                    onChange={(e) => setExpenseNotesInput(e.target.value)}
                    placeholder="e.g. Transport Fare KSh 200, Ice cubes KSh 100, Cleaning supplies..."
                    className="w-full px-3 py-1.5 border-2 border-zinc-300 rounded-lg text-xs font-bold bg-white focus:outline-hidden focus:border-zinc-900"
                  />
                </div>

                {/* Section 4: Admin Audit Comment */}
                <div>
                  <label className="text-[10px] font-black text-zinc-900 block mb-0.5 uppercase">
                    Admin Correction Reason / Audit Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Verified with store manager, recount performed..."
                    className="w-full px-3 py-1.5 border-2 border-zinc-300 rounded-lg text-xs font-bold bg-white focus:outline-hidden focus:border-zinc-900"
                  />
                </div>

                {/* Live Net Variance Banner */}
                <div className="p-2.5 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center justify-between text-xs font-black">
                  <span className="uppercase text-zinc-800 text-[10px]">
                    Projected Net Variance (Cash + M-Pesa):
                  </span>
                  <span
                    className={`text-sm tabular-nums ${
                      liveNetVariance === 0
                        ? "text-emerald-700"
                        : liveNetVariance > 0
                        ? "text-blue-700"
                        : "text-rose-700"
                    }`}
                  >
                    {liveNetVariance >= 0
                      ? `+${formatCurrency(liveNetVariance)}`
                      : formatCurrency(liveNetVariance)}
                  </span>
                </div>

                {saveError && <p className="text-[11px] text-red-600 font-black">{saveError}</p>}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-black bg-white border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveAdjustment}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
                  >
                    {saving ? (
                      <span>Saving Adjustments…</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save All Adjustments</span>
                      </>
                    )}
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
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border-2 border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-black rounded-xl shadow-2xs transition-colors text-center"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            <span>{isPrinting ? "Printing..." : "Print Z-Report"}</span>
          </button>
        </div>
      </div>
      <PrintAgentDialog
        isOpen={isPrintAgentOpen}
        onClose={() => setIsPrintAgentOpen(false)}
      />
    </div>
  );
}

function buildShiftEscPos(shift: Shift, settings?: any): any[] {
  const divider = "-".repeat(42) + "\n";
  const commands: any[] = ["\x1B\x40", "\x1B\x61\x01", "\x1B\x45\x01"];
  const storeName = settings?.shop_name || "SHIFT REPORT";
  commands.push(`${storeName}\n`);
  commands.push("\x1B\x45\x00", "Z-REPORT\n", "SHIFT SUMMARY\n");
  commands.push("=".repeat(42) + "\n", "\x1B\x61\x00");
  commands.push(`Shift: #${shift.id}\n`);
  commands.push(`Opened: ${new Date(shift.opened_at).toLocaleString()}\n`);
  commands.push(`Closed: ${shift.closed_at ? new Date(shift.closed_at).toLocaleString() : new Date().toLocaleString()}\n`);
  commands.push(`Cashier: ${shift.cashier_name || ""}\n`);
  commands.push(divider);
  commands.push(`Opening Float:   KSh ${Number(shift.opening_cash || 0).toFixed(2)}\n`);
  commands.push(`Gross Sales:     KSh ${Number(shift.total_sales || 0).toFixed(2)}\n`);
  commands.push(`  Cash Sales:    KSh ${Number(shift.cash_sales || 0).toFixed(2)}\n`);
  commands.push(`  M-Pesa:        KSh ${Number(shift.mpesa_sales || 0).toFixed(2)}\n`);
  commands.push(`  Card:          KSh ${Number(shift.card_sales || 0).toFixed(2)}\n`);
  commands.push(divider);
  
  // Expenses & Payouts in thermal slip
  const cashExp = Number(shift.cash_expenses || 0);
  const mpesaExp = Number(shift.mpesa_expenses || 0);
  const totalExp = cashExp + mpesaExp;
  commands.push("EXPENSES & PAYOUTS:\n");
  commands.push(`  Cash Expenses: KSh ${cashExp.toFixed(2)}\n`);
  commands.push(`  M-Pesa Exp:    KSh ${mpesaExp.toFixed(2)}\n`);
  commands.push(`  Total Expenses:KSh ${totalExp.toFixed(2)}\n`);
  if (shift.expense_notes) {
    commands.push(`  Vouchers:      ${shift.expense_notes}\n`);
  }
  commands.push(divider);

  // Cash Drawer Audit
  commands.push("CASH DRAWER AUDIT:\n");
  const grossCash = (Number(shift.opening_cash) || 0) + (Number(shift.cash_sales) || 0);
  commands.push(`  Gross Cash:    KSh ${grossCash.toFixed(2)}\n`);
  if (cashExp > 0) {
    commands.push(`  Less Cash Exp: -KSh ${cashExp.toFixed(2)}\n`);
  }
  commands.push(`  Expected Cash: KSh ${(grossCash - cashExp).toFixed(2)}\n`);
  if (shift.counted_cash !== null && shift.counted_cash !== undefined) {
    commands.push(`  Counted Cash:  KSh ${Number(shift.counted_cash).toFixed(2)}\n`);
    commands.push(`  Cash Variance: KSh ${Number(shift.difference || 0).toFixed(2)}\n`);
  }

  // M-Pesa Till Audit
  if (shift.counted_mpesa !== null && shift.counted_mpesa !== undefined) {
    commands.push(divider);
    commands.push("M-PESA TILL AUDIT:\n");
    commands.push(`  POS M-Pesa:    KSh ${Number(shift.mpesa_sales || 0).toFixed(2)}\n`);
    if (mpesaExp > 0) {
      commands.push(`  Less M-Pesa Exp:-KSh ${mpesaExp.toFixed(2)}\n`);
    }
    commands.push(`  Counted Phone: KSh ${Number(shift.counted_mpesa).toFixed(2)}\n`);
    if (shift.mpesa_transactions_count) {
      commands.push(`  Tx SMS Count:  ${shift.mpesa_transactions_count}\n`);
    }
    commands.push(`  M-Pesa Diff:   KSh ${Number(shift.mpesa_difference || 0).toFixed(2)}\n`);
  }

  if (shift.notes) {
    commands.push(divider);
    commands.push(`Comments: ${shift.notes}\n`);
  }

  commands.push("=".repeat(42) + "\n", "\n\n\n\x1D\x56\x41\x03");
  return commands;
}
