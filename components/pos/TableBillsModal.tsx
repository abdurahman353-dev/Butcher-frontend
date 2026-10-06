"use client";

import React, { useState, useEffect } from "react";
import { RestaurantTable, RestaurantBill } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { restaurantService } from "@/services/restaurant.service";
import { useAuth } from "@/hooks/useAuth";
import {
  X,
  Plus,
  Receipt,
  User,
  Clock,
  Printer,
  Ban,
  CheckCircle,
  Users,
  ChefHat,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Delete,
  Loader2,
} from "lucide-react";

interface TableBillsModalProps {
  table: RestaurantTable | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBillForOrdering: (table: RestaurantTable, bill: RestaurantBill) => void;
  onCreateNewBill: (table: RestaurantTable, payload: {
    waiter_name?: string;
    waiter_pin?: string;
    guest_count?: number;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
  }) => Promise<void>;
  onPrintCustomerBill: (bill: RestaurantBill) => Promise<void>;
  onSettleBill: (bill: RestaurantBill) => void;
  onCancelBill: (bill: RestaurantBill) => Promise<void>;
  onPrintKitchenSlip: (bill: RestaurantBill, productId?: number) => void;
}

export function TableBillsModal({
  table,
  isOpen,
  onClose,
  onOpenBillForOrdering,
  onCreateNewBill,
  onPrintCustomerBill,
  onSettleBill,
  onCancelBill,
  onPrintKitchenSlip,
}: TableBillsModalProps) {
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [waiterPin, setWaiterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [verifiedStaff, setVerifiedStaff] = useState<{ id: number; name: string; role: string } | null>(null);
  const [pinFeedback, setPinFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showNumpad, setShowNumpad] = useState(false);
  const [showOptionalPin, setShowOptionalPin] = useState(false);

  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBills, setExpandedBills] = useState<Record<number, boolean>>({});

  if (!isOpen || !table) return null;

  const activeBills = (table.active_bills || []).filter(
    (b) => (b.items && b.items.length > 0) || b.total > 0 || b.status === "printed"
  );

  const filteredBills = activeBills.filter((bill) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      bill.bill_number.toLowerCase().includes(q) ||
      (bill.waiter_name && bill.waiter_name.toLowerCase().includes(q)) ||
      (bill.customer_name && bill.customer_name.toLowerCase().includes(q)) ||
      (bill.items && bill.items.some((it) => it.product_name.toLowerCase().includes(q)))
    );
  });

  const handlePinInput = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setWaiterPin(clean);

    if (clean.length < 4) {
      setVerifiedStaff(null);
      setPinFeedback(null);
      return;
    }

    if (clean.length === 4) {
      setIsVerifyingPin(true);
      setPinFeedback(null);
      try {
        const res = await restaurantService.verifyWaiterPin(clean);
        if (res.verified && res.user) {
          setVerifiedStaff(res.user);
          setPinFeedback({
            type: "success",
            text: `Identified Server: ${res.user.name}`,
          });
        } else {
          setVerifiedStaff(null);
          setPinFeedback({
            type: "error",
            text: res.message || `No waiter found matching PIN ${clean}`,
          });
        }
      } catch {
        setVerifiedStaff(null);
        setPinFeedback({
          type: "error",
          text: `Could not verify PIN ${clean}. Please try again.`,
        });
      } finally {
        setIsVerifyingPin(false);
      }
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (waiterPin.length < 4) {
      handlePinInput(waiterPin + digit);
    }
  };

  const handleNumpadBackspace = () => {
    if (waiterPin.length > 0) {
      handlePinInput(waiterPin.slice(0, -1));
    }
  };

  const handleNumpadClear = () => {
    handlePinInput("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Waiters are required to enter their 4-digit PIN
    if (isWaiter && (!verifiedStaff || waiterPin.length !== 4)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const waiterNameToUse = verifiedStaff?.name || (waiterPin ? `Server #${waiterPin}` : user?.name || "Staff");
      await onCreateNewBill(table, {
        waiter_pin: waiterPin || undefined,
        waiter_name: waiterNameToUse,
        guest_count: Number(guestCount) || 1,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: billNotes.trim() || undefined,
      });
      setIsCreatingNew(false);
      setWaiterPin("");
      setVerifiedStaff(null);
      setPinFeedback(null);
      setShowNumpad(false);
      setShowOptionalPin(false);
      setCustomerName("");
      setCustomerPhone("");
      setBillNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setWaiterPin("");
    setVerifiedStaff(null);
    setPinFeedback(null);
    setShowNumpad(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Modal Header ─────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Table number badge — matches image 1 dark pill */}
            <div className="w-11 h-11 rounded-xl bg-zinc-900 text-white font-mono font-black text-lg flex items-center justify-center shadow-sm shrink-0">
              {table.table_number}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-900 tracking-tight">{table.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    table.status === "red"
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : table.status === "yellow"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  {table.status === "red"
                    ? "Order Active"
                    : table.status === "yellow"
                    ? "Bill Printed"
                    : "Empty Table"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Zone: <strong className="text-zinc-700">{table.zone}</strong>
                <span className="mx-1.5 text-zinc-300">•</span>
                Capacity: <strong className="text-zinc-700">{table.capacity} guests</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-xl transition-all active:scale-95 shadow-2xs"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* ── Modal Content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Section header */}
          {/* Section header: Responsive with fast bill search & + New Bill button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 shrink-0">
              <Receipt className="w-3.5 h-3.5 text-zinc-400" />
              Active Bills on this Table ({filteredBills.length}{filteredBills.length !== activeBills.length ? ` / ${activeBills.length}` : ""})
            </h4>

            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              {activeBills.length > 0 && !isCreatingNew && (
                <div className="relative flex-1 sm:max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bill number (e.g. B-2-012)..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border-2 border-emerald-500 hover:border-emerald-600 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 outline-none transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Bill</span>
                </button>
              )}
            </div>
          </div>

          {/* ── New Bill Form — styled like a bill card (matches image 1) ── */}
          {isCreatingNew && (
            <form onSubmit={handleCreateSubmit} className="bg-white border-2 border-emerald-400 rounded-2xl overflow-hidden shadow-sm">

              {/* ── Card Header row (matches bill card top bar) ── */}
              <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-3 border-b border-zinc-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bill number style pill */}
                  <span className="px-3 py-1 bg-zinc-900 text-white text-xs font-black rounded-full tracking-wide">
                    NEW BILL
                  </span>
                  {/* Status badge — matches BILL PRINTED (YELLOW) style */}
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black rounded-lg uppercase tracking-wide">
                    Open New Bill on {table.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="h-7 px-3 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-xs font-bold transition-all shrink-0"
                >
                  Cancel
                </button>
              </div>

              {/* ── PIN Verification body ── */}
              <div className="px-4 py-4 space-y-3">
                {/* ── Server/Waiter Verification ── */}
                {isWaiter || showOptionalPin ? (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {isWaiter ? "Enter Your 4-Digit Waiter PIN" : "Assign Waiter PIN (Optional)"}
                          {isWaiter && <span className="text-rose-500 ml-1">*</span>}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        {!isWaiter && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowOptionalPin(false);
                              setWaiterPin("");
                              setVerifiedStaff(null);
                              setPinFeedback(null);
                            }}
                            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800"
                          >
                            Use my Cashier name
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNumpad(!showNumpad)}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            showNumpad
                              ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800"
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{showNumpad ? "Hide Numpad" : "On-Screen Numpad"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-44">
                        <input
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          autoFocus
                          placeholder="••••"
                          value={waiterPin}
                          onChange={(e) => handlePinInput(e.target.value)}
                          className="w-full h-11 px-3 text-center font-mono text-xl tracking-[0.4em] font-black bg-white border-2 border-zinc-200 focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none transition-all shadow-inner"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400 hover:text-zinc-700 uppercase"
                        >
                          {showPin ? "Hide" : "Show"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = waiterPin.length > idx;
                          const isCurrent = waiterPin.length === idx;
                          return (
                            <div
                              key={idx}
                              className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-black transition-all ${
                                isFilled
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs scale-105"
                                  : isCurrent
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-300"
                              }`}
                            >
                              {isFilled ? (showPin ? waiterPin[idx] : "●") : ""}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        {isVerifyingPin ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            <span>Checking PIN...</span>
                          </div>
                        ) : pinFeedback ? (
                          <div
                            className={`flex items-start gap-1.5 p-2 rounded-lg text-xs font-medium ${
                              pinFeedback.type === "success"
                                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                : pinFeedback.type === "error"
                                ? "bg-rose-50 text-rose-900 border border-rose-200"
                                : "bg-zinc-100 text-zinc-800"
                            }`}
                          >
                            {pinFeedback.type === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div className="leading-tight">
                              <span className="font-semibold">{pinFeedback.text}</span>
                              {verifiedStaff && (
                                <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                                  ✓ Tagged to server: {verifiedStaff.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400 font-medium">
                            {isWaiter ? "Enter your 4-digit PIN to post this order" : "Optional: Tag this order to a waiter"}
                          </div>
                        )}
                      </div>
                    </div>

                    {showNumpad && (
                      <div className="pt-2 border-t border-zinc-100 animate-in fade-in duration-100">
                        <div className="max-w-[210px] mx-auto grid grid-cols-3 gap-1.5">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleNumpadPress(num)}
                              className="h-9 rounded-lg bg-zinc-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white font-mono text-base font-bold text-zinc-800 transition-colors shadow-2xs"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={handleNumpadClear}
                            className="h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNumpadPress("0")}
                            className="h-9 rounded-lg bg-zinc-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white font-mono text-base font-bold text-zinc-800 transition-colors shadow-2xs"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={handleNumpadBackspace}
                            className="h-9 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold flex items-center justify-center transition-colors"
                            title="Backspace"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Admin/Cashier: NO PIN REQUIRED */
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {user?.name?.charAt(0) ?? "C"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          Posting as: {user?.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          {user?.role === "admin" ? "Super Admin" : "Cashier"} — No PIN required
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOptionalPin(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors shrink-0"
                    >
                      Assign Waiter PIN
                    </button>
                  </div>
                )}
              </div>

              {/* ── Card Footer — matches bill card action buttons (image 1) ── */}
              <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isWaiter && (!verifiedStaff || waiterPin.length !== 4))}
                  className="h-9 px-5 bg-zinc-900 hover:bg-zinc-800 active:bg-black active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>
                    {isSubmitting
                      ? "Opening..."
                      : isWaiter && (!verifiedStaff || waiterPin.length !== 4)
                      ? "Enter Your Waiter PIN"
                      : verifiedStaff
                      ? `Open Bill (${verifiedStaff.name})`
                      : "Open Bill"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* ── Empty State ──────────────────────────────── */}
          {activeBills.length === 0 && !isCreatingNew ? (
            <div className="p-8 text-center bg-zinc-50 border border-dashed border-zinc-300 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-zinc-300" />
              </div>
              <p className="text-sm font-bold text-zinc-700">No active bills on this table</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                This table is currently grey (empty). Click below to open a bill and start adding products!
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="mt-4 h-9 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Open First Bill</span>
              </button>
            </div>
          ) : filteredBills.length === 0 && !isCreatingNew ? (
            <div className="p-6 text-center bg-zinc-50 border border-dashed border-zinc-300 rounded-xl">
              <p className="text-xs font-bold text-zinc-700">No bills match "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-emerald-700 font-bold hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBills.map((bill) => {
                const isPrinted = bill.status === "printed";
                const itemsCount = bill.items?.length || 0;

                return (
                  <div
                    key={bill.id}
                    className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                      isPrinted
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-white border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {/* Bill Header Info: Bill No, Status, Time, Waiter */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm sm:text-base font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                            {bill.bill_number}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              isPrinted
                                ? "bg-amber-400 text-amber-950"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {isPrinted ? "Bill Printed (Yellow)" : "Order Active / Unprinted (Red)"}
                          </span>
                        </div>

                        {/* Customer & Guest info */}
                        <div className="text-xs text-zinc-600 mt-1">
                          {bill.customer_name ? (
                            <span>Customer: <strong className="text-zinc-800">{bill.customer_name}</strong></span>
                          ) : (
                            <span className="text-zinc-500">Walk-in Table Guest</span>
                          )}
                          <span className="mx-1.5">•</span>
                          <span>{bill.guest_count} {bill.guest_count === 1 ? "Guest" : "Guests"}</span>
                        </div>
                      </div>

                      {/* Bill Total Amount */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Total Bill</div>
                        <div className="text-lg font-black text-zinc-900 tracking-tight">
                          {formatCurrency(bill.total)}
                        </div>
                      </div>
                    </div>

                    {/* Meta bar: Waiter Name, Cashier, Time posted, Date */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-zinc-100/70 rounded-xl text-[11px] text-zinc-600">
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Waiter</span>
                        <strong className="text-zinc-800 truncate block">
                          {bill.waiter_name || "Staff"}
                          {bill.waiter_pin ? ` (#${bill.waiter_pin})` : ""}
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Cashier</span>
                        <strong className="text-zinc-800 truncate block">{bill.cashier_name || "Admin"}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Time Posted</span>
                        <strong className="text-zinc-800 block">{formatDateTime(bill.created_at)}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Items</span>
                        <strong className="text-zinc-800 block">
                          {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </strong>
                      </div>
                    </div>

                    {/* Items on this bill - collapsible with darker text */}
                    {itemsCount > 0 && (() => {
                      const isExpanded = expandedBills[bill.id] ?? (itemsCount <= 2);
                      const hasManyItems = itemsCount > 2;
                      const displayedItems = isExpanded ? bill.items : bill.items.slice(0, 2);

                      return (
                        <div className="bg-zinc-50/90 p-3 rounded-2xl border border-zinc-200/90 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[11px] uppercase tracking-wider text-zinc-800">
                              Items on this bill ({itemsCount}):
                            </span>
                            {hasManyItems && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedBills((prev) => ({
                                    ...prev,
                                    [bill.id]: !isExpanded,
                                  }))
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 transition-all active:scale-95 cursor-pointer"
                              >
                                <span>{isExpanded ? "Collapse" : `+${itemsCount - 2} more (Expand)`}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5 divide-y divide-zinc-200/60">
                            {displayedItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                  <span className="truncate text-zinc-950 font-bold text-xs sm:text-[13px]">
                                    {item.weight}x {item.product_name}
                                    {item.notes && (
                                      <span className="text-zinc-600 font-medium text-[11px] ml-1.5">
                                        ({item.notes})
                                      </span>
                                    )}
                                  </span>
                                  {/* Item-level reprint if multiple items & bill was kitchen-printed (Cashiers & Admins only) */}
                                  {bill.kitchen_printed_at && !isWaiter && (
                                    <button
                                      type="button"
                                      onClick={() => onPrintKitchenSlip(bill, item.product_id)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition-colors text-[10px] font-bold flex items-center gap-1 shrink-0 shadow-xs"
                                      title={`Reprint slip for ${item.product_name}`}
                                    >
                                      <ChefHat className="w-3 h-3" />
                                      <span className="font-bold">Reprint</span>
                                    </button>
                                  )}
                                </div>
                                <span className="font-extrabold text-zinc-950 text-xs sm:text-[13px] shrink-0">
                                  {formatCurrency(item.line_total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Buttons as specified by user:
                        - Open Bill (post products)
                        - Print Bill (customer pre-bill)
                        - Print Kitchen Slip
                        - Settle / Checkout
                        - Cancel
                    */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        {/* Cancel button — admin & cashier only */}
                        {!isWaiter && (
                          <button
                            type="button"
                            onClick={() => onCancelBill(bill)}
                            className="px-2.5 py-1.5 text-xs bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300 border border-rose-300 rounded-xl transition-colors font-bold flex items-center gap-1"
                            title="Cancel this bill"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}

                        {/* Print Kitchen Slip (KOT) — Only Cashiers & Admins can reprint, Waiters blocked */}
                        {bill.kitchen_printed_at && !isWaiter && (
                          <button
                            type="button"
                            onClick={() => onPrintKitchenSlip(bill)}
                            className="px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition-colors font-bold flex items-center gap-1 shadow-xs"
                            title="Re-print Kitchen Slip"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Kitchen Slip</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Print Bill button */}
                        <button
                          type="button"
                          disabled={itemsCount === 0}
                          onClick={() => onPrintCustomerBill(bill)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 ${
                            isPrinted
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300"
                              : "bg-amber-500 hover:bg-amber-600 text-white"
                          }`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isPrinted ? "Re-print Bill" : "Print Bill"}</span>
                        </button>

                        {/* Open Bill to post products */}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBillForOrdering(table, bill);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                        >
                          <span>Open Bill</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Settle / Checkout button — admin & cashier only, available for ALL bills */}
                        {!isWaiter && itemsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onSettleBill(bill);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Checkout</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Modal Footer ─────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-medium">
            Table {table.table_number} • {table.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 text-xs font-black text-white transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
