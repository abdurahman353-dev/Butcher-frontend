"use client";

import React, { useState } from "react";
import { CartItem, Customer } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import { CartItemRow } from "./CartItemRow";
import { CustomerPickerModal } from "./CustomerPickerModal";
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
  isClothing?: boolean;
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
  isClothing = false,
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
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
    if (isSavingOrder) return;
    if (!onCloseActiveBillSession) return;
    onCloseActiveBillSession();
  };

  const weighedItems = items.filter((it) => (it.unit || "").toUpperCase() === "KG");
  const totalWeighedKg = weighedItems.reduce((acc, it) => acc + it.weight, 0);

  return (
    <>
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 select-none w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header with Hold Order & Parked Bills */}
      <div className="px-3.5 py-2 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            {isRestaurant ? "Table Order" : "Current Order"}
          </h2>
          <span className="text-[11px] font-bold text-zinc-600">
            {items.length} {isRestaurant || isClothing
              ? `item${items.length !== 1 ? "s" : ""}`
              : `cut${items.length !== 1 ? "s" : ""}`}
            {isRestaurant
              ? (totalWeighedKg > 0 ? ` • ${formatWeight(totalWeighedKg)}` : "")
              : isClothing
              ? ""
              : ` • ${formatWeight(totalWeight)}`}
          </span>
        </div>

        {/* Action badges: Held Orders, Hold Current, Clear */}
        <div className="flex items-center gap-1.5">
          {onOpenHeldOrders && (
            <button
              type="button"
              onClick={onOpenHeldOrders}
              title="View held & parked bills"
              className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs ${heldCount > 0
                  ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200"
                }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Held</span>
              {heldCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-black">
                  {heldCount}
                </span>
              )}
            </button>
          )}

          {!(activeBill && !hasUnsavedOrder) && (
            <>
              {items.length > 0 && onHoldOrder && (
                <button
                  type="button"
                  onClick={onHoldOrder}
                  title="Save/Hold this order and create a new bill"
                  className="h-7 px-2 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-amber-100 text-zinc-700 hover:text-amber-900 border border-zinc-200 flex items-center gap-1 transition-colors"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hold</span>
                </button>
              )}

              {items.length > 0 && onNewBill && (
                <button
                  type="button"
                  onClick={onNewBill}
                  title="Start a new blank bill"
                  className="h-7 px-2 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-zinc-600" />
                  <span>New</span>
                </button>
              )}

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearClick}
                  title="Clear cart"
                  className="h-7 px-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Customer Selector & Unpaid Bills Pill */}
      <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 shrink-0 space-y-1.5 w-full min-w-0 overflow-visible relative z-20">
        {activeBill && (
          <div className="p-2.5 bg-white border border-zinc-200 rounded-xl space-y-2 shadow-2xs w-full">
            {/* Row 1: Table & Waiter Info (never crowded, never overlaps) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                  {activeBill.table_number}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-xs sm:text-sm text-zinc-950 whitespace-nowrap">Table {activeBill.table_number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-zinc-900 font-mono font-bold whitespace-nowrap">
                    {activeBill.id === 0 ? "New Bill" : activeBill.bill_number}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-600 font-semibold truncate text-right">
                <span className="font-bold text-zinc-900">{activeBill.waiter_name || "Staff"}{activeBill.waiter_pin ? ` (#${activeBill.waiter_pin})` : ""}</span>
              </div>
            </div>

            {/* Row 2: Generous Long & Thick Touch Buttons — No Text Overlap */}
            <div className="grid grid-cols-3 gap-2">
              {onManageTableBills && (
                <button
                  type="button"
                  onClick={onManageTableBills}
                  disabled={isSavingOrder}
                  className={`col-span-2 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-black text-white transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${
                    isSavingOrder
                      ? "bg-zinc-400 cursor-not-allowed opacity-60 pointer-events-none"
                      : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                  }`}
                  title={`View all bills or create a new bill on Table ${activeBill.table_number}`}
                >
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={3} />
                  <span>New Bill</span>
                  {activeTable?.active_bills && activeTable.active_bills.length > 1 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-800 text-white text-[10px] font-black">
                      {activeTable.active_bills.length}
                    </span>
                  )}
                </button>
              )}

              {onCloseActiveBillSession && (
                <button
                  type="button"
                  onClick={handleExitSession}
                  disabled={isSavingOrder}
                  className={`col-span-1 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-black text-white transition-all shadow-xs active:scale-95 flex items-center justify-center ${
                    isSavingOrder
                      ? "bg-zinc-400 cursor-not-allowed opacity-60 pointer-events-none"
                      : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                  }`}
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
          <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
            <span className="text-xs text-zinc-800 shrink-0 font-bold">Customer:</span>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              {selectedCustomer ? (
                <div className="flex items-center gap-1 min-w-0 max-w-[140px] xs:max-w-[180px] bg-white border border-emerald-400 px-2 py-0.5 rounded-lg text-xs shadow-2xs">
                  <span className="font-bold text-emerald-900 truncate" title={selectedCustomer.name}>
                    {selectedCustomer.name}
                  </span>
                  {onEditCustomer && !isWaiter && (
                    <button
                      type="button"
                      onClick={() => onEditCustomer(selectedCustomer)}
                      title="Edit customer details"
                      className="px-1 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-black shrink-0"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    title="Remove customer"
                    className="text-zinc-400 hover:text-red-600 p-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="h-7 px-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-2xs active:scale-95 shrink-0"
              >
                <span>{selectedCustomer ? "Change" : "Walk-in"}</span>
                <UserPlus className="w-3 h-3" />
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
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${!selectedCustomer ? "bg-green-50 text-green-800 border border-green-200" : "text-zinc-700 hover:bg-zinc-50"
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
                        className={`w-full px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-1.5 ${selectedCustomer?.id === c.id
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-zinc-50/50">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <span className="text-3xl mb-2 opacity-40">{isRestaurant ? "🍽️" : isClothing ? "👗" : "🥩"}</span>
            <p className="text-sm font-medium text-zinc-500">Cart is empty</p>
            <p className="text-xs text-zinc-400 mt-1">
              {isRestaurant
                ? "Select a table and open a bill, then add menu items."
                : isClothing
                ? "Click a product to add it to this sale."
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
              canDiscount={!isWaiter}
            />
          ))
        )}
      </div>

      {/* Totals + Actions */}
      <div className="px-3.5 py-2.5 border-t border-zinc-200 bg-white shrink-0 space-y-2 shadow-2xs">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-zinc-700 font-bold text-sm sm:text-base">
            <span>
              Subtotal
              {isRestaurant
                ? (totalWeighedKg > 0 ? ` (${formatWeight(totalWeighedKg)})` : ` (${items.length} ${items.length !== 1 ? "items" : "item"})`)
                : isClothing
                ? ` (${items.length} ${items.length !== 1 ? "items" : "item"})`
                : ` (${formatWeight(totalWeight)})`}
              :
            </span>
            <span className="font-black text-zinc-950 tabular-nums text-base sm:text-lg">{formatCurrency(subtotal)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-amber-700 font-bold text-sm">
              <span>Discount:</span>
              <span className="tabular-nums font-black">-{formatCurrency(totalDiscount)}</span>
            </div>
          )}

          <div className="pt-2.5 border-t-2 border-zinc-200 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-zinc-900 uppercase tracking-wide">Total</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
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
                  ? "Saving Order to Kitchen..."
                  : `Save Order & Send to Kitchen (${formatCurrency(total)})`}
              </span>
            </button>
            <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Must click Save Order first before checking out this bill.</span>
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

    {/* Full-screen customer picker — opens when Walk-in button clicked */}
    {showCustomerModal && (
      <CustomerPickerModal
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelect={onSelectCustomer}
        onClose={() => setShowCustomerModal(false)}
        onOpenAddCustomer={onOpenAddCustomer}
        isWaiter={isWaiter}
      />
    )}
    </>
  );
}
