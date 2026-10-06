"use client";

import React, { useEffect, useState } from "react";
import { RestaurantBill, RestaurantBillItem } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { ChefHat, Printer, X, Check, ShieldAlert } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { printElementInWindow } from "@/lib/printWindow";

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
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";

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

    if (isOpen && bill && autoPrint) {
      const timer = setTimeout(() => {
        printElementInWindow("kitchen-order-ticket", `KOT #${bill.bill_number}`);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, bill, autoPrint, isReprint, isWaiter]);

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

  const handlePrint = () => {
    printElementInWindow("kitchen-order-ticket", `KOT #${bill.bill_number}`);
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
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
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
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedProductId === "all"
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
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                    selectedProductId === item.product_id
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

        {/* Printable Ticket Area (58mm / 80mm thermal slip design) */}
        <div className="flex-1 overflow-y-auto p-5 text-xs bg-white text-zinc-950 font-mono">
          <div id="kitchen-order-ticket" className="w-full text-zinc-950 space-y-3">
            <div className="text-center border-b-2 border-dashed border-zinc-400 pb-2">
              <div className="text-xs font-semibold tracking-wider uppercase text-zinc-600">
                {settings?.shop_name || "RESTAURANT KITCHEN"}
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">
                {isReprint ? "*** KITCHEN REPRINT ***" : "*** KITCHEN TICKET ***"}
              </h2>
              {selectedProductId !== "all" ? (
                <div className="text-[11px] font-extrabold text-amber-900 bg-amber-50 border border-amber-300 rounded px-1 mt-0.5 inline-block">
                  ITEM-SPECIFIC REPRINT
                </div>
              ) : (
                <div className="text-[11px] font-bold text-zinc-600 mt-0.5">ORDER RECEIPT</div>
              )}
            </div>

            {/* Table & Bill No - Big & Prominent */}
            <div className="border-b-2 border-dashed border-zinc-400 pb-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-black">TABLE {bill.table_number}</span>
                <span className="text-sm font-bold">{bill.bill_number}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
                <span>
                  Server: <strong>{bill.waiter_name || "Staff"}{bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}</strong>
                </span>
                <span>Guests: <strong>{bill.guest_count}</strong></span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Time: {formatDateTime(bill.kitchen_printed_at || bill.created_at)}
              </div>
              {bill.customer_name && (
                <div className="text-[11px] text-zinc-700 font-semibold mt-0.5">
                  Guest: {bill.customer_name}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="border-b-2 border-dashed border-zinc-400 pb-2 space-y-2">
              <div className="flex justify-between font-black text-xs border-b border-zinc-200 pb-1">
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
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-800 shrink-0">
                      {isReprint ? "REPRINT" : "NEW"}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] font-bold text-rose-700 italic pl-6">
                      * NOTE: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* General Bill Notes */}
            {bill.notes && (
              <div className="p-2 border border-zinc-400 rounded text-[11px] font-bold bg-zinc-50">
                <span className="text-zinc-500 block text-[10px] uppercase">Special Instructions:</span>
                <span>{bill.notes}</span>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-zinc-500 pt-1 border-t border-zinc-300">
              Kitchen Copy • Send to Chef / Bar
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
    </div>
  );
}
