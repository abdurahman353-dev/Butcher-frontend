"use client";

import React, { useEffect } from "react";
import { RestaurantBill, RestaurantBillItem } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { ChefHat, Printer, X } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { printElementInWindow } from "@/lib/printWindow";

interface KitchenOrderSlipModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export function KitchenOrderSlipModal({
  bill,
  isOpen,
  onClose,
  autoPrint = true,
}: KitchenOrderSlipModalProps) {
  const { settings } = useShopSettings();

  useEffect(() => {
    if (isOpen && bill && autoPrint) {
      const timer = setTimeout(() => {
        printElementInWindow("kitchen-order-ticket", `KOT #${bill.bill_number}`);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, bill, autoPrint]);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    printElementInWindow("kitchen-order-ticket", `KOT #${bill.bill_number}`);
  };

  const items: RestaurantBillItem[] = bill.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-sm max-h-[92dvh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar */}
        <div className="p-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Kitchen Order Ticket</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area (58mm / 80mm thermal slip design) */}
        <div className="flex-1 overflow-y-auto p-5 text-xs bg-white text-zinc-950 font-mono">
          <div id="kitchen-order-ticket" className="w-full text-zinc-950 space-y-3">
            <div className="text-center border-b-2 border-dashed border-zinc-400 pb-2">
              <div className="text-xs font-semibold tracking-wider uppercase text-zinc-600">
                {settings?.shop_name || "RESTAURANT KITCHEN"}
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">*** KITCHEN TICKET ***</h2>
              <div className="text-[11px] font-bold text-zinc-600 mt-0.5">ORDER RECEIPT</div>
            </div>

            {/* Table & Bill No - Big & Prominent */}
            <div className="border-b-2 border-dashed border-zinc-400 pb-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-black">TABLE {bill.table_number}</span>
                <span className="text-sm font-bold">{bill.bill_number}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
                <span>Server: <strong>{bill.waiter_name || "Staff"}{bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}</strong></span>
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

              {items.map((item: RestaurantBillItem, idx: number) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start text-xs font-black">
                    <span className="flex-1">
                      <span className="text-sm font-black mr-1.5 underline">[{item.weight}x]</span>
                      {item.product_name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-800 shrink-0">
                      NEW
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
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
