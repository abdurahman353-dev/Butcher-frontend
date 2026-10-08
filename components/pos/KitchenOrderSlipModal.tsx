"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RestaurantBill, RestaurantBillItem, Product } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { ChefHat, Printer, X, Loader2, ShieldAlert, Layers, ExternalLink } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import { printElementInWindow } from "@/lib/printWindow";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { buildKitchenSlipEscPos } from "@/lib/qz/receipt";
import {
  checkHealth,
  createSetupOperationId,
  detectAgentState,
  ensureTokenClearedOn401,
  getToken,
  logSetupStep,
  printEscPos,
} from "@/lib/printAgent/client";

interface KitchenOrderSlipModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  isReprint?: boolean;
  initialProductId?: number;
  products?: Product[];
}

interface CategoryGroup {
  categoryName: string;
  items: RestaurantBillItem[];
}

export function KitchenOrderSlipModal({
  bill,
  isOpen,
  onClose,
  autoPrint = true,
  isReprint = false,
  initialProductId,
  products = [],
}: KitchenOrderSlipModalProps) {
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const autoPrintAttemptedRef = useRef(false);

  // Filter state: either "all" or a specific category name
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  // State to filter for a single item reprint when there are multiple items
  const [selectedProductId, setSelectedProductId] = useState<number | "all">("all");

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
      setSelectedCategoryTab("all");
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else {
      setSelectedProductId("all");
    }
  }, [initialProductId, isOpen]);

  // Helper to determine the category for each item
  const getItemCategory = (item: RestaurantBillItem): string => {
    if (item.category_name && item.category_name.trim().length > 0) {
      return item.category_name.trim();
    }
    if (products && products.length > 0) {
      const match = products.find((p) => p.id === item.product_id);
      if (match?.category_name && match.category_name.trim().length > 0) {
        return match.category_name.trim();
      }
    }
    return "Kitchen";
  };

  const allItems: RestaurantBillItem[] = bill?.items || [];

  // Group items by category so each cook receives their own slip
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    if (!bill?.items || bill.items.length === 0) return [];

    const itemsToGroup =
      selectedProductId === "all"
        ? bill.items
        : bill.items.filter((it) => it.product_id === selectedProductId);

    const groupsMap = new Map<string, RestaurantBillItem[]>();
    for (const item of itemsToGroup) {
      const cat = getItemCategory(item);
      if (!groupsMap.has(cat)) {
        groupsMap.set(cat, []);
      }
      groupsMap.get(cat)!.push(item);
    }

    return Array.from(groupsMap.entries()).map(([catName, groupItems]) => ({
      categoryName: catName,
      items: groupItems,
    }));
  }, [bill, selectedProductId, products]);

  // Groups to render based on the active tab filter
  const displayedGroups = useMemo<CategoryGroup[]>(() => {
    if (selectedCategoryTab === "all") return categoryGroups;
    return categoryGroups.filter((g) => g.categoryName === selectedCategoryTab);
  }, [categoryGroups, selectedCategoryTab]);

  // Execute printing of category slips via Print Agent (ESC/POS with paper cuts between categories)
  const executePrintGroups = async (groupsToPrint: CategoryGroup[], isAuto = false) => {
    if (!bill || groupsToPrint.length === 0) return;
    const opId = createSetupOperationId();
    logSetupStep(opId, "print", {
      bill: bill.bill_number,
      autoPrint: isAuto,
      categoryCount: groupsToPrint.length,
    });

    try {
      const token = getToken();
      if (!token) {
        const detected = await detectAgentState(opId);
        if (!detected.health || (!detected.printer && !detected.error)) {
          setIsPrintAgentOpen(true);
          return;
        }
      }

      // Print each category group slip separately
      for (let i = 0; i < groupsToPrint.length; i++) {
        const group = groupsToPrint[i];
        const escpos = buildKitchenSlipEscPos(
          bill,
          group.items,
          bill.waiter_name,
          bill.table_number,
          group.categoryName,
          i + 1,
          groupsToPrint.length
        );

        const res = await printEscPos(escpos, {
          title: `KOT #${bill.bill_number} - ${group.categoryName}`,
        });

        if (res.status === "FAILED") {
          logSetupStep(opId, "failed", { resError: res.error, category: group.categoryName });
          await alert({
            title: "Print Failed",
            message:
              res.error || `The kitchen slip for station "${group.categoryName}" could not be printed.`,
            type: "danger",
          });
          setIsPrintAgentOpen(true);
          return;
        }
      }

      logSetupStep(opId, "complete");
    } catch (err: any) {
      logSetupStep(opId, "failed", { error: err?.message });
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
        message: err?.message || "Cannot reach the local Print Agent.",
        type: "warning",
      });
      setIsPrintAgentOpen(true);
    }
  };

  // Auto-print effect
  useEffect(() => {
    if (isReprint && isWaiter) return;
    if (!isOpen || !bill || !autoPrint || autoPrintAttemptedRef.current) return;
    if (categoryGroups.length === 0) return;

    autoPrintAttemptedRef.current = true;

    const timer = setTimeout(() => {
      executePrintGroups(categoryGroups, true);
    }, 40);

    return () => clearTimeout(timer);
  }, [isOpen, bill, autoPrint, isReprint, isWaiter, categoryGroups]);

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

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await executePrintGroups(displayedGroups, false);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    printElementInWindow("kitchen-order-tickets-container", `KOT #${bill.bill_number}`);
  };

  const totalSlipCount = categoryGroups.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[94dvh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar */}
        <div className="p-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>{isReprint ? "Kitchen Slip (Reprint)" : "Kitchen Order Ticket"}</span>
                {totalSlipCount > 1 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    {totalSlipCount} Station Slips
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || displayedGroups.length === 0}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Print slip(s) using Print Agent thermal printer"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>
                {isPrinting
                  ? "Printing..."
                  : displayedGroups.length === 1
                  ? "Print Slip"
                  : `Print ${displayedGroups.length} Slips`}
              </span>
            </button>
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Browser / Native Print"
            >
              <ExternalLink className="w-3.5 h-3.5" />
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

        {/* Category Tabs: Separate Kitchen Slips per Cook/Category */}
        {categoryGroups.length > 1 && (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-3 py-2 shrink-0 print:hidden">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1.5">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Cook Stations ({categoryGroups.length} Separate Slips):</span>
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">
                Items grouped by category for each cook
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategoryTab("all")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedCategoryTab === "all"
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                All Stations ({categoryGroups.length})
              </button>
              {categoryGroups.map((group) => {
                const count = group.items.length;
                const isSelected = selectedCategoryTab === group.categoryName;
                return (
                  <button
                    key={group.categoryName}
                    type="button"
                    onClick={() => setSelectedCategoryTab(group.categoryName)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{group.categoryName}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isSelected ? "bg-emerald-900/60 text-white" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Item Selector for Reprinting individual items */}
        {allItems.length > 1 && (
          <div className="bg-zinc-100 p-2.5 border-b border-zinc-200 shrink-0 print:hidden">
            <div className="text-[11px] font-bold text-zinc-700 mb-1.5 flex items-center justify-between">
              <span>Item Filter / Reprint:</span>
              {selectedProductId !== "all" && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                  Single Item Only
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
                  <span>
                    {item.weight}x {item.product_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printable Ticket Area - Boxed Slip Design for each category cook */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs leading-snug space-y-6 bg-zinc-100 text-black font-bold overscroll-contain print:overflow-visible print:p-0 print:m-0 print:bg-white font-mono">
          <div id="kitchen-order-tickets-container" className="w-full space-y-6 print:space-y-0">
            {displayedGroups.map((group, groupIdx) => (
              <div
                key={`${group.categoryName}_${groupIdx}`}
                className="kitchen-slip-page w-full bg-white border-2 border-black p-3 sm:p-4 text-black space-y-3 shadow-md rounded-xl print:border-2 print:border-black print:rounded-none print:shadow-none print:m-0 print:p-2"
                style={{
                  pageBreakAfter: groupIdx < displayedGroups.length - 1 ? "always" : "auto",
                  breakAfter: groupIdx < displayedGroups.length - 1 ? "page" : "auto",
                }}
              >
                {/* 1. Header Box with Category Station for Cook */}
                <div className="border-2 border-black p-2 text-center text-black space-y-1">
                  <div className="text-base sm:text-lg font-black tracking-tight uppercase">
                    {settings?.shop_name ? settings.shop_name.toUpperCase() : "RESTAURANT KITCHEN"}
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider">
                    {isReprint ? "*** KITCHEN REPRINT ***" : "*** KITCHEN ORDER TICKET ***"}
                  </div>

                  {/* Cook / Category Station Header Banner */}
                  <div className="bg-black text-white py-1 px-2 mt-1 rounded text-center">
                    <div className="text-[10px] tracking-widest uppercase font-extrabold text-amber-300">
                      COOK / STATION SECTION
                    </div>
                    <div className="text-sm sm:text-base font-black tracking-wider uppercase">
                      {group.categoryName}
                    </div>
                    {totalSlipCount > 1 && (
                      <div className="text-[9px] font-bold text-zinc-300 pt-0.5">
                        [ Slip {groupIdx + 1} of {totalSlipCount} ]
                      </div>
                    )}
                  </div>

                  {selectedProductId !== "all" && (
                    <div className="pt-1 text-[11px] font-bold text-red-700">
                      ITEM-SPECIFIC REPRINT
                    </div>
                  )}
                </div>

                {/* 2. Metadata Box */}
                <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
                  <div className="flex justify-between font-black text-sm">
                    <span>TABLE {bill.table_number}</span>
                    <span>BILL: #{bill.bill_number}</span>
                  </div>
                  <div>
                    <span>
                      Time: {formatDateTime(bill.kitchen_printed_at || bill.created_at || new Date().toISOString())}
                    </span>
                  </div>
                  <div className="text-xs pt-0.5 space-y-0.5">
                    <div className="grid grid-cols-2 gap-2 items-start">
                      <div className="space-y-0.5">
                        <div className="font-black text-black">Table: Table {bill.table_number}</div>
                        <div className="font-black text-black">Bill No: {bill.bill_number}</div>
                        <div>
                          Server: {bill.waiter_name || "Staff"}
                          {bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div>Customer: {bill.customer_name || "Table Guest"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Items Box — ONLY items belonging to this category! */}
                <div className="border-2 border-black p-2 space-y-2 text-black">
                  <div className="flex justify-between font-black text-xs border-b-2 border-black pb-1">
                    <span>QTY / ITEM ({group.categoryName.toUpperCase()})</span>
                    <span>STATUS</span>
                  </div>

                  {group.items.map((item: RestaurantBillItem, idx: number) => (
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
                    <span className="text-black uppercase text-[10px] block font-black">
                      Special Instructions:
                    </span>
                    <span>{bill.notes}</span>
                  </div>
                )}

                {/* 5. Footer Box */}
                <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
                  <div className="font-mono text-xs tracking-widest font-black">
                    * {bill.bill_number} *
                  </div>
                  <div className="text-[10px] font-bold">
                    Cook Copy • Station: {group.categoryName.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center print:hidden">
          <span className="text-[11px] text-zinc-600 font-semibold">
            {displayedGroups.length} slip{displayedGroups.length !== 1 ? "s" : ""} (
            {displayedGroups.reduce((acc, g) => acc + g.items.length, 0)} item
            {displayedGroups.reduce((acc, g) => acc + g.items.length, 0) !== 1 ? "s" : ""})
          </span>
          <div className="flex items-center gap-2">
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
      <PrintAgentDialog
        isOpen={isPrintAgentOpen}
        onClose={() => setIsPrintAgentOpen(false)}
      />
    </div>
  );
}
