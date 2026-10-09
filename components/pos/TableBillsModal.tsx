"use client";

import React, { useState, useEffect } from "react";
import { RestaurantTable, RestaurantBill, Customer } from "@/types";
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
  Phone,
  MapPin,
  Check,
  Edit,
  Split,
} from "lucide-react";
import { SplitBillModal } from "./SplitBillModal";

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
    customer_address?: string;
    customer_id?: number;
    notes?: string;
  }) => Promise<void>;
  onPrintCustomerBill: (bill: RestaurantBill) => Promise<void>;
  onSettleBill: (bill: RestaurantBill) => void;
  onCancelBill: (bill: RestaurantBill) => Promise<void>;
  onPrintKitchenSlip: (bill: RestaurantBill, productId?: number) => void;
  customers?: Customer[];
  onBillUpdated?: (updatedBill: RestaurantBill) => void;
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
  customers = [],
  onBillUpdated,
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

  // On-screen Waiter PIN Numpad Modal state (for opening bills)
  const [pinPromptBill, setPinPromptBill] = useState<RestaurantBill | null>(null);
  const [openBillPin, setOpenBillPin] = useState("");
  const [isOpenBillVerifying, setIsOpenBillVerifying] = useState(false);
  const [openBillFeedback, setOpenBillFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBills, setExpandedBills] = useState<Record<number, boolean>>({});

  // ── Customer Change / Edit State for Existing Bills ──
  const [editingCustomerBill, setEditingCustomerBill] = useState<RestaurantBill | null>(null);
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editCustAddress, setEditCustAddress] = useState("");
  const [editSelectedCustId, setEditSelectedCustId] = useState<number | null>(null);
  const [custSearchQuery, setCustSearchQuery] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerUpdateMessage, setCustomerUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleStartEditCustomer = (bill: RestaurantBill) => {
    setEditingCustomerBill(bill);
    setEditCustName(bill.customer_name || "");
    setEditCustPhone(bill.customer_phone || "");
    setEditCustAddress(bill.customer_address || bill.customer?.address || "");
    setEditSelectedCustId(bill.customer_id || null);
    setCustSearchQuery("");
    setCustomerUpdateMessage(null);
  };

  const handleSelectExistingCustomer = (c: Customer) => {
    setEditSelectedCustId(c.id);
    setEditCustName(c.name);
    setEditCustPhone(c.phone || "");
    setEditCustAddress(c.address || "");
    setCustSearchQuery("");
  };

  const handleClearCustomer = () => {
    setEditSelectedCustId(null);
    setEditCustName("");
    setEditCustPhone("");
    setEditCustAddress("");
    setCustSearchQuery("");
  };

  const handleSaveCustomerChange = async () => {
    if (!editingCustomerBill) return;
    setIsSavingCustomer(true);
    setCustomerUpdateMessage(null);
    try {
      const res = await restaurantService.updateBillCustomer(editingCustomerBill.id, {
        customer_id: editSelectedCustId,
        customer_name: editCustName.trim() || undefined,
        customer_phone: editCustPhone.trim() || undefined,
        customer_address: editCustAddress.trim() || undefined,
      });

      const updated = res.data;

      // 1. Immediately update internal billsList so the screen re-renders right now
      setBillsList((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );

      // 2. Notify parent (pos/page.tsx) so tables and activeBill update
      if (onBillUpdated) {
        onBillUpdated(updated);
      }

      // 3. Mutate table.active_bills as well
      if (table && table.active_bills) {
        table.active_bills = table.active_bills.map((b) => (b.id === updated.id ? { ...b, ...updated } : b));
      }

      setCustomerUpdateMessage({ type: "success", text: "Customer details updated successfully!" });
      setTimeout(() => {
        setEditingCustomerBill(null);
        setCustomerUpdateMessage(null);
      }, 350);
    } catch (err: any) {
      setCustomerUpdateMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to update customer.",
      });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const [billsList, setBillsList] = useState<RestaurantBill[]>(table?.active_bills || []);
  const [splittingBill, setSplittingBill] = useState<RestaurantBill | null>(null);

  const handleSplitSuccess = (sourceBill: RestaurantBill, targetBill: RestaurantBill) => {
    // 1. Update internal bills list: update source bill, insert target bill
    setBillsList((prev) => {
      const updated = prev.map((b) => (b.id === sourceBill.id ? sourceBill : b));
      if (!updated.some((b) => b.id === targetBill.id)) {
        return [targetBill, ...updated];
      }
      return updated.map((b) => (b.id === targetBill.id ? targetBill : b));
    });

    // 2. Notify parent (pos/page.tsx) so tables and activeBill update
    if (onBillUpdated) {
      onBillUpdated(sourceBill);
      onBillUpdated(targetBill);
    }

    // 3. Mutate table object active bills count & list
    if (table && table.active_bills) {
      const updated = table.active_bills.map((b) => (b.id === sourceBill.id ? sourceBill : b));
      if (!updated.some((b) => b.id === targetBill.id)) {
        table.active_bills = [targetBill, ...updated];
        table.active_bills_count = (table.active_bills_count || 0) + 1;
      } else {
        table.active_bills = updated.map((b) => (b.id === targetBill.id ? targetBill : b));
      }
    }
  };

  useEffect(() => {
    setBillsList(table?.active_bills || []);
  }, [table?.active_bills, table]);

  const currentBills = billsList.length > 0 || !table?.active_bills?.length
    ? billsList
    : (table?.active_bills || []);

  const activeBills = currentBills.filter(
    (b) => b.status === "open" || b.status === "printed"
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
    if (!table) return;
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

  // Helper to determine if a bill was posted by a waiter (not by cashier or superadmin)
  const isBillByWaiter = (bill: RestaurantBill) => {
    // 1. If waiter PIN is recorded, it's definitely posted by a waiter
    if (bill.waiter_pin && bill.waiter_pin.trim().length > 0) return true;

    const wName = (bill.waiter_name || "").trim().toLowerCase();
    const cName = (bill.cashier_name || "").trim().toLowerCase();

    // If no waiter name, or placeholder cashier/admin/staff label -> not a waiter bill
    if (!wName || ["staff", "cashier", "admin", "superadmin", "administrator"].includes(wName)) {
      return false;
    }

    // If waiter name is identical to cashier name with no separate waiter PIN -> posted directly by cashier
    if (cName && wName === cName) {
      return false;
    }

    // Waiter name is distinct from cashier name -> posted by a waiter
    return true;
  };

  // Determine if the current user can open a given bill
  const canOpenBill = (bill: RestaurantBill): "free" | "needs-pin" | "blocked" => {
    // Cashier and Superadmin can open ANY bill freely
    if (!isWaiter) return "free";
    // If the bill was posted by a waiter -> show Open Bill requiring that waiter's PIN
    if (isBillByWaiter(bill)) return "needs-pin";
    // Bill posted by Cashier or Superadmin -> strictly BLOCKED in waiter's account
    return "blocked";
  };

  // ── On-Screen Numpad PIN Verification for Opening Bill ──────────────
  const handleOpenBillPinInput = async (pinValue: string, targetBill: RestaurantBill) => {
    const clean = pinValue.replace(/\D/g, "").slice(0, 4);
    setOpenBillPin(clean);
    setOpenBillFeedback(null);

    if (clean.length < 4) return;

    setIsOpenBillVerifying(true);
    try {
      const res = await restaurantService.verifyWaiterPin(clean);
      if (res.verified && res.user) {
        // Verify that the person entering the PIN is the exact waiter who posted this bill
        const billOwner = (targetBill.waiter_name || "").trim().toLowerCase();
        const verifiedName = (res.user.name || "").trim().toLowerCase();
        const isOwner = Boolean(billOwner && (verifiedName === billOwner || (targetBill.waiter_id && res.user.id === targetBill.waiter_id)));

        if (isOwner) {
          setOpenBillFeedback({ type: "success", text: `✓ Verified: ${res.user.name}` });
          setTimeout(() => {
            if (!table) return;
            const b = targetBill;
            setPinPromptBill(null);
            setOpenBillPin("");
            setOpenBillFeedback(null);
            onOpenBillForOrdering(table, b);
            onClose();
          }, 300);
        } else {
          setOpenBillFeedback({
            type: "error",
            text: `Not your bill! This bill belongs to ${targetBill.waiter_name || "another waiter"}.`,
          });
          setOpenBillPin("");
        }
      } else {
        setOpenBillFeedback({
          type: "error",
          text: "Incorrect PIN. Please try again.",
        });
        setOpenBillPin("");
      }
    } catch {
      setOpenBillFeedback({
        type: "error",
        text: "Could not verify PIN. Please try again.",
      });
      setOpenBillPin("");
    } finally {
      setIsOpenBillVerifying(false);
    }
  };

  const handleOpenBillNumpadPress = (digit: string) => {
    if (!pinPromptBill || isOpenBillVerifying) return;
    if (openBillPin.length < 4) {
      handleOpenBillPinInput(openBillPin + digit, pinPromptBill);
    }
  };

  const handleOpenBillNumpadBackspace = () => {
    if (!pinPromptBill || isOpenBillVerifying) return;
    if (openBillPin.length > 0) {
      const updated = openBillPin.slice(0, -1);
      setOpenBillPin(updated);
      setOpenBillFeedback(null);
    }
  };

  const handleOpenBillNumpadClear = () => {
    if (!pinPromptBill || isOpenBillVerifying) return;
    setOpenBillPin("");
    setOpenBillFeedback(null);
  };

  // Keyboard listener for on-screen PIN numpad modal
  useEffect(() => {
    if (!pinPromptBill) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleOpenBillNumpadPress(e.key);
      } else if (e.key === "Backspace") {
        handleOpenBillNumpadBackspace();
      } else if (e.key === "Escape") {
        setPinPromptBill(null);
        setOpenBillPin("");
        setOpenBillFeedback(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinPromptBill, openBillPin, isOpenBillVerifying]);

  if (!isOpen || !table) return null;

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
                          {user?.role === "admin" ? "Super Admin" : user?.role === "waiter" ? "Waiter" : "Cashier"} — No PIN required
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

                        {/* Customer, Phone, Address - darker text */}
                        <div className="flex items-center gap-2 flex-wrap text-xs mt-1.5 font-bold">
                          <span className="text-zinc-800 font-extrabold">Customer:</span>
                          <strong className="text-zinc-950 font-black">
                            {bill.customer_name || "Walk-in Table Guest"}
                          </strong>
                          {bill.customer_phone && (
                            <span className="text-zinc-900 font-extrabold flex items-center gap-1">
                              <span className="text-zinc-400">•</span>
                              <span>📞 {bill.customer_phone}</span>
                            </span>
                          )}
                          {(bill.customer_address || bill.customer?.address) && (
                            <span className="text-zinc-900 font-extrabold flex items-center gap-1">
                              <span className="text-zinc-400">•</span>
                              <span>📍 {bill.customer_address || bill.customer?.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bill Total Amount */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-extrabold text-zinc-600">Total Bill</div>
                        <div className="text-lg font-black text-zinc-950 tracking-tight">
                          {formatCurrency(bill.total)}
                        </div>
                      </div>
                    </div>

                    {/* Meta bar — always shows who posted the bill - rich dark high-contrast */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-zinc-100 border border-zinc-200/90 rounded-xl text-[11px]">
                      {/* Posted By — always visible in col 1 */}
                      <div>
                        <span className="text-zinc-700 block text-[10px] font-extrabold uppercase tracking-wider mb-0.5">Posted By</span>
                        {isBillByWaiter(bill) ? (
                          // Bill was opened by a waiter
                          <strong className="text-zinc-950 font-black truncate block flex items-center gap-1 text-xs">
                            {bill.waiter_name || "Waiter"}
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-900 uppercase tracking-wider ml-1">Waiter</span>
                          </strong>
                        ) : (
                          // Bill was opened directly by cashier/admin
                          <strong className="text-zinc-950 font-black truncate block flex items-center gap-1 text-xs">
                            {bill.cashier_name || "Cashier"}
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-900 uppercase tracking-wider ml-1">Cashier</span>
                          </strong>
                        )}
                      </div>

                      {/* Col 2 — Customer */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-zinc-700 block text-[10px] font-extrabold uppercase tracking-wider">Customer</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCustomer(bill);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black flex items-center gap-0.5 shadow-xs cursor-pointer"
                            title="Edit or select new customer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                        <strong className="text-zinc-950 font-black truncate block text-xs">
                          {bill.customer_name || "Walk-in Guest"}
                        </strong>
                        {bill.customer_phone && (
                          <span className="text-zinc-900 font-extrabold text-[11px] block truncate">
                            📞 {bill.customer_phone}
                          </span>
                        )}
                        {(bill.customer_address || bill.customer?.address) && (
                          <span className="text-zinc-900 font-extrabold text-[10px] block truncate mt-0.5">
                            📍 {bill.customer_address || bill.customer?.address}
                          </span>
                        )}
                      </div>

                      {/* Col 3 — Time Posted */}
                      <div>
                        <span className="text-zinc-700 block text-[10px] font-extrabold uppercase tracking-wider mb-0.5">Time Posted</span>
                        <strong className="text-zinc-950 font-black block text-xs">{formatDateTime(bill.created_at)}</strong>
                      </div>

                      {/* Col 4 — Items */}
                      <div>
                        <span className="text-zinc-700 block text-[10px] font-extrabold uppercase tracking-wider mb-0.5">Items</span>
                        <strong className="text-zinc-950 font-black block text-xs">{itemsCount} {itemsCount === 1 ? "item" : "items"}</strong>
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

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Divide / Split Bill button */}
                        {itemsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setSplittingBill(bill)}
                            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl transition-all font-black flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Divide this bill between multiple guests"
                          >
                            <Split className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Divide Bill</span>
                          </button>
                        )}

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

                        {/* Open Bill — access-controlled */}
                        {(() => {
                          const access = canOpenBill(bill);

                          if (access === "blocked") {
                            return (
                              <div
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-400 rounded-xl text-xs font-bold border border-zinc-200"
                                title="This bill was posted by Cashier and cannot be modified by Waiter"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Not Your Bill</span>
                              </div>
                            );
                          }

                          if (access === "needs-pin") {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setPinPromptBill(bill);
                                  setOpenBillPin("");
                                  setOpenBillFeedback(null);
                                }}
                                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                              >
                                <span>Open Bill</span>
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            );
                          }

                          // free — cashier/admin
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenBillForOrdering(table, bill);
                                onClose();
                              }}
                              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              <span>Open Bill</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          );
                        })()}

                        {/* Settle / Checkout button — admin & cashier only, available for ALL bills */}
                        {!isWaiter && itemsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onSettleBill(bill);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
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
            className="h-8 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 text-xs font-black text-white transition-all shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Waiter PIN On-Screen Numpad Modal for Opening Bill ── */}
      {pinPromptBill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                  {table.table_number}
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 leading-tight">Enter Waiter PIN</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    To open <span className="font-bold text-zinc-800">{pinPromptBill.bill_number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinPromptBill(null);
                  setOpenBillPin("");
                  setOpenBillFeedback(null);
                }}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill owner tag */}
            <div className="px-5 pt-3 pb-1 flex items-center justify-center gap-1.5 text-xs text-zinc-600">
              <span>Bill posted by:</span>
              <strong className="text-zinc-900 font-black">{pinPromptBill.waiter_name || "Waiter"}</strong>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wider">
                Waiter
              </span>
            </div>

            {/* PIN Display Dots */}
            <div className="px-5 py-3 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = idx < openBillPin.length;
                  const isCurrent = idx === openBillPin.length && !isOpenBillVerifying;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-13 rounded-2xl border-2 flex items-center justify-center text-2xl font-black font-mono transition-all shadow-2xs ${
                        isFilled
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-sm scale-102"
                          : isCurrent
                          ? "border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10 text-emerald-600"
                          : "border-zinc-200 bg-zinc-50 text-zinc-300"
                      }`}
                    >
                      {isFilled ? "●" : ""}
                    </div>
                  );
                })}
              </div>

              {/* Feedback message */}
              <div className="min-h-6 flex items-center justify-center text-center px-2">
                {isOpenBillVerifying ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying PIN...</span>
                  </div>
                ) : openBillFeedback ? (
                  <div
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                      openBillFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {openBillFeedback.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span>{openBillFeedback.text}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-400 font-medium">Tap your 4-digit PIN below</span>
                )}
              </div>
            </div>

            {/* On-Screen Touch Numpad */}
            <div className="px-5 pb-5 pt-1">
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isOpenBillVerifying}
                    onClick={() => handleOpenBillNumpadPress(num)}
                    className="h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-900 active:text-white active:scale-95 font-mono text-xl font-black text-zinc-800 transition-all shadow-2xs flex items-center justify-center cursor-pointer select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isOpenBillVerifying}
                  onClick={handleOpenBillNumpadClear}
                  className="h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 active:scale-95 text-rose-700 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={isOpenBillVerifying}
                  onClick={() => handleOpenBillNumpadPress("0")}
                  className="h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-900 active:text-white active:scale-95 font-mono text-xl font-black text-zinc-800 transition-all shadow-2xs flex items-center justify-center cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isOpenBillVerifying}
                  onClick={handleOpenBillNumpadBackspace}
                  className="h-12 rounded-2xl bg-zinc-200/80 hover:bg-zinc-300 active:bg-zinc-400 active:scale-95 text-zinc-700 font-bold transition-all flex items-center justify-center cursor-pointer select-none"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Change / Edit Customer Modal ── */}
      {editingCustomerBill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Change Customer Info</h3>
                  <p className="text-[11px] font-bold text-zinc-500">
                    Bill #{editingCustomerBill.bill_number} • Table {editingCustomerBill.table_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCustomerBill(null);
                  setCustomerUpdateMessage(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Feedback Alert */}
              {customerUpdateMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    customerUpdateMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {customerUpdateMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{customerUpdateMessage.text}</span>
                </div>
              )}

              {/* Quick Select from Saved Customers */}
              {customers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                    <span>Quick Select Existing Customer</span>
                    {editSelectedCustId && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Linked ID: #{editSelectedCustId}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={custSearchQuery}
                      onChange={(e) => setCustSearchQuery(e.target.value)}
                      placeholder="Search by name, phone or address..."
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 outline-none"
                    />
                  </div>

                  {/* Dropdown list if searching */}
                  {custSearchQuery.trim() && (
                    <div className="max-h-40 overflow-y-auto divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-md">
                      {customers
                        .filter(
                          (c) =>
                            c.name.toLowerCase().includes(custSearchQuery.toLowerCase()) ||
                            (c.phone && c.phone.includes(custSearchQuery)) ||
                            (c.address && c.address.toLowerCase().includes(custSearchQuery.toLowerCase()))
                        )
                        .slice(0, 5)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectExistingCustomer(c)}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-black text-zinc-900 truncate">{c.name}</p>
                              <p className="text-[10px] font-bold text-zinc-500 truncate">
                                {c.phone || "No phone"} {c.address ? `• 📍 ${c.address}` : ""}
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 px-2 py-0.5 rounded bg-emerald-100 shrink-0">
                              Select
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Inputs for Name, Phone, Address */}
              <div className="space-y-3 pt-1 border-t border-zinc-100">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 block mb-1">
                    Customer Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={editCustName}
                      onChange={(e) => {
                        setEditCustName(e.target.value);
                        setEditSelectedCustId(null);
                      }}
                      placeholder="e.g. Hamudh"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 block mb-1">
                    Mobile / Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value)}
                      placeholder="e.g. 0766666666"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 block mb-1">
                    Customer Address / Delivery Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={editCustAddress}
                      onChange={(e) => setEditCustAddress(e.target.value)}
                      placeholder="e.g. Section 58, Nakuru"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Clear to Walk-in Guest (No Customer)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCustomerBill(null);
                  setCustomerUpdateMessage(null);
                }}
                disabled={isSavingCustomer}
                className="px-4 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerChange}
                disabled={isSavingCustomer}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-black active:scale-95 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingCustomer ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Customer Info</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divide / Split Bill Modal */}
      <SplitBillModal
        bill={splittingBill}
        isOpen={!!splittingBill}
        onClose={() => setSplittingBill(null)}
        onSplitSuccess={handleSplitSuccess}
      />
    </div>
  );
}
