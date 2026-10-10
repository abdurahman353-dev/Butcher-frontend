"use client";

import React, { useState } from "react";
import { CartItem, Customer } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
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
  Search,
  Plus,
  MapPin,
  X,
  Pencil,
  ChefHat,
  Printer,
  AlertTriangle,
  UtensilsCrossed,
} from "lucide-react";
import { RestaurantTable, RestaurantBill } from "@/types";

interface CartPaneProps {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  totalWeight: number;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onOpenAddCustomer?: () => void;
  onEditCustomer?: (customer: Customer) => void;
  onAdjustWeight: (id: string, deltaKg: number) => void;
  onOpenWeightEdit: (item: CartItem) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onProceedCheckout: (preferredMethod?: "cash" | "mpesa" | "credit") => void;
  isShiftOpen?: boolean;
  isRestaurant?: boolean;
  heldCount?: number;
  onOpenHeldOrders?: () => void;
  onHoldOrder?: () => void;
  onNewBill?: () => void;
  unpaidCount?: number;
  onOpenUnpaidOrders?: () => void;
  activeTable?: RestaurantTable | null;
  activeBill?: RestaurantBill | null;
  hasUnsavedOrder?: boolean;
  isSavingOrder?: boolean;
  onSaveOrder?: () => Promise<void>;
  onPrintCustomerBill?: () => void;
  onCloseActiveBillSession?: () => void;
  onManageTableBills?: () => void;
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
  onOpenAddCustomer,
  onEditCustomer,
  onAdjustWeight,
  onOpenWeightEdit,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  onProceedCheckout,
  isShiftOpen = true,
  isRestaurant = false,
  heldCount = 0,
  onOpenHeldOrders,
  onHoldOrder,
  onNewBill,
  unpaidCount = 0,
  onOpenUnpaidOrders,
  activeTable,
  activeBill,
  hasUnsavedOrder = false,
  isSavingOrder = false,
  onSaveOrder,
  onPrintCustomerBill,
  onCloseActiveBillSession,
  onManageTableBills,
}: CartPaneProps) {
  const { confirm } = useSystemDialog();
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

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

  const handleExitSession = async () => {
    if (!onCloseActiveBillSession) return;
    const confirmed = await confirm({
      title: "Exit Table Session?",
      message: `Are you sure you want to exit Table ${activeBill?.table_number}? The bill remains open and can be reopened from the Floor Tables view.`,
      confirmText: "Yes, Exit Table",
      cancelText: "No, Stay",
      type: "warning",
    });
    if (confirmed) {
      onCloseActiveBillSession();
    }
  };

  const weighedItems = items.filter((it) => (it.unit || "").toUpperCase() === "KG");
  const totalWeighedKg = weighedItems.reduce((acc, it) => acc + it.weight, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 select-none w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header with Hold Order & Parked Bills */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-green-600" />
            {isRestaurant ? "Table Order" : "Current Order"}
          </h2>
          <span className="text-[11px] text-zinc-500">
            {items.length} {isRestaurant
              ? `item${items.length !== 1 ? "s" : ""}`
              : `cut${items.length !== 1 ? "s" : ""}`}
            {isRestaurant
              ? (totalWeighedKg > 0 ? ` • ${formatWeight(totalWeighedKg)}` : "")
              : ` • ${formatWeight(totalWeight)}`}
          </span>
        </div>

        {/* Action badges: Held Orders, Hold Current, Clear — hidden when order is saved/locked */}
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

          {/* Hide Hold / New / Clear when order is saved — items are locked */}
          {!(activeBill && !hasUnsavedOrder) && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Customer Selector & Unpaid Bills Pill */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-50 border-b border-zinc-100 shrink-0 space-y-2 w-full min-w-0 overflow-visible relative z-20">
        {activeBill && (
          <div className="p-2 sm:p-2.5 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-1.5 shadow-xs w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Table number badge \u2014 same green pill as image 1 */}
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-mono font-black text-base flex items-center justify-center shrink-0">
                {activeBill.table_number}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-xs text-zinc-900">Table {activeBill.table_number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono tracking-tight">
                    {activeBill.bill_number}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                  Waiter: <span className="font-semibold text-zinc-700">{activeBill.waiter_name || "Staff"}{activeBill.waiter_pin ? ` (#${activeBill.waiter_pin})` : ""}</span>
                  {activeBill.customer_name && (
                    <span className="font-bold text-emerald-800 ml-1">{" \u2022 "}{activeBill.customer_name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onManageTableBills && (
                <button
                  type="button"
                  onClick={onManageTableBills}
                  className="shrink-0 h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-[11px] font-bold text-white transition-all shadow-sm flex items-center gap-1"
                  title={`View all bills or create a new bill on Table ${activeBill.table_number}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Bill</span>
                  {activeTable?.active_bills && activeTable.active_bills.length > 1 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-800 text-white text-[9px] font-black">
                      {activeTable.active_bills.length}
                    </span>
                  )}
                </button>
              )}

              {onCloseActiveBillSession && (
                <button
                  type="button"
                  onClick={handleExitSession}
                  className="shrink-0 h-7 px-3 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-95 text-[11px] font-bold text-white transition-all shadow-sm"
                  title="Exit Table Session"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer row + floating dropdown */}
        <div className="relative min-w-0 w-full">
          <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0 w-full">
            <span className="text-xs sm:text-sm text-zinc-500 shrink-0 font-semibold">Customer:</span>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end flex-wrap">
              {selectedCustomer ? (
                <div className="flex items-center gap-1 min-w-0 max-w-[160px] xs:max-w-[200px] sm:max-w-xs bg-white border border-green-300 px-2 py-0.5 rounded-lg text-xs">
                  <span className="font-bold text-green-800 truncate" title={selectedCustomer.name}>
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">({selectedCustomer.phone})</span>
                  )}
                  {onEditCustomer && (
                    <button
                      type="button"
                      onClick={() => onEditCustomer(selectedCustomer)}
                      title="Edit customer details"
                      className="px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[9px] font-black shrink-0 flex items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    title="Remove customer (switch to Walk-in)"
                    className="text-zinc-400 hover:text-red-600 p-0.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-green-700 active:scale-95 shrink-0 cursor-pointer"
              >
                <span>{selectedCustomer ? "Change" : "Walk-in Customer"}</span>
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedCustomer?.address && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 pl-0.5 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{selectedCustomer.address}</span>
            </div>
          )}

          {/* Floating dropdown — absolutely positioned so it overlays cart items */}
          {showCustomerSelect && (
            <>
              {/* Invisible backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => { setShowCustomerSelect(false); setCustomerSearch(""); }}
              />
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-2 border-zinc-200 rounded-xl overflow-hidden shadow-2xl animate-in fade-in duration-100 flex flex-col max-h-[340px]">
                {/* Search Bar */}
                <div className="p-2.5 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50 shrink-0">
                  <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search name, phone, or address..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full text-sm bg-transparent focus:outline-none placeholder:text-zinc-400 font-medium text-zinc-800"
                    autoFocus
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch("")}
                      className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Add Button */}
                {onOpenAddCustomer && (
                  <div className="p-2 border-b border-zinc-100 bg-green-50/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerSelect(false);
                        onOpenAddCustomer();
                      }}
                      className="w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-bold text-green-800 bg-green-100 hover:bg-green-200 border border-green-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-green-700" />
                      <span>Add New Customer to Order</span>
                    </button>
                  </div>
                )}

                {/* Customers List — scrollable */}
                <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-[220px] flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCustomer(null);
                      setShowCustomerSelect(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                      !selectedCustomer ? "bg-green-50 text-green-800 border border-green-200" : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>Walk-in Customer</span>
                    {!selectedCustomer && <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">Selected</span>}
                  </button>

                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-400">
                      <p>No customer matches &ldquo;{customerSearch}&rdquo;</p>
                      {onOpenAddCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerSelect(false);
                            onOpenAddCustomer();
                          }}
                          className="mt-2 text-green-700 hover:underline font-bold text-sm"
                        >
                          + Add &ldquo;{customerSearch}&rdquo;
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        className={`w-full px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-1.5 ${
                          selectedCustomer?.id === c.id
                            ? "bg-green-50 text-green-800 font-bold border border-green-200"
                            : "text-zinc-700 hover:bg-zinc-50 border border-transparent"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCustomer(c);
                            setShowCustomerSelect(false);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center justify-between pr-2">
                            <span className="font-bold text-zinc-900 text-sm truncate">{c.name}</span>
                            <span className="text-zinc-500 font-mono text-xs">{c.phone}</span>
                          </div>
                          {c.address && (
                            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          )}
                        </button>
                        {onEditCustomer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCustomer(c);
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] shrink-0 flex items-center gap-1 shadow-2xs ml-1 active:scale-95 transition-transform"
                            title="Edit customer profile"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Unpaid / Pay Later alert — admin & cashier only */}
        {!isWaiter && unpaidCount > 0 && onOpenUnpaidOrders && (
          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl mt-2">
            <span className="text-amber-900 font-bold text-sm flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
              {unpaidCount} Pay Later Bill{unpaidCount !== 1 ? "s" : ""} Pending
            </span>
            <button
              type="button"
              onClick={onOpenUnpaidOrders}
              className="text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-3 py-1 rounded-lg border border-amber-600 transition-colors shrink-0 ml-2"
            >
              Collect
            </button>
          </div>
        )}
      </div>{/* end Customer Selector & Unpaid Bills Pill */}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/50">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <span className="text-3xl mb-2 opacity-40">{isRestaurant ? "🍽️" : "🥩"}</span>
            <p className="text-sm font-medium text-zinc-500">Cart is empty</p>
            <p className="text-xs text-zinc-400 mt-1">
              {isRestaurant
                ? "Select a table and open a bill, then add menu items."
                : "Click a meat cut to weigh and add it to this sale."}
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
              onUpdateDiscount={onUpdateDiscount}
              onRemove={onRemoveItem}
              readOnly={isSavingOrder || Boolean(item.is_saved)}
            />
          ))
        )}
      </div>

      {/* Totals + Actions */}
      <div className="p-4 border-t border-zinc-200 bg-white shrink-0 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>
              Subtotal
              {isRestaurant
                ? (totalWeighedKg > 0 ? ` (${formatWeight(totalWeighedKg)})` : ` (${items.length} ${items.length !== 1 ? "items" : "item"})`)
                : ` (${formatWeight(totalWeight)})`}
              :
            </span>
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

        {/* Active Table Bill Flow: Must Save Order first before checkout */}
        {activeBill && hasUnsavedOrder ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={items.length === 0 || isSavingOrder}
              onClick={onSaveOrder}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <ChefHat className="w-4 h-4" />
              <span>
                {isSavingOrder
                  ? "Saving Order & Printing..."
                  : `Save Order & Print Kitchen Receipt (${formatCurrency(total)})`}
              </span>
            </button>
            <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Must Save Order first so receipts are printed before checkout.</span>
            </div>
          </div>
        ) : (
          <>
            {/* If bill is saved and activeBill is present, offer Print Customer Bill */}
            {activeBill && onPrintCustomerBill && (
              <button
                type="button"
                disabled={items.length === 0}
                onClick={onPrintCustomerBill}
                className="w-full py-2.5 px-3 rounded-xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-700" />
                <span>Print Customer Bill (Yellow Status)</span>
              </button>
            )}

            {/* Quick Pay + Main Checkout — admin & cashier only */}
            {!isWaiter && (
              <>
                {/* Quick Pay Buttons: Cash, M-Pesa, Pay Later — responsive 3-col grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => onProceedCheckout("cash")}
                    className="py-3 sm:py-2 px-2 rounded-xl border border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-zinc-700 flex items-center justify-center gap-1 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                  >
                    <Banknote className="w-4 h-4 text-green-600" />
                    Cash
                  </button>

                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => onProceedCheckout("mpesa")}
                    className="py-3 sm:py-2 px-2 rounded-xl border border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-zinc-700 flex items-center justify-center gap-1 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-green-600" />
                    M-Pesa
                  </button>

                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => onProceedCheckout("credit")}
                    className="py-3 sm:py-2 px-2 rounded-xl border border-amber-200 bg-amber-50/60 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-amber-800 flex items-center justify-center gap-1 hover:bg-amber-100 active:bg-amber-200 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-amber-700" />
                    {activeBill ? "Open Tab" : "Pay Later"}
                  </button>
                </div>

                {/* Main checkout — large, full-width, very visible */}
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => onProceedCheckout()}
                  className={`w-full py-4 sm:py-3 px-4 rounded-xl font-bold text-sm sm:text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all shadow-sm ${
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
                      : activeBill
                      ? `Settle & Checkout (${formatCurrency(total)})`
                      : `Checkout (${formatCurrency(total)})`}
                  </span>
                  <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
