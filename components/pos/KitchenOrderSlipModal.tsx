"use client";

import React, { useEffect, useRef, useState } from "react";
import { RestaurantBill, RestaurantBillItem } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { ChefHat, Printer, X, Loader2, Check, ShieldAlert } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import { printElementInWindow } from "@/lib/printWindow";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { buildKitchenSlipEscPos } from "@/lib/qz/receipt";
import { checkHealth, createSetupOperationId, detectAgentState, ensureTokenClearedOn401, getToken, logSetupStep, printEscPos } from "@/lib/printAgent/client";

interface KitchenOrderSlipModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  isReprint?: boolean;
  initialProductId?: number;
}

export function KitchenOrderSlipModal({
  bill,
  isOpen,
  onClose,
  autoPrint = true,
  isReprint = false,
  initialProductId,
}: KitchenOrderSlipModalProps) {
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const autoPrintAttemptedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
    }
  }, [isOpen]);

  // State to filter for a single item reprint when there are multiple items
  const [selectedProductId, setSelectedProductId] = useState<number | "all">("all");

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else {
      setSelectedProductId("all");
    }
  }, [initialProductId, isOpen]);

  useEffect(() => {
    // Waiters cannot reprint kitchen slips
    if (isReprint && isWaiter) return;

    if (!isOpen || !bill || !autoPrint || autoPrintAttemptedRef.current) return;
    autoPrintAttemptedRef.current = true;

    const run = async () => {
      const opId = createSetupOperationId();
      logSetupStep(opId, "print", { bill: bill.bill_number, autoPrint: true });
      try {
        const token = getToken();
        if (!token) {
          const detected = await detectAgentState(opId);
          if (!detected.health || (!detected.printer && !detected.error)) {
            setIsPrintAgentOpen(true);
            return;
          }
        }
        const escpos = buildKitchenSlipEscPos(
          bill,
          bill.items || [],
          bill.waiter_name,
          bill.table_number
        );
        const res = await printEscPos(escpos, { title: `KOT #${bill.bill_number}` });
        if (res.status === "FAILED") {
          logSetupStep(opId, "failed", { resError: res.error });
          await alert({
            title: "Print Failed",
            message: res.error || "The kitchen slip could not be printed.",
            type: "danger",
          });
          setIsPrintAgentOpen(true);
          return;
        }
        logSetupStep(opId, "complete");
      } catch (err: any) {
        logSetupStep(opId, "failed", { error: err?.message });
        if (ensureTokenClearedOn401(err)) {
          setIsPrintAgentOpen(true);
          return;
        }
        await alert({
          title: "Print Agent Unavailable",
          message: err?.message || "Cannot reach the local Print Agent.",
          type: "warning",
        });
        setIsPrintAgentOpen(true);
      }
    };

    const timer = setTimeout(() => {
      run();
    }, 30);
    return () => clearTimeout(timer);
  }, [isOpen, bill, autoPrint, alert, isReprint, isWaiter]);

  if (!isOpen || !bill) return null;

  // Block waiters from reprinting kitchen slips
  if (isReprint && isWaiter) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
        <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl z-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Permission Denied</h3>
          <p className="text-xs text-zinc-600">
            Waiters cannot reprint kitchen slips. Only cashiers and superadmins are authorized to reprint.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const allItems: RestaurantBillItem[] = bill.items || [];
  const displayedItems =
    selectedProductId === "all"
      ? allItems
      : allItems.filter((it) => it.product_id === selectedProductId);

  const handlePrint = async () => {
    if (!bill) return;
    setIsPrinting(true);
    try {
      const escpos = buildKitchenSlipEscPos(
        bill,
        bill.items || [],
        bill.waiter_name,
        bill.table_number
      );
      const res = await printEscPos(escpos, { title: `KOT #${bill.bill_number}` });
      if (res.status === "FAILED") {
        await alert({
          title: "Print Failed",
          message: res.error || "The kitchen slip could not be printed.",
          type: "danger",
        });
        setIsPrintAgentOpen(true);
        return;
      }
      if (res.status === "PENDING" && res.reason) {
        await alert({
          title: "Slip Queued",
          message: "The kitchen slip is waiting for the printer. It will print automatically when available.",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[92dvh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar */}
        <div className="p-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isReprint ? "Kitchen Slip (Reprint)" : "Kitchen Order Ticket"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{isPrinting ? "Printing..." : "Print Slip"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Item Selector for Reprinting individual items if multiple products */}
        {allItems.length > 1 && (
          <div className="bg-zinc-100 p-2.5 border-b border-zinc-200 shrink-0 print:hidden">
            <div className="text-[11px] font-bold text-zinc-700 mb-1.5 flex items-center justify-between">
              <span>Select item to print:</span>
              {selectedProductId !== "all" && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                  Single Item Reprint
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedProductId("all")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${selectedProductId === "all"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-200"
                  }`}
              >
                All Items ({allItems.length})
              </button>
              {allItems.map((item, idx) => (
                <button
                  key={`${item.product_id}_${idx}`}
                  type="button"
                  onClick={() => setSelectedProductId(item.product_id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${selectedProductId === item.product_id
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-200"
                    }`}
                >
                  <span>{item.weight}x {item.product_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printable Ticket Area - Boxed Receipt Design matching Image 3 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs leading-snug space-y-3 bg-white text-black font-bold overscroll-contain print:overflow-visible print:p-0 print:m-0 font-mono">
          <div id="kitchen-order-ticket" className="w-full text-black space-y-3">
            {/* 1. Header Box */}
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="text-base sm:text-lg font-black tracking-tight uppercase">
                {settings?.shop_name ? settings.shop_name.toUpperCase() : "RESTAURANT KITCHEN"}
              </div>
              <div className="text-xs font-black uppercase tracking-wider">
                {isReprint ? "*** KITCHEN REPRINT ***" : "*** KITCHEN ORDER TICKET ***"}
              </div>
              <div className="pt-1 mt-1 border-t-2 border-black text-xs font-bold">
                {selectedProductId !== "all" ? "ITEM-SPECIFIC REPRINT" : "ORDER TICKET"}
              </div>
            </div>

            {/* 2. Metadata Box - NO Cashier, NO Guests */}
            <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
              <div className="flex justify-between font-black text-sm">
                <span>TABLE {bill.table_number}</span>
                <span>BILL: #{bill.bill_number}</span>
              </div>
              <div>
                <span>Time: {formatDateTime(bill.kitchen_printed_at || bill.created_at || new Date().toISOString())}</span>
              </div>
              <div className="text-xs pt-0.5 space-y-0.5">
                <div className="grid grid-cols-2 gap-2 items-start">
                  <div className="space-y-0.5">
                    <div className="font-black text-black">Table: Table {bill.table_number}</div>
                    <div className="font-black text-black">Bill No: {bill.bill_number}</div>
                    <div>Server: {bill.waiter_name || "Staff"}{bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div>Customer: {bill.customer_name || "Table Guest"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Items Box */}
            <div className="border-2 border-black p-2 space-y-2 text-black">
              <div className="flex justify-between font-black text-xs border-b-2 border-black pb-1">
                <span>QTY / ITEM</span>
                <span>STATUS</span>
              </div>

              {displayedItems.map((item: RestaurantBillItem, idx: number) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start text-xs font-black">
                    <span className="flex-1">
                      <span className="text-sm font-black mr-1.5 underline">[{item.weight}x]</span>
                      {item.product_name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-black bg-zinc-100 text-black shrink-0">
                      {isReprint ? "REPRINT" : "NEW"}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] font-bold text-red-700 italic pl-6">
                      * NOTE: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 4. Special Instructions (if any) */}
            {bill.notes && (
              <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-0.5">
                <span className="text-black uppercase text-[10px] block font-black">Special Instructions:</span>
                <span>{bill.notes}</span>
              </div>
            )}

            {/* 5. Footer Box */}
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-mono text-xs tracking-widest font-black">
                * {bill.bill_number} *
              </div>
              <div className="text-[10px] font-bold">
                Kitchen Copy • Send to Chef / Bar
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center print:hidden">
          <span className="text-[11px] text-zinc-500">
            {displayedItems.length} item{displayedItems.length !== 1 ? "s" : ""} on ticket
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            Done
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
