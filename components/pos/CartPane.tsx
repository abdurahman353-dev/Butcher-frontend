"use client";

import React, { useState } from "react";
import { CartItem, Customer } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { CartItemRow } from "./CartItemRow";
import {
  ShoppingBag,
  Trash2,
  UserPlus,
  Banknote,
  Smartphone,
  ChevronRight,
  Clock,
  PlusCircle,
  PauseCircle,
  Bookmark,
} from "lucide-react";

interface CartPaneProps {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  totalWeight: number;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onAdjustWeight: (id: string, deltaKg: number) => void;
  onOpenWeightEdit: (item: CartItem) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onProceedCheckout: (preferredMethod?: "cash" | "mpesa" | "card" | "credit") => void;
  isShiftOpen?: boolean;
  heldCount?: number;
  onOpenHeldOrders?: () => void;
  onHoldOrder?: () => void;
  onNewBill?: () => void;
  unpaidCount?: number;
  onOpenUnpaidOrders?: () => void;
}

export function CartPane({
  items,
  subtotal,
  totalDiscount,
  total,
  totalWeight,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onAdjustWeight,
  onOpenWeightEdit,
  onRemoveItem,
  onClearCart,
  onProceedCheckout,
  isShiftOpen = true,
  heldCount = 0,
  onOpenHeldOrders,
  onHoldOrder,
  onNewBill,
  unpaidCount = 0,
  onOpenUnpaidOrders,
}: CartPaneProps) {
  const { confirm } = useSystemDialog();
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  const handleClearClick = async () => {
    const confirmed = await confirm({
      title: "Clear Shopping Cart",
      message: "Are you sure you want to remove all items from the current cart? This cannot be undone.",
      confirmText: "Yes, Clear Cart",
      cancelText: "No, Keep Items",
      type: "warning",
    });
    if (confirmed) {
      onClearCart();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 select-none">
      {/* Header with Hold Order & Parked Bills */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-green-600" />
            Current Order
          </h2>
          <span className="text-[11px] text-zinc-500">
            {items.length} cut{items.length !== 1 ? "s" : ""} • {formatWeight(totalWeight)}
          </span>
        </div>

        {/* Action badges: Held Orders, Hold Current, Clear */}
        <div className="flex items-center gap-1.5">
          {onOpenHeldOrders && (
            <button
              type="button"
              onClick={onOpenHeldOrders}
              title="View held & parked bills"
              className={`h-7 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                heldCount > 0
                  ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200"
              }`}
            >
              <Clock className="w-3 h-3 text-amber-700" />
              <span>Held</span>
              {heldCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {heldCount}
                </span>
              )}
            </button>
          )}

          {items.length > 0 && onHoldOrder && (
            <button
              type="button"
              onClick={onHoldOrder}
              title="Save/Hold this order and create a new bill"
              className="h-7 px-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-amber-100 text-zinc-700 hover:text-amber-800 border border-zinc-200 flex items-center gap-1 transition-colors"
            >
              <PauseCircle className="w-3 h-3 text-amber-600" />
              <span>Hold</span>
            </button>
          )}

          {items.length > 0 && onNewBill && (
            <button
              type="button"
              onClick={onNewBill}
              title="Start a new blank bill"
              className="h-7 px-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 flex items-center gap-1 transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              <span>New</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearClick}
              title="Clear cart"
              className="h-7 px-1.5 text-xs text-zinc-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Selector & Unpaid Bills Pill */}
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Customer:</span>
          <button
            type="button"
            onClick={() => setShowCustomerSelect(!showCustomerSelect)}
            className="text-xs font-medium text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors"
          >
            <span>{selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}</span>
            <UserPlus className="w-3 h-3" />
          </button>
        </div>

        {/* Unpaid / Pay Later alert link if any exist */}
        {unpaidCount > 0 && onOpenUnpaidOrders && (
          <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 text-[11px]">
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-amber-600" />
              {unpaidCount} Pay Later Bill{unpaidCount !== 1 ? "s" : ""} Pending
            </span>
            <button
              type="button"
              onClick={onOpenUnpaidOrders}
              className="text-amber-700 hover:text-amber-900 font-bold underline"
            >
              Collect
            </button>
          </div>
        )}

        {showCustomerSelect && (
          <div className="mt-2 p-1 bg-white border border-zinc-200 rounded-lg space-y-0.5 max-h-36 overflow-y-auto shadow-md">
            <button
              type="button"
              onClick={() => {
                onSelectCustomer(null);
                setShowCustomerSelect(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                !selectedCustomer ? "bg-green-50 text-green-700 font-medium" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Walk-in Customer
            </button>
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(c);
                  setShowCustomerSelect(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex justify-between ${
                  selectedCustomer?.id === c.id
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-zinc-400">{c.phone}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/50">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <span className="text-3xl mb-2 opacity-40">🥩</span>
            <p className="text-sm font-medium text-zinc-500">Cart is empty</p>
            <p className="text-xs text-zinc-400 mt-1">
              Click a meat cut to weigh and add it to this sale.
            </p>
            {heldCount > 0 && onOpenHeldOrders && (
              <button
                type="button"
                onClick={onOpenHeldOrders}
                className="mt-3 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Resume 1 of {heldCount} held order{heldCount !== 1 ? "s" : ""}</span>
              </button>
            )}
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onAdjustWeight={onAdjustWeight}
              onOpenWeightEdit={onOpenWeightEdit}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Totals + Actions */}
      <div className="p-4 border-t border-zinc-200 bg-white shrink-0 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal ({formatWeight(totalWeight)}):</span>
            <span className="font-medium text-zinc-800 tabular-nums">{formatCurrency(subtotal)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-amber-600 font-medium">
              <span>Discount:</span>
              <span className="tabular-nums">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 flex items-baseline justify-between">
            <span className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Total</span>
            <span className="text-2xl font-black text-zinc-900 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Quick Pay Buttons: Cash, M-Pesa, Pay Later */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => onProceedCheckout("cash")}
            className="py-2 px-2 rounded-xl border border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-zinc-700 flex items-center justify-center gap-1 hover:bg-zinc-50 transition-colors"
          >
            <Banknote className="w-3.5 h-3.5 text-green-600" />
            Cash
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => onProceedCheckout("mpesa")}
            className="py-2 px-2 rounded-xl border border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-zinc-700 flex items-center justify-center gap-1 hover:bg-zinc-50 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-green-600" />
            M-Pesa
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => onProceedCheckout("credit")}
            className="py-2 px-2 rounded-xl border border-amber-200 bg-amber-50/60 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs text-amber-800 flex items-center justify-center gap-1 hover:bg-amber-100 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Pay Later
          </button>
        </div>

        {/* Main checkout */}
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => onProceedCheckout()}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all shadow-xs ${
            items.length === 0
              ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              : !isShiftOpen
              ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.98]"
              : "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
          }`}
        >
          <span>
            {!isShiftOpen && items.length > 0
              ? `Open Shift to Checkout (${formatCurrency(total)})`
              : `Checkout (${formatCurrency(total)})`}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
