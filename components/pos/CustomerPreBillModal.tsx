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
import { checkHealth, detectAgentState, ensureTokenClearedOn401, getToken, printEscPos } from "@/lib/printAgent/client";
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
  const pendingAutoPrint = useRef(autoPrint);

  useEffect(() => {
    if (isOpen) {
      pendingAutoPrint.current = autoPrint;
    }
  }, [isOpen, autoPrint]);

  useEffect(() => {
    if (!isOpen || !bill) return;
    const run = async () => {
      try {
        const token = getToken();
        if (!token) {
          const detected = await detectAgentState();
          if (!detected.health || (!detected.printer && !detected.error)) {
            setIsPrintAgentOpen(true);
            return;
          }
        }
        // Try agent: if bill maps to a sale? sometimes not. But requirement says all slips via agent.
        // Build a minimal ESC/POS fallback not needed; just queue via agent? We'll try to build receipt-like ESC/POS
        const escpos = buildPreBillEscPos(bill, settings);
        const res = await printEscPos(escpos, { title: `Bill #${bill.bill_number}` });
        if (res.status === "FAILED") {
          await alert({
            title: "Print Failed",
            message: res.error || "The pre-bill could not be printed.",
            type: "danger",
          });
          setIsPrintAgentOpen(true);
          return;
        }
        pendingAutoPrint.current = false;
      } catch (err: any) {
        if (ensureTokenClearedOn401(err)) {
          setIsPrintAgentOpen(true);
          pendingAutoPrint.current = true;
          return;
        }
        await alert({
          title: "Print Agent Unavailable",
          message: err?.message || "Cannot reach the local Print Agent.",
          type: "warning",
        });
        setIsPrintAgentOpen(true);
        pendingAutoPrint.current = true;
      }
    };
    if (pendingAutoPrint.current) {
      const timer = setTimeout(() => {
        pendingAutoPrint.current = false;
        run();
      }, 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, bill, alert, settings]);

  if (!isOpen || !bill) return null;

  const handlePrint = async () => {
    if (!bill) return;
    setIsPrinting(true);
    try {
      const escpos = buildPreBillEscPos(bill, settings);
      const res = await printEscPos(escpos, { title: `Bill #${bill.bill_number}` });
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
    }
  };

  const items: RestaurantBillItem[] = bill.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-sm max-h-[92dvh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar */}
        <div className="p-3 bg-amber-500 text-amber-950 flex items-center justify-between shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-950" />
            <span className="text-xs font-bold uppercase tracking-wider">Customer Bill Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1 bg-amber-900 hover:bg-amber-950 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{isPrinting ? "Printing..." : "Print Bill"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-amber-600/50 rounded-lg text-amber-950 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Bill Area (58mm / 80mm thermal slip design) */}
        <div className="flex-1 overflow-y-auto p-5 text-xs bg-white text-zinc-950 font-mono">
          <div id="customer-pre-bill-slip" className="w-full text-zinc-950 space-y-3">
            <div className="text-center border-b border-dashed border-zinc-400 pb-2">
              <h2 className="text-base font-black tracking-tight">{settings?.shop_name || "RESTAURANT"}</h2>
              {settings?.address && <div className="text-[10px] text-zinc-600 mt-0.5">{settings.address}</div>}
              {settings?.phone && <div className="text-[10px] text-zinc-600">Tel: {settings.phone}</div>}
              {settings?.tax_pin && <div className="text-[10px] text-zinc-600">PIN: {settings.tax_pin}</div>}
              <div className="text-xs font-black tracking-wider uppercase mt-1 px-2 py-0.5 bg-zinc-100 inline-block rounded">
                GUEST INVOICE / BILL
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">(Pre-Settlement Check)</div>
            </div>

            {/* Table & Bill Details */}
            <div className="border-b border-dashed border-zinc-400 pb-2 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Table:</span>
                <span className="font-black text-sm">TABLE {bill.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold">{bill.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Server / Waiter:</span>
                <span>{bill.waiter_name || "Staff"}{bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{bill.cashier_name || "Cashier"}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests:</span>
                <span>{bill.guest_count}</span>
              </div>
              {bill.customer_name && (
                <div className="flex justify-between">
                  <span>Guest Name:</span>
                  <span className="font-bold">{bill.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                <span>Printed At:</span>
                <span>{formatDateTime(bill.bill_printed_at || new Date().toISOString())}</span>
              </div>
            </div>

            {/* Itemized list */}
            <div className="border-b border-dashed border-zinc-400 pb-2 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] uppercase text-zinc-600 border-b border-zinc-200 pb-0.5">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>

              {items.map((item: RestaurantBillItem, idx: number) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start text-xs font-semibold">
                    <span className="flex-1 pr-2">
                      <span className="font-bold mr-1">{item.weight}x</span>
                      {item.product_name}
                      <span className="text-[10px] text-zinc-500 block">
                        @{formatCurrency(item.price_per_kg)}
                      </span>
                    </span>
                    <span className="font-bold shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="border-b-2 border-dashed border-zinc-500 pb-2 space-y-1 text-xs">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Discount:</span>
                  <span>-{formatCurrency(bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-300">
                <span>TOTAL PAYABLE:</span>
                <span className="text-base">{formatCurrency(bill.total)}</span>
              </div>
            </div>

            {/* Note & Thank You */}
            <div className="text-center text-[10px] text-zinc-600 pt-1 space-y-0.5">
              <div className="font-bold">Thank you for dining with us!</div>
              <div>Please present this bill when making payment.</div>
              <div className="text-zinc-400">Accepted: Cash • M-Pesa</div>
            </div>
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
  commands.push(`Table: ${bill.table_number}\n`);
  commands.push(`Bill: ${bill.bill_number}\n`);
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
