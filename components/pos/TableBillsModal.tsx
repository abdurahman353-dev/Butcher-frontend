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
  ArrowRightLeft,
  GitMerge,
} from "lucide-react";
import { SplitBillModal } from "./SplitBillModal";

// Shared module-level cache for 0ms instant PIN verification across modal opens
const globalWaiterCache = new Map<string, { id: number; name: string; role: string }>();

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
  /** All restaurant tables — used by the Transfer Table picker (cashier/admin only) */
  allTables?: RestaurantTable[];
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
  allTables = [],
}: TableBillsModalProps) {
  const { user } = useAuth();
  const isWaiter = user?.role === "waiter";

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [waiterPin, setWaiterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [verifiedStaff, setVerifiedStaff] = useState<{ id: number; name: string; role: string } | null>(null);
  const [pinFeedback, setPinFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showNumpad, setShowNumpad] = useState(isWaiter);
  const [showOptionalPin, setShowOptionalPin] = useState(isWaiter);

  // Local waiter PIN cache — backed by global cache for instant 0ms verification
  const [waiterCache, setWaiterCache] = useState<Map<string, { id: number; name: string; role: string }>>(
    () => new Map(globalWaiterCache)
  );

  // On-screen Waiter PIN Numpad Modal state (for opening bills)
  const [pinPromptBill, setPinPromptBill] = useState<RestaurantBill | null>(null);
  const [openBillPin, setOpenBillPin] = useState("");
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
    if (isWaiter) return;
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

  const [billsList, setBillsList] = useState<RestaurantBill[]>(
    (table?.active_bills || []).filter((b) => b.table_id === table?.id)
  );
  const [splittingBill, setSplittingBill] = useState<RestaurantBill | null>(null);

  // ── Transfer Bill State ──
  const [transferringBill, setTransferringBill] = useState<RestaurantBill | null>(null);
  const [transferTableSearch, setTransferTableSearch] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleTransferBill = async (bill: RestaurantBill, targetTable: RestaurantTable) => {
    if (isTransferring) return;

    // 0ms Instant Optimistic Close & Update
    const prevList = [...billsList];
    setBillsList((prev) => prev.filter((b) => b.id !== bill.id));
    if (table && table.active_bills) {
      table.active_bills = table.active_bills.filter((b) => b.id !== bill.id);
    }
    allTables.forEach((t) => {
      if (t.id === table?.id && t.active_bills) {
        t.active_bills = t.active_bills.filter((b) => b.id !== bill.id);
      }
    });
    setTransferringBill(null);
    setTransferFeedback(null);
    setTransferTableSearch("");
    setIsTransferring(true);

    if (onBillUpdated) {
      onBillUpdated({ ...bill, table_id: targetTable.id } as RestaurantBill);
    }

    try {
      const res = await restaurantService.transferBill(bill.id, targetTable.id);
      if (onBillUpdated && res.data) {
        onBillUpdated({ ...res.data, table_id: targetTable.id } as RestaurantBill);
      }
    } catch (err: any) {
      // Rollback on failure
      setBillsList(prevList);
      alert(err?.response?.data?.message || err?.message || "Transfer failed. Bill restored.");
    } finally {
      setIsTransferring(false);
    }
  };

  // ── Merge Bill State ──
  const [mergingBill, setMergingBill] = useState<RestaurantBill | null>(null);
  const [selectedMergeTableId, setSelectedMergeTableId] = useState<number | null>(null);
  const [selectedMergeBillId, setSelectedMergeBillId] = useState<number | null>(null);
  const [mergeTableSearch, setMergeTableSearch] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeFeedback, setMergeFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleMergeBill = async (sourceBill: RestaurantBill, targetBill: RestaurantBill) => {
    if (isMerging) return;

    // 0ms Instant Optimistic UI: Close modal immediately so cashier perceives ZERO delay
    const prevList = [...billsList];
    setMergingBill(null);
    setSelectedMergeTableId(null);
    setSelectedMergeBillId(null);
    setMergeFeedback(null);
    setMergeTableSearch("");

    // 1. Instantly purge source bill in-place from table.active_bills and allTables so no re-render can resurrect it
    if (table && table.active_bills) {
      table.active_bills = table.active_bills.filter((b) => b.id !== sourceBill.id);
    }
    allTables.forEach((t) => {
      if (t.active_bills) {
        t.active_bills = t.active_bills.filter((b) => b.id !== sourceBill.id);
      }
    });

    // 2. Optimistically remove source bill from internal billsList state
    setBillsList((prev) => prev.filter((b) => b.id !== sourceBill.id));

    // 3. Notify parent immediately that source bill is cancelled so parent purges it everywhere
    if (onBillUpdated) {
      onBillUpdated({ ...sourceBill, status: "cancelled", items: [], total: 0 });
    }

    // 4. If target bill is on the same table, optimistically merge items and recalculate totals
    if (targetBill.table_id === table?.id) {
      const combinedItems = [...(targetBill.items || []), ...(sourceBill.items || [])];
      const combinedSubtotal = Math.round(((targetBill.subtotal || 0) + (sourceBill.subtotal || 0)) * 100) / 100;
      const combinedDiscount = Math.round(((targetBill.discount || 0) + (sourceBill.discount || 0)) * 100) / 100;
      const combinedTotal = Math.round(Math.max(0, combinedSubtotal - combinedDiscount) * 100) / 100;

      const optimisticTarget: RestaurantBill = {
        ...targetBill,
        items: combinedItems,
        subtotal: combinedSubtotal,
        discount: combinedDiscount,
        total: combinedTotal,
        status: "open",
      };

      setBillsList((prev) =>
        prev.map((b) => (b.id === targetBill.id ? optimisticTarget : b))
      );

      if (table && table.active_bills) {
        table.active_bills = table.active_bills.map((b) =>
          b.id === targetBill.id ? optimisticTarget : b
        );
      }

      if (onBillUpdated) {
        onBillUpdated(optimisticTarget);
      }
    }

    setIsMerging(true);
    try {
      const res = await restaurantService.mergeBill(sourceBill.id, targetBill.id);
      // Synchronize with exact server bill
      if (onBillUpdated) {
        onBillUpdated(res.source_bill);
        onBillUpdated(res.target_bill);
      }
      if (res.target_bill.table_id === table?.id) {
        setBillsList((prev) =>
          prev.map((b) => (b.id === res.target_bill.id ? res.target_bill : b))
        );
        if (table && table.active_bills) {
          table.active_bills = table.active_bills.map((b) =>
            b.id === res.target_bill.id ? res.target_bill : b
          );
        }
      }
    } catch (err: any) {
      // Rollback on failure
      setBillsList(prevList);
      if (table && table.active_bills) {
        table.active_bills = [...table.active_bills, sourceBill];
      }
      alert(err?.response?.data?.message || err?.message || "Merge failed. Bill restored.");
    } finally {
      setIsMerging(false);
    }
  };

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

  // Pre-load all waiter PINs into local & global cache when modal opens or table changes
  useEffect(() => {
    if (!isOpen) return;
    restaurantService.getWaiters().then((waiters) => {
      const map = new Map<string, { id: number; name: string; role: string }>();
      waiters.forEach((w) => {
        if (w.pin) {
          const entry = { id: w.id, name: w.name, role: w.role || "waiter" };
          map.set(w.pin.trim(), entry);
          globalWaiterCache.set(w.pin.trim(), entry);
        }
      });
      setWaiterCache(map);
    }).catch(() => {
      // Silently ignore — falls back gracefully to live verify endpoint
    });
  }, [isOpen, table?.id]);

  useEffect(() => {
    setBillsList(
      (table?.active_bills || []).filter(
        (b) => b.table_id === table?.id && b.status !== "cancelled" && b.status !== "settled"
      )
    );
  }, [table?.active_bills, table?.id]);

  // Only show real bills (id > 0) that belong to this table and are open/printed.
  // Never filter by items count or total — a freshly created bill has no items yet
  // but is still a real, persisted bill that must remain visible.
  const activeBills = (billsList || []).filter(
    (b) =>
      b.id > 0 &&
      b.table_id === table?.id &&
      (b.status === "open" || b.status === "printed")
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

  // Instant local PIN verification with live backend fallback (never fails valid PINs)
  const handlePinInput = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setWaiterPin(clean);

    if (clean.length < 4) {
      setVerifiedStaff(null);
      setPinFeedback(null);
      return;
    }

    // 1. Instant local lookup (0ms)
    const matched = waiterCache.get(clean) || globalWaiterCache.get(clean);
    if (matched) {
      setVerifiedStaff(matched);
      setPinFeedback({ type: "success", text: `Identified Server: ${matched.name}` });
      return;
    }

    // 2. Direct live fallback to backend verification so no valid PIN is ever rejected
    try {
      const res = await restaurantService.verifyWaiterPin(clean);
      if (res.verified && res.user) {
        const staff = { id: res.user.id, name: res.user.name, role: res.user.role || "waiter" };
        globalWaiterCache.set(clean, staff);
        setWaiterCache((prev) => new Map(prev).set(clean, staff));
        setVerifiedStaff(staff);
        setPinFeedback({ type: "success", text: `Identified Server: ${staff.name}` });
      } else {
        setVerifiedStaff(null);
        setPinFeedback({ type: "error", text: res.message || `No waiter found matching PIN ${clean}` });
      }
    } catch {
      setVerifiedStaff(null);
      setPinFeedback({ type: "error", text: `No waiter found matching PIN ${clean}` });
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

    // Admin/Cashier who opted into assigning a PIN must enter a valid 4-digit PIN if one was started
    if (!isWaiter && showOptionalPin && waiterPin.length > 0 && (!verifiedStaff || waiterPin.length !== 4)) {
      return;
    }

    const waiterNameToUse = verifiedStaff?.name || (waiterPin ? `Server #${waiterPin}` : user?.name || "Staff");
    const payload = {
      waiter_pin: (isWaiter || (showOptionalPin && waiterPin.length === 4)) ? (waiterPin || undefined) : undefined,
      waiter_name: waiterNameToUse,
      guest_count: Number(guestCount) || 1,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      customer_address: customerAddress.trim() || undefined,
      notes: billNotes.trim() || undefined,
    };

    // 0ms instant transition: close modal and reset fields immediately
    onClose();
    setIsCreatingNew(false);
    setWaiterPin("");
    setVerifiedStaff(null);
    setPinFeedback(null);
    setShowNumpad(false);
    setShowOptionalPin(false);
    setCustomerName("");
    setCustomerPhone("");
    setBillNotes("");

    onCreateNewBill(table, payload);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    // Superadmin and cashiers create bills without PIN by default
    setShowOptionalPin(isWaiter ? true : false);
    setShowNumpad(isWaiter ? true : false);
    setWaiterPin("");
    setVerifiedStaff(null);
    setPinFeedback(null);
  };

  const handleCancelCreate = () => {
    if (isSubmitting) return;
    setIsCreatingNew(false);
    setWaiterPin("");
    setVerifiedStaff(null);
    setPinFeedback(null);
    setShowNumpad(isWaiter ? true : false);
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

  // ── Instant local PIN verification for Opening Bill with backend fallback ──
  const handleOpenBillPinInput = async (pinValue: string, targetBill: RestaurantBill) => {
    const clean = pinValue.replace(/\D/g, "").slice(0, 4);
    setOpenBillPin(clean);
    setOpenBillFeedback(null);

    if (clean.length < 4) return;

    // Instant local lookup or backend fallback
    let matched = waiterCache.get(clean) || globalWaiterCache.get(clean);
    if (!matched) {
      try {
        const res = await restaurantService.verifyWaiterPin(clean);
        if (res.verified && res.user) {
          matched = { id: res.user.id, name: res.user.name, role: res.user.role || "waiter" };
          globalWaiterCache.set(clean, matched);
          setWaiterCache((prev) => new Map(prev).set(clean, matched!));
        }
      } catch {
        // ignore
      }
    }

    if (matched) {
      const billOwner = (targetBill.waiter_name || "").trim().toLowerCase();
      const verifiedName = matched.name.trim().toLowerCase();
      const isOwner = Boolean(billOwner && (verifiedName === billOwner || (targetBill.waiter_id && matched.id === targetBill.waiter_id)));

      if (isOwner) {
        // 0ms instant: open bill immediately
        if (!table) return;
        setPinPromptBill(null);
        setOpenBillPin("");
        setOpenBillFeedback(null);
        onOpenBillForOrdering(table, targetBill);
        onClose();
      } else {
        setOpenBillFeedback({
          type: "error",
          text: `Not your bill! This bill belongs to ${targetBill.waiter_name || "another waiter"}.`,
        });
        setOpenBillPin("");
      }
    } else {
      setOpenBillFeedback({ type: "error", text: "Incorrect PIN. Please try again." });
      setOpenBillPin("");
    }
  };

  const handleOpenBillNumpadPress = (digit: string) => {
    if (!pinPromptBill) return;
    if (openBillPin.length < 4) {
      handleOpenBillPinInput(openBillPin + digit, pinPromptBill);
    }
  };

  const handleOpenBillNumpadBackspace = () => {
    if (!pinPromptBill) return;
    if (openBillPin.length > 0) {
      const updated = openBillPin.slice(0, -1);
      setOpenBillPin(updated);
      setOpenBillFeedback(null);
    }
  };

  const handleOpenBillNumpadClear = () => {
    if (!pinPromptBill) return;
    setOpenBillPin("");
    setOpenBillFeedback(null);
  };

  // Keyboard listener for on-screen PIN numpad modal (opening existing bill)
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
  }, [pinPromptBill, openBillPin]);

  // Physical keyboard listener for New Bill Waiter PIN (no DOM password input = zero password manager popups)
  useEffect(() => {
    if (!isOpen || !isCreatingNew || (!isWaiter && !showOptionalPin)) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumpadPress(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleNumpadBackspace();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCreatingNew, isWaiter, showOptionalPin, waiterPin]);

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
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-xl transition-all active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
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
                  onClick={handleStartCreateNew}
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
            <form
              onSubmit={handleCreateSubmit}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              className="bg-white border-2 border-emerald-400 rounded-2xl overflow-hidden shadow-sm"
            >

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
                  disabled={isSubmitting}
                  className="h-7 px-3 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-xs font-bold transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          Enter Your 4-Digit Waiter PIN
                          <span className="text-rose-500 ml-1">*</span>
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

                    <div className="flex flex-col items-center justify-center gap-2.5 py-1">
                      {/* 4-digit PIN indicator boxes (Centered & Masked, no password input = zero autofill prompts) */}
                      <div className="flex items-center justify-center gap-2.5">
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = waiterPin.length > idx;
                          const isCurrent = waiterPin.length === idx;
                          return (
                            <div
                              key={idx}
                              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${
                                isFilled
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs scale-105"
                                  : isCurrent
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/20"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-300"
                              }`}
                            >
                              {isFilled ? (
                                <span className="w-3.5 h-3.5 rounded-full bg-white inline-block shadow-2xs" />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {/* Feedback message (Centered) */}
                      <div className="w-full max-w-sm flex items-center justify-center text-center">
                        {pinFeedback ? (
                          <div
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                              pinFeedback.type === "success"
                                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                : pinFeedback.type === "error"
                                ? "bg-rose-50 text-rose-900 border border-rose-200"
                                : "bg-zinc-100 text-zinc-800"
                            }`}
                          >
                            {pinFeedback.type === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <div className="leading-tight">
                              <span>{pinFeedback.text}</span>
                              {verifiedStaff && (
                                <span className="block text-[10px] text-emerald-700 font-extrabold mt-0.5">
                                  ✓ Tagged to server: {verifiedStaff.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400 font-semibold">
                            Enter your 4-digit PIN to post this order
                          </div>
                        )}
                      </div>
                    </div>

                    {showNumpad && (
                      <div className="pt-3 border-t border-zinc-100 animate-in fade-in duration-100">
                        <div className="w-full max-w-[340px] mx-auto grid grid-cols-3 gap-2 sm:gap-2.5">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleNumpadPress(num)}
                              className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white active:scale-95 font-mono text-2xl font-black text-zinc-800 transition-all shadow-xs flex items-center justify-center cursor-pointer select-none border border-zinc-200/80"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={handleNumpadClear}
                            className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 active:scale-95 text-rose-700 font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer select-none border border-rose-200"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNumpadPress("0")}
                            className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white active:scale-95 font-mono text-2xl font-black text-zinc-800 transition-all shadow-xs flex items-center justify-center cursor-pointer select-none border border-zinc-200/80"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={handleNumpadBackspace}
                            className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-zinc-200/80 hover:bg-zinc-300 active:bg-zinc-400 active:scale-95 text-zinc-700 font-bold flex items-center justify-center transition-all cursor-pointer select-none border border-zinc-300"
                            title="Backspace"
                          >
                            <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
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
                      onClick={() => {
                        setShowOptionalPin(true);
                        setShowNumpad(true);
                      }}
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
                  onClick={() => !isSubmitting && setIsCreatingNew(false)}
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (isWaiter && (!verifiedStaff || waiterPin.length !== 4)) ||
                    (!isWaiter && showOptionalPin && waiterPin.length > 0 && (!verifiedStaff || waiterPin.length !== 4))
                  }
                  className="h-9 px-5 bg-zinc-900 hover:bg-zinc-800 active:bg-black active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>
                    {isSubmitting
                      ? "Opening Bill..."
                      : isWaiter && (!verifiedStaff || waiterPin.length !== 4)
                      ? "Enter Your Waiter PIN"
                      : verifiedStaff
                      ? `Open Bill (${verifiedStaff.name})`
                      : `Open Bill (${user?.name || "Staff"})`}
                  </span>
                  {!isSubmitting && <ChevronRight className="w-3.5 h-3.5" />}
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
                onClick={handleStartCreateNew}
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
                        <div className="text-lg font-black text-emerald-600 tracking-tight font-mono">
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
                          {!isWaiter && (
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
                          )}
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
                        {/* Merge Bill button — cashier/admin only */}
                        {!isWaiter && (
                          <button
                            type="button"
                            onClick={() => {
                              setMergingBill(bill);
                              setMergeTableSearch("");
                              setMergeFeedback(null);
                              // Default selection: if current table has other candidate bills, pick current table!
                              const sameTableCandidates = billsList.filter(
                                (b) => b.id !== bill.id && (b.status === "open" || b.status === "printed")
                              );
                              if (sameTableCandidates.length > 0 && table) {
                                setSelectedMergeTableId(table.id);
                                setSelectedMergeBillId(sameTableCandidates[0].id);
                              } else {
                                const firstOther = allTables.find((t) => {
                                  if (!t.is_active || t.id === table?.id) return false;
                                  return (t.active_bills || []).some(
                                    (b) => (b.status === "open" || b.status === "printed")
                                  );
                                });
                                if (firstOther) {
                                  setSelectedMergeTableId(firstOther.id);
                                  const bList = (firstOther.active_bills || []).filter(
                                    (b) => (b.status === "open" || b.status === "printed")
                                  );
                                  setSelectedMergeBillId(bList[0]?.id ?? null);
                                } else {
                                  setSelectedMergeTableId(null);
                                  setSelectedMergeBillId(null);
                                }
                              }
                            }}
                            className="px-2.5 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl transition-all font-bold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                            title="Merge this bill into another bill"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>Merge</span>
                          </button>
                        )}
                        {/* Transfer Bill button — cashier/admin only */}
                        {!isWaiter && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferringBill(bill);
                              setTransferTableSearch("");
                              setTransferFeedback(null);
                            }}
                            className="px-2.5 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl transition-all font-bold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                            title="Shift this bill to another table"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transfer</span>
                          </button>
                        )}
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
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="h-8 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 text-xs font-black text-white transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Transfer Bill Modal — Cashier / Admin only ── */}
      {transferringBill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">

            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-sky-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-zinc-900 leading-tight">Shift / Transfer Bill</h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white shadow-2xs">
                      Source
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* 1. Source Table Number */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100/90 text-sky-950 border border-sky-300 rounded-lg text-xs font-bold shadow-2xs">
                      <span className="text-[10px] uppercase tracking-wider font-black text-sky-600">Source Table:</span>
                      <span className="font-black font-mono text-zinc-900">{table?.name || `Table ${table?.table_number}`}</span>
                    </span>

                    {/* 2. Source Bill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-zinc-900 border border-sky-300 rounded-lg text-xs font-bold shadow-2xs">
                      <span className="text-[10px] uppercase tracking-wider font-black text-sky-600">Source Bill:</span>
                      <span className="font-mono font-black text-sky-950">{transferringBill.bill_number}</span>
                    </span>

                    {/* 3. Source Amount */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs">
                      <span className="text-[10px] uppercase tracking-wider font-black text-emerald-600">Source Amount:</span>
                      <span className="font-black text-emerald-700">{formatCurrency(transferringBill.total)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTransferringBill(null);
                  setTransferFeedback(null);
                  setTransferTableSearch("");
                }}
                disabled={isTransferring}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback banner */}
            {transferFeedback && (
              <div
                className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  transferFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : "bg-rose-50 text-rose-700 border border-rose-300"
                }`}
              >
                {transferFeedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {transferFeedback.text}
              </div>
            )}

            {/* Table Search */}
            <div className="px-6 pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={transferTableSearch}
                  onChange={(e) => setTransferTableSearch(e.target.value)}
                  placeholder="Filter destination tables by name, number, or zone..."
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 hover:border-sky-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-xs font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Table List — 2 to 3 column grid stretched for PC screens */}
            <div className="px-6 pb-4 pt-2 overflow-y-auto max-h-[62vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allTables
                  .filter((t) => {
                    // Exclude current table
                    if (t.id === table?.id) return false;
                    if (!t.is_active) return false;
                    const q = transferTableSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.table_number.toLowerCase().includes(q) ||
                      (t.zone || "").toLowerCase().includes(q)
                    );
                  })
                  .map((t) => {
                    const billsOnTable = t.active_bills || [];
                    const hasActiveBills = billsOnTable.length > 0;
                    const tableTotal = t.total_active_amount || billsOnTable.reduce((s, b) => s + (b.total || 0), 0);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isTransferring}
                        onClick={() => handleTransferBill(transferringBill, t)}
                        className="group flex items-center justify-between p-3.5 rounded-xl border-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:border-sky-500 hover:bg-sky-50/70 border-zinc-200 bg-white shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shadow-xs text-white shrink-0 ${
                            t.status === "red" ? "bg-rose-500"
                            : t.status === "yellow" ? "bg-amber-500"
                            : "bg-zinc-700"
                          }`}>
                            {t.table_number}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-xs font-black text-zinc-900 truncate">{t.name}</div>
                            <div className="text-[11px] font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="text-zinc-500">{t.zone || "Main Floor"}</span>
                              {hasActiveBills ? (
                                <>
                                  <span className="text-zinc-300">•</span>
                                  <span className="text-amber-700 font-bold">{billsOnTable.length} bill{billsOnTable.length !== 1 ? "s" : ""}</span>
                                  {tableTotal > 0 && (
                                    <span className="text-emerald-700 font-black">{formatCurrency(tableTotal)}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-emerald-600 font-semibold">• Empty</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">
                          {isTransferring ? (
                            <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                          ) : (
                            <span className="text-[11px] font-black text-sky-600 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                              Move →
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {allTables.filter((t) => {
                if (t.id === table?.id) return false;
                if (!t.is_active) return false;
                const q = transferTableSearch.toLowerCase().trim();
                if (!q) return true;
                return (
                  t.name.toLowerCase().includes(q) ||
                  t.table_number.toLowerCase().includes(q) ||
                  (t.zone || "").toLowerCase().includes(q)
                );
              }).length === 0 && (
                <div className="text-center py-12 text-sm text-zinc-400 font-medium">
                  No destination tables found matching your search.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium">
                Moving a bill relocates all its items to the destination table.
              </span>
              <button
                type="button"
                onClick={() => {
                  setTransferringBill(null);
                  setTransferFeedback(null);
                  setTransferTableSearch("");
                }}
                disabled={isTransferring}
                className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge Bill Modal — Cashier / Admin only ── */}
      {mergingBill && (() => {
        // Build list of candidate tables that have active bills (other than source bill)
        const getCandidateBills = (t: RestaurantTable) => {
          if (t.id === table?.id) {
            return billsList.filter(
              (b) => b.id !== mergingBill.id && (b.status === "open" || b.status === "printed")
            );
          }
          return (t.active_bills || []).filter(
            (b) => b.id !== mergingBill.id && (b.status === "open" || b.status === "printed")
          );
        };

        const eligibleTables = allTables
          .filter((t) => t.is_active)
          .map((t) => ({
            table: t,
            isCurrentTable: t.id === table?.id,
            bills: getCandidateBills(t),
            totalAmount: getCandidateBills(t).reduce((s, b) => s + (b.total || 0), 0),
          }))
          .filter((item) => item.bills.length > 0)
          .sort((a, b) => {
            if (a.isCurrentTable) return -1;
            if (b.isCurrentTable) return 1;
            return a.table.name.localeCompare(b.table.name, undefined, { numeric: true });
          });

        const activeTableItem =
          eligibleTables.find((it) => it.table.id === selectedMergeTableId) ||
          eligibleTables[0];
        const activeTable = activeTableItem?.table;
        const candidateBillsOnActiveTable = activeTableItem?.bills || [];
        const activeTargetBill =
          candidateBillsOnActiveTable.find((b) => b.id === selectedMergeBillId) ||
          candidateBillsOnActiveTable[0];

        const q = mergeTableSearch.toLowerCase().trim();
        const filteredEligibleTables = eligibleTables.filter((it) => {
          if (!q) return true;
          return (
            it.table.name.toLowerCase().includes(q) ||
            it.table.table_number.toLowerCase().includes(q) ||
            (it.table.zone || "").toLowerCase().includes(q)
          );
        });

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">

              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-violet-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-zinc-900 leading-tight">Merge Bills</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white shadow-2xs">
                        Source
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* 1. Source Table Number */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100/90 text-violet-950 border border-violet-300 rounded-lg text-xs font-bold shadow-2xs">
                        <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">Source Table:</span>
                        <span className="font-black font-mono text-zinc-900">{table?.name || `Table ${table?.table_number}`}</span>
                      </span>

                      {/* 2. Source Bill */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-zinc-900 border border-violet-300 rounded-lg text-xs font-bold shadow-2xs">
                        <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">Source Bill:</span>
                        <span className="font-mono font-black text-violet-950">{mergingBill.bill_number}</span>
                      </span>

                      {/* 3. Source Amount */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs">
                        <span className="text-[10px] uppercase tracking-wider font-black text-emerald-600">Source Amount:</span>
                        <span className="font-black text-emerald-700">{formatCurrency(mergingBill.total)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMergingBill(null);
                    setSelectedMergeTableId(null);
                    setSelectedMergeBillId(null);
                    setMergeFeedback(null);
                    setMergeTableSearch("");
                  }}
                  disabled={isMerging}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all cursor-pointer disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Feedback */}
              {mergeFeedback && (
                <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  mergeFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : "bg-rose-50 text-rose-700 border border-rose-300"
                }`}>
                  {mergeFeedback.type === "success" ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {mergeFeedback.text}
                </div>
              )}

              {/* Quick Dropdown Selectors Bar — Table number & Bill number */}
              {eligibleTables.length > 0 && (
                <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <span>Quick Select:</span>
                  </div>

                  {/* Select Table */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <span className="text-[11px] font-bold text-zinc-500 shrink-0">Table:</span>
                    <select
                      value={activeTable?.id || ""}
                      onChange={(e) => {
                        const tid = Number(e.target.value);
                        setSelectedMergeTableId(tid);
                        const tbl = eligibleTables.find((it) => it.table.id === tid);
                        setSelectedMergeBillId(tbl?.bills[0]?.id ?? null);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 hover:border-violet-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl text-xs font-bold text-zinc-900 outline-none transition-all cursor-pointer"
                    >
                      {eligibleTables.map((it) => (
                        <option key={it.table.id} value={it.table.id}>
                          {it.table.name} {it.isCurrentTable ? "(Current Table)" : ""} — {it.bills.length} active bill{it.bills.length !== 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Bill */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                    <span className="text-[11px] font-bold text-zinc-500 shrink-0">Bill:</span>
                    <select
                      value={activeTargetBill?.id || ""}
                      onChange={(e) => setSelectedMergeBillId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 hover:border-violet-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl text-xs font-bold text-zinc-900 outline-none transition-all cursor-pointer"
                    >
                      {candidateBillsOnActiveTable.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bill_number} — {formatCurrency(b.total)} ({b.items?.length || 0} items)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fast Merge Button */}
                  {activeTargetBill && (
                    <button
                      type="button"
                      disabled={isMerging}
                      onClick={() => handleMergeBill(mergingBill, activeTargetBill)}
                      className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isMerging ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Merging...</span>
                        </>
                      ) : (
                        <>
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Merge into {activeTargetBill.bill_number}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Side-by-side Visual Selection: Left Table Picker | Right Bill Picker */}
              {eligibleTables.length === 0 ? (
                <div className="text-center py-16 text-sm text-zinc-400 font-medium">
                  No other active bills found across any tables to merge with.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-200 flex-1 overflow-hidden min-h-[440px]">

                  {/* LEFT COLUMN: 1. Select Table */}
                  <div className="md:col-span-5 flex flex-col overflow-hidden bg-zinc-50/60">
                    <div className="p-3.5 border-b border-zinc-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center font-bold">1</span>
                          Select Target Table
                        </span>
                        <span className="text-[11px] font-bold text-zinc-500">
                          {eligibleTables.length} table{eligibleTables.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={mergeTableSearch}
                          onChange={(e) => setMergeTableSearch(e.target.value)}
                          placeholder="Filter tables..."
                          className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 hover:border-violet-400 focus:border-violet-500 rounded-xl text-xs font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
                      {filteredEligibleTables.map((it) => {
                        const isSelected = it.table.id === activeTable?.id;
                        return (
                          <button
                            key={it.table.id}
                            type="button"
                            onClick={() => {
                              setSelectedMergeTableId(it.table.id);
                              setSelectedMergeBillId(it.bills[0]?.id ?? null);
                            }}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "border-violet-600 bg-violet-50/90 ring-2 ring-violet-500/20 shadow-xs"
                                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl font-mono font-black text-xs flex items-center justify-center shadow-xs text-white shrink-0 ${
                                it.table.status === "red" ? "bg-rose-500"
                                : it.table.status === "yellow" ? "bg-amber-500"
                                : "bg-zinc-700"
                              }`}>
                                {it.table.table_number}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-zinc-900">{it.table.name}</span>
                                  {it.isCurrentTable && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                      Same Table
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-medium text-zinc-500 mt-0.5 flex items-center gap-1">
                                  <span className="font-bold text-violet-700">{it.bills.length} active bill{it.bills.length !== 1 ? "s" : ""}</span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-black">{formatCurrency(it.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <span className="text-[10px] font-black px-2 py-0.5 bg-violet-600 text-white rounded-lg uppercase tracking-wider flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" /> Active
                                </span>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: 2. Select Bill to Merge Into */}
                  <div className="md:col-span-7 flex flex-col overflow-hidden bg-white">
                    <div className="p-3.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center font-bold">2</span>
                        Select Target Bill on {activeTable?.name || "Selected Table"}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500">
                        {candidateBillsOnActiveTable.length} bill{candidateBillsOnActiveTable.length !== 1 ? "s" : ""} available
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                      {candidateBillsOnActiveTable.map((targetB) => {
                        const isChosen = targetB.id === activeTargetBill?.id;
                        const combinedTotal = (mergingBill.total || 0) + (targetB.total || 0);

                        return (
                          <div
                            key={targetB.id}
                            onClick={() => setSelectedMergeBillId(targetB.id)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              isChosen
                                ? "border-violet-600 bg-violet-50/40 shadow-md ring-2 ring-violet-500/10"
                                : "border-zinc-200 bg-white hover:border-violet-300 hover:bg-zinc-50/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                                    {targetB.bill_number}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                      targetB.status === "printed"
                                        ? "bg-amber-50 text-amber-700 border-amber-300"
                                        : "bg-rose-50 text-rose-700 border-rose-300"
                                    }`}
                                  >
                                    {targetB.status === "printed" ? "Bill Printed" : "Order Active"}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold text-zinc-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>{targetB.customer_name || "Walk-in Guest"}</span>
                                  {targetB.items && targetB.items.length > 0 && (
                                    <>
                                      <span className="text-zinc-300">•</span>
                                      <span className="text-zinc-500">{targetB.items.length} item{targetB.items.length !== 1 ? "s" : ""}</span>
                                    </>
                                  )}
                                  {targetB.waiter_name && (
                                    <>
                                      <span className="text-zinc-300">•</span>
                                      <span className="text-zinc-500">Waiter: {targetB.waiter_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs text-zinc-400 font-bold uppercase">Current Total</div>
                                <div className="text-base font-black text-emerald-700">{formatCurrency(targetB.total)}</div>
                              </div>
                            </div>

                            {/* Merge preview calculation & Action button */}
                            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                              <div className="text-[11px] font-medium text-zinc-500">
                                Combined total: <span className="font-black text-emerald-800 text-xs">{formatCurrency(combinedTotal)}</span>
                              </div>

                              <button
                                type="button"
                                disabled={isMerging}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMergeBill(mergingBill, targetB);
                                }}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 active:scale-95 ml-auto"
                              >
                                {isMerging && isChosen ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Merging...</span>
                                  </>
                                ) : (
                                  <>
                                    <GitMerge className="w-3.5 h-3.5" />
                                    <span>MERGE INTO THIS BILL →</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">
                  Merging moves all items from {mergingBill.bill_number} into the selected bill and cancels {mergingBill.bill_number}.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMergingBill(null);
                    setSelectedMergeTableId(null);
                    setSelectedMergeBillId(null);
                    setMergeFeedback(null);
                    setMergeTableSearch("");
                  }}
                  disabled={isMerging}
                  className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  const isCurrent = idx === openBillPin.length;
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
                {openBillFeedback ? (
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
              <div className="grid grid-cols-3 gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleOpenBillNumpadPress(num)}
                    className="h-14 sm:h-16 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-900 active:text-white active:scale-95 font-mono text-2xl font-black text-zinc-800 transition-all shadow-xs flex items-center justify-center cursor-pointer select-none border border-zinc-200/80"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleOpenBillNumpadClear}
                  className="h-14 sm:h-16 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 active:scale-95 text-rose-700 font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer select-none border border-rose-200"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenBillNumpadPress("0")}
                  className="h-14 sm:h-16 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-900 active:text-white active:scale-95 font-mono text-2xl font-black text-zinc-800 transition-all shadow-xs flex items-center justify-center cursor-pointer select-none border border-zinc-200/80"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleOpenBillNumpadBackspace}
                  className="h-14 sm:h-16 rounded-2xl bg-zinc-200/80 hover:bg-zinc-300 active:bg-zinc-400 active:scale-95 text-zinc-700 font-bold transition-all flex items-center justify-center cursor-pointer select-none border border-zinc-300"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Change / Edit Customer Modal ── */}
      {!isWaiter && editingCustomerBill && (
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
