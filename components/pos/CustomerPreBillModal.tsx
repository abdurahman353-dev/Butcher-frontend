"use client";

import React, { useEffect, useRef, useState } from "react";
import { RestaurantBill, RestaurantBillItem } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Printer, X, Receipt, Loader2 } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useSystemDialog } from "@/contexts/DialogContext";
import { printElementInWindow } from "@/lib/printWindow";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { buildEscPosReceipt } from "@/lib/qz/receipt";
import { checkHealth, createSetupOperationId, detectAgentState, ensureTokenClearedOn401, getToken, logSetupStep, printEscPos } from "@/lib/printAgent/client";
import type { Sale } from "@/types";

interface CustomerPreBillModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export function CustomerPreBillModal({
  bill,
  isOpen,
  onClose,
  autoPrint = true,
}: CustomerPreBillModalProps) {
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const autoPrintAttemptedRef = useRef(false);

  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
      inFlightRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen || !bill) return null;

  const handlePrint = async (arg?: boolean | React.MouseEvent) => {
    if (!bill || inFlightRef.current) return;
    const isReprint = typeof arg === "boolean" ? arg : false;
    inFlightRef.current = true;
    setIsPrinting(true);
    try {
      const clientRef = isReprint ? `prebill-${bill.bill_number}-reprint-${Date.now()}` : `prebill-${bill.bill_number}`;
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
              <span>{isPrinting ? "Printing..." : "Print Bill"}</span>
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

        {/* Thermal Receipt Body - Exactly matches ReceiptModal (Image 3) */}
        <div id="customer-pre-bill-slip" className="p-4 sm:p-6 text-xs leading-snug space-y-3 bg-white text-black font-bold overflow-y-auto flex-1 overscroll-contain print:overflow-visible print:p-0 print:m-0">
          {/* 1. Header Box */}
          <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
            <div className="text-base sm:text-lg font-black tracking-tight uppercase">
              {settings?.shop_name ? settings.shop_name.toUpperCase() : "RESTAURANT"}
            </div>
            {settings?.address && (
              <p className="text-xs font-bold leading-snug">{settings.address}</p>
            )}
            {(settings?.phone || settings?.email || settings?.tax_pin) && (
              <div className="text-[11px] font-bold space-y-0.5">
                {settings.phone && <p>Tel: {settings.phone}</p>}
                {settings.email && <p>Email: {settings.email}</p>}
                {settings.tax_pin && <p>PIN: {settings.tax_pin}</p>}
              </div>
            )}
            <div className="pt-1.5 mt-1.5 border-t-2 border-black text-xs font-bold">
              {settings?.receipt_header || "Restaurant Dining • Guest Bill"}
            </div>
          </div>

          {/* 2. Transaction Metadata Box - NO Cashier, NO Guests */}
          <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
            <div className="flex justify-between font-black text-sm">
              <span>BILL: #{bill.bill_number}</span>
              <span>PRE-SETTLEMENT</span>
            </div>
            <div>
              <span>Date: {formatDateTime(bill.bill_printed_at || bill.created_at || new Date().toISOString())}</span>
            </div>
            <div className="text-xs pt-0.5 space-y-0.5">
              <div className="grid grid-cols-2 gap-2 items-start">
                <div className="space-y-0.5">
                  <div className="font-black text-black">Table: Table {bill.table_number}</div>
                  <div className="font-black text-black">Bill No: {bill.bill_number}</div>
                  {bill.waiter_name && (
                    <div>Server: {bill.waiter_name}{bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}</div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold">Customer: <strong className="font-black text-black">{bill.customer_name || "Walk-in Customer"}</strong></div>
                  {bill.customer_phone && (
                    <div>Phone: <strong className="text-black">{bill.customer_phone}</strong></div>
                  )}
                  {(bill.customer_address || bill.customer?.address) && (
                    <div>Address: <strong className="text-black">{bill.customer_address || bill.customer?.address}</strong></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Items List */}
          <div className="py-1 space-y-2.5 text-black">
            {items.map((item: RestaurantBillItem, idx: number) => {
              const itemDiscount = Number(item.discount || 0);
              return (
                <div key={idx} className="space-y-0.5 font-bold">
                  <div className="flex justify-between text-xs font-black">
                    <span className="truncate pr-2">{item.product_name}</span>
                    <span className="shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-700">
                    <span>
                      {item.weight} {item.unit || "Pc"} x {formatCurrency(item.price_per_kg)}/{item.unit || "Pc"}
                    </span>
                    {itemDiscount > 0 && (
                      <span className="text-zinc-600 font-bold">
                        Disc: -{formatCurrency(itemDiscount)}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-zinc-600 italic pl-1">
                      Note: {item.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Financial Totals Box */}
          <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-black">{formatCurrency(bill.subtotal)}</span>
            </div>
            {Number(bill.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span>Total Discount:</span>
                <span className="font-black">-{formatCurrency(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm sm:text-base font-black pt-1 border-t-2 border-black text-black">
              <span>TOTAL DUE:</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
          </div>

          {/* 5. Banner Box */}
          <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
            <div className="font-black text-xs uppercase tracking-wider">
              *** GUEST INVOICE / BILL ***
            </div>
            <div className="text-[11px] font-bold leading-snug">
              Pre-settlement check. Please present this bill when making payment.
            </div>
          </div>

          {/* 6. Footer Box */}
          <div className="border-2 border-black p-2.5 text-center text-black space-y-1.5">
            <div className="font-mono text-sm tracking-widest font-black">
              * {bill.bill_number} *
            </div>
            <p className="text-xs font-black leading-snug whitespace-pre-line">
              {settings?.receipt_footer ||
                `Thank you for dining with us at ${settings?.shop_name || "our restaurant"}! Please visit again soon.`}
            </p>
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
  const storeName = settings?.shop_name || "RESTAURANT";
  const commands: any[] = ["\x1B\x40", "\x1B\x61\x01", "\x1B\x45\x01"];
  commands.push(`${storeName}\n`);
  commands.push("\x1B\x45\x00", "\x1B\x61\x01", "GUEST BILL\n", "PRE-SETTLEMENT\n", "--------------\n");
  commands.push("\x1B\x61\x00");
  commands.push(`Table: Table ${bill.table_number}\n`);
  commands.push(`Bill: ${bill.bill_number}\n`);
  if (bill.customer_name) {
    commands.push(`Customer: ${bill.customer_name}${bill.customer_phone ? ` (${bill.customer_phone})` : ""}\n`);
    const addr = bill.customer_address || bill.customer?.address;
    if (addr) {
      commands.push(`Address: ${addr}\n`);
    }
  }
  if (bill.waiter_name) {
    commands.push(`Server: ${bill.waiter_name}\n`);
  }
  commands.push(`Time: ${new Date(bill.bill_printed_at || bill.created_at || Date.now()).toLocaleString()}\n`);
  commands.push("--------------\n");
  commands.push("ITEM                TOTAL\n");
  for (const item of bill.items || []) {
    const name = (item.product_name || "Item").substring(0, 18);
    const total = Number(item.line_total || 0).toFixed(2);
    commands.push(`${name.padEnd(20)}${total}\n`);
  }
  commands.push("--------------\n");
  commands.push(`SUBTOTAL: KSh ${Number(bill.subtotal || 0).toFixed(2)}\n`);
  if (Number(bill.discount || 0) > 0) {
    commands.push(`DISCOUNT: KSh ${Number(bill.discount).toFixed(2)}\n`);
  }
  commands.push(`TOTAL:    KSh ${Number(bill.total || 0).toFixed(2)}\n`);
  commands.push("--------------\n");
  commands.push("Thank you!\n\n\n\n\x1D\x56\x41\x03");
  return commands;
}
