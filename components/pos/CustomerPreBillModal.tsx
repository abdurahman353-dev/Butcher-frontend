"use client";

import React, { useEffect, useRef, useState } from "react";
import { RestaurantBill, RestaurantBillItem } from "@/types";
import { formatCurrency, formatDateTime, formatUnitLabel } from "@/lib/formatters";
import { Printer, X, Receipt, Loader2 } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useSystemDialog } from "@/contexts/DialogContext";
import { printElementInWindow } from "@/lib/printWindow";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { buildEscPosReceipt, buildRestaurantReceiptEscPos, cleanBillNumber, formatReceiptDate, formatReceiptTime } from "@/lib/qz/receipt";
import { checkHealth, createSetupOperationId, detectAgentState, ensureTokenClearedOn401, getToken, logSetupStep, printEscPos } from "@/lib/printAgent/client";
import type { Sale } from "@/types";

interface CustomerPreBillModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  isReprint?: boolean;
}

export function CustomerPreBillModal({
  bill,
  isOpen,
  onClose,
  autoPrint = true,
  isReprint = false,
}: CustomerPreBillModalProps) {
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const autoPrintAttemptedRef = useRef(false);
  const hasPrintedRef = useRef(false);

  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
      inFlightRef.current = false;
      hasPrintedRef.current = false;
      setHasPrinted(false);
    }
  }, [isOpen]);

  if (!isOpen || !bill) return null;

  const isReprintBill =
    isReprint ||
    bill.status === "printed" ||
    Boolean(bill.bill_printed_at) ||
    hasPrintedRef.current;

  const handlePrint = async (arg?: boolean | React.MouseEvent) => {
    if (!bill || inFlightRef.current) return;
    const isReprintNow = typeof arg === "boolean" ? arg : isReprintBill;
    inFlightRef.current = true;
    setIsPrinting(true);
    try {
      const clientRef = isReprintNow
        ? `prebill-${bill.bill_number}-reprint-${Date.now()}`
        : `prebill-${bill.bill_number}-${Date.now()}`;
      const escpos = buildPreBillEscPos(bill, settings);
      const res = await printEscPos(escpos, { title: `Bill #${bill.bill_number}`, clientRef });
      if (res.status === "FAILED") {
        await alert({
          title: "Print Failed",
          message: res.error || "The pre-bill could not be printed.",
          type: "danger",
        });
        setIsPrintAgentOpen(true);
        return;
      }
      hasPrintedRef.current = true;
      setHasPrinted(true);
      if (res.status === "PENDING" && res.reason) {
        await alert({
          title: "Slip Queued",
          message: "The pre-bill is waiting for the printer. It will print automatically when available.",
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

  const items: RestaurantBillItem[] = bill.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-sm max-h-[92dvh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar */}
        {/* Top Control Bar (Hidden when printing) - Always visible & sticky at top */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0 z-20 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">BILL PREVIEW</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{isPrinting ? "Printing..." : (isReprintBill || hasPrinted) ? "Re-print Bill" : "Print Bill"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Body - Matching Exact Picture Layout */}
        <div id="customer-pre-bill-slip" className="p-4 sm:p-6 text-xs leading-snug space-y-2 bg-white text-black font-mono font-bold overflow-y-auto flex-1 overscroll-contain print:overflow-visible print:p-0 print:m-0">
          {/* Centered Header */}
          <div className="text-center space-y-0.5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              {settings?.shop_name || "JAMBO COAST PRIDE HOTEL"}
            </div>
            <div className="text-xs font-bold">
              {settings?.phone || "0710 747527 / 0757 363626"}
            </div>
            <div className="text-xs font-bold">
              {settings?.tax_pin ? `MPESA PAYBILL NO: ${settings.tax_pin}` : "MPESA PAYBILL NO:"}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="pt-2 text-xs font-bold space-y-0.5">
            <div className="flex justify-between">
              <span>Bill No. &nbsp;&nbsp;&nbsp;&nbsp;{cleanBillNumber(bill.bill_number, bill.id)}</span>
              <span>{formatReceiptDate(bill.bill_printed_at || bill.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Table N &nbsp;&nbsp;&nbsp;&nbsp;{bill.table_number}</span>
              <span>{formatReceiptTime(bill.bill_printed_at || bill.created_at)}</span>
            </div>
            <div>
              <span>Served by: &nbsp;{bill.waiter_name || "Staff"}</span>
            </div>
            <div className="text-center pt-1 font-black">
              <div>DINE IN</div>
              <div>BACK HALL</div>
            </div>
          </div>

          {/* Dashed line */}
          <div className="border-b border-dashed border-black my-1" />

          {/* Column Header */}
          <div className="flex justify-between text-xs font-bold">
            <span className="flex-1 text-left">Item name</span>
            <span className="w-12 text-center">Qty</span>
            <span className="w-16 text-right">total</span>
          </div>

          {/* Dashed line */}
          <div className="border-b border-dashed border-black my-1" />

          {/* Items */}
          <div className="space-y-1 text-xs">
            {items.map((item: RestaurantBillItem, idx: number) => (
              <div key={idx} className="space-y-0.5 font-bold">
                <div className="flex justify-between">
                  <span className="flex-1 text-left truncate pr-2">{item.product_name}</span>
                  <span className="w-12 text-center">{Math.round(Number(item.weight || 1))}</span>
                  <span className="w-16 text-right">{Math.round(Number(item.line_total || 0))}</span>
                </div>
                {item.notes && item.notes.trim() && (
                  <div className="pl-2 text-[11px] font-semibold text-zinc-800">
                    {item.notes.trim()} #
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dashed line */}
          <div className="border-b border-dashed border-black my-1" />

          {/* Totals */}
          {(() => {
            const gross = Number(bill.total || bill.subtotal || 0);
            const ctLevy = gross > 0 ? gross - (gross / 1.02) : 0;
            return (
              <div className="space-y-0.5 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>{Math.round(gross)}</span>
                </div>
                <div className="flex justify-between">
                  <span>16% VAT</span>
                  <span>0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2% C.T Levy</span>
                  <span>{ctLevy.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Vat</span>
                  <span>{ctLevy.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Amount</span>
                  <span>{Math.round(gross)}</span>
                </div>
                <div className="pt-1">
                  <span>Prepared by &nbsp;&nbsp;&nbsp;{bill.bill_printed_by || bill.cashier_name || "Muhammad"}</span>
                </div>
              </div>
            );
          })()}

          {/* Footer */}
          <div className="text-center pt-2 text-xs font-bold">
            ----------------- Thank you -----------------
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Close
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

function buildPreBillEscPos(bill: RestaurantBill, settings?: any): any[] {
  return buildRestaurantReceiptEscPos(
    {
      ...bill,
      isPreBill: true,
    },
    settings,
    { cutPaper: true }
  );
}
