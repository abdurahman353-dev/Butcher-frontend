"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Split,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Phone,
  RotateCcw,
  Sparkles,
  Receipt,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { RestaurantBill } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { restaurantService } from "@/services/restaurant.service";
import { useSystemDialog } from "@/contexts/DialogContext";

interface SplitBillModalProps {
  bill: RestaurantBill | null;
  isOpen: boolean;
  onClose: () => void;
  onSplitSuccess: (sourceBill: RestaurantBill, targetBill: RestaurantBill) => void;
}

interface SplitItemState {
  product_id: number;
  product_name: string;
  original_weight: number;
  unit?: string;
  price_per_kg: number;
  discount: number;
  moved_weight: number;
}

export function SplitBillModal({
  bill,
  isOpen,
  onClose,
  onSplitSuccess,
}: SplitBillModalProps) {
  const { alert } = useSystemDialog();
  const [splitItems, setSplitItems] = useState<SplitItemState[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [splitNotes, setSplitNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bill && isOpen) {
      const initial: SplitItemState[] = (bill.items || []).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        original_weight: Number(it.weight) || 1,
        unit: it.unit || "PCS",
        price_per_kg: Number(it.price_per_kg) || 0,
        discount: Number(it.discount) || 0,
        moved_weight: 0,
      }));
      setSplitItems(initial);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setSplitNotes(`Divided from Bill ${bill.bill_number}`);
    }
  }, [bill, isOpen]);

  if (!isOpen || !bill) return null;

  const handleSetMovedWeight = (productId: number, val: number) => {
    setSplitItems((prev) =>
      prev.map((it) => {
        if (it.product_id !== productId) return it;
        const clamped = Math.max(0, Math.min(it.original_weight, Number(val) || 0));
        return { ...it, moved_weight: clamped };
      })
    );
  };

  const handleAdjustStep = (productId: number, delta: number) => {
    setSplitItems((prev) =>
      prev.map((it) => {
        if (it.product_id !== productId) return it;
        const isKg = it.unit?.toLowerCase().includes("kg");
        const step = isKg ? 0.25 : 1;
        const newVal = Math.round((it.moved_weight + delta * step) * 100) / 100;
        const clamped = Math.max(0, Math.min(it.original_weight, newVal));
        return { ...it, moved_weight: clamped };
      })
    );
  };

  const handleMoveAll = (productId: number) => {
    setSplitItems((prev) =>
      prev.map((it) => (it.product_id === productId ? { ...it, moved_weight: it.original_weight } : it))
    );
  };

  const handleKeepAll = (productId: number) => {
    setSplitItems((prev) =>
      prev.map((it) => (it.product_id === productId ? { ...it, moved_weight: 0 } : it))
    );
  };

  const handleResetAll = () => {
    setSplitItems((prev) => prev.map((it) => ({ ...it, moved_weight: 0 })));
  };

  // Calculations
  const movedItemsList = splitItems.filter((it) => it.moved_weight > 0.0001);

  const bill1RemainingTotal = splitItems.reduce((acc, it) => {
    const remain = it.original_weight - it.moved_weight;
    const discRate = it.original_weight > 0 ? it.discount / it.original_weight : 0;
    const lineTotal = Math.max(0, it.price_per_kg * remain - discRate * remain);
    return acc + lineTotal;
  }, 0);

  const bill2NewTotal = splitItems.reduce((acc, it) => {
    const moved = it.moved_weight;
    const discRate = it.original_weight > 0 ? it.discount / it.original_weight : 0;
    const lineTotal = Math.max(0, it.price_per_kg * moved - discRate * moved);
    return acc + lineTotal;
  }, 0);

  const hasAnyMoved = movedItemsList.length > 0;
  const hasAnyRemaining = splitItems.some((it) => it.original_weight - it.moved_weight > 0.0001);
  const isValidSplit = hasAnyMoved && hasAnyRemaining;

  const handleSubmitSplit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAnyMoved) {
      alert({
        title: "No Items Selected",
        message: "Please choose at least one item or portion to move to the new bill.",
        type: "warning",
      });
      return;
    }

    if (!hasAnyRemaining) {
      alert({
        title: "Cannot Empty Original Bill",
        message: "At least one item must remain on the original bill. If you need to transfer the entire order, keep at least one portion on the current bill.",
        type: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payloadItems = movedItemsList.map((it) => ({
        product_id: it.product_id,
        quantity: it.moved_weight,
      }));

      const res = await restaurantService.splitBill(bill.id, {
        items: payloadItems,
        customer_name: newCustomerName.trim() || undefined,
        customer_phone: newCustomerPhone.trim() || undefined,
        notes: splitNotes.trim() || undefined,
      });

      onSplitSuccess(res.source_bill, res.target_bill);
      onClose();
    } catch (err: any) {
      console.error("Split bill error:", err);
      alert({
        title: "Failed to Divide Bill",
        message: err?.response?.data?.message || err?.message || "An error occurred while splitting the bill.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-zinc-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Split className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">
                  Divide Bill #{bill.bill_number}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-zinc-900 tracking-wider shadow-2xs shrink-0">
                  Table {bill.table_number}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 font-medium truncate mt-0.5">
                Separate items between dining guests into two independent bills
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitSplit} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 bg-zinc-100/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* ── Left Column: Original Bill (Source) ── */}
            <div className="bg-white border-2 border-zinc-300 rounded-2xl p-4.5 flex flex-col shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b-2 border-zinc-100 mb-3.5">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-md bg-zinc-900 text-white font-mono text-[10px] uppercase font-black tracking-wider mb-1">
                    Bill 1 (Original)
                  </span>
                  <h4 className="text-sm font-black text-zinc-950 truncate max-w-[180px]">
                    {bill.customer_name || "Guest 1 (Original)"}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider block">
                    Remaining Total
                  </span>
                  <span className="text-lg font-black text-emerald-700 tracking-tight font-mono">
                    {formatCurrency(bill1RemainingTotal)}
                  </span>
                </div>
              </div>

              {/* Items List to Split From */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {splitItems.map((item) => {
                  const remaining = Math.round((item.original_weight - item.moved_weight) * 100) / 100;
                  const isFullyMoved = remaining <= 0.0001;
                  const isPartiallyMoved = item.moved_weight > 0 && !isFullyMoved;

                  return (
                    <div
                      key={item.product_id}
                      className={`p-3.5 rounded-xl border-2 transition-all ${
                        item.moved_weight > 0
                          ? "bg-indigo-50/40 border-indigo-300 shadow-xs"
                          : "bg-zinc-50/80 border-zinc-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-zinc-950 uppercase tracking-tight truncate">
                            {item.product_name}
                          </p>
                          <p className="text-xs font-bold text-zinc-600 mt-0.5">
                            Total: <strong className="text-zinc-900 font-black">{item.original_weight} {item.unit}</strong> @ {formatCurrency(item.price_per_kg)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-wider shadow-2xs ${
                              isFullyMoved
                                ? "bg-rose-100 border-rose-300 text-rose-800"
                                : isPartiallyMoved
                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                : "bg-emerald-100 border-emerald-300 text-emerald-900"
                            }`}
                          >
                            Keeps: {remaining} {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Transfer Controls */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2.5 border-t border-zinc-200/80">
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                          Move to Bill 2:
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                          <button
                            type="button"
                            onClick={() => handleAdjustStep(item.product_id, -1)}
                            disabled={item.moved_weight <= 0}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-xs cursor-pointer"
                            title="Decrease portion"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <input
                            type="number"
                            step={item.unit?.toLowerCase().includes("kg") ? "0.05" : "1"}
                            min="0"
                            max={item.original_weight}
                            value={item.moved_weight}
                            onChange={(e) => handleSetMovedWeight(item.product_id, Number(e.target.value))}
                            className="w-16 h-8 text-center font-black font-mono text-sm bg-white border-2 border-zinc-300 focus:border-zinc-900 rounded-lg outline-none shadow-inner"
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjustStep(item.product_id, 1)}
                            disabled={item.moved_weight >= item.original_weight}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-xs cursor-pointer"
                            title="Increase portion"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              item.moved_weight === item.original_weight
                                ? handleKeepAll(item.product_id)
                                : handleMoveAll(item.product_id)
                            }
                            className={`h-8 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer ${
                              item.moved_weight === item.original_weight
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {item.moved_weight === item.original_weight ? "Clear" : "All"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right Column: New Divided Bill (Target) ── */}
            <div className="bg-white border-2 border-indigo-400 rounded-2xl p-4.5 flex flex-col shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b-2 border-zinc-100 mb-3.5">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-600 text-white font-mono text-[10px] uppercase font-black tracking-wider mb-1 shadow-xs">
                    Bill 2 (New Bill)
                  </span>
                  <h4 className="text-sm font-black text-zinc-950 truncate max-w-[180px]">
                    {newCustomerName.trim() || "Guest 2 (New Bill)"}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-extrabold text-indigo-700 tracking-wider block">
                    New Bill Total
                  </span>
                  <span className="text-lg font-black text-indigo-700 tracking-tight font-mono">
                    {formatCurrency(bill2NewTotal)}
                  </span>
                </div>
              </div>

              {/* Guest 2 Details Form */}
              <div className="space-y-2.5 mb-3 bg-zinc-50 border-2 border-zinc-200 p-3.5 rounded-xl shadow-xs">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 mb-1">
                    <User className="w-3 h-3 text-zinc-600" />
                    <span>Customer / Guest Name (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John / Table Guest 2..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold rounded-lg bg-white border-2 border-zinc-300 focus:border-indigo-600 text-zinc-900 placeholder-zinc-400 outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3 h-3 text-zinc-600" />
                    <span>Customer Phone (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0712345678"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold rounded-lg bg-white border-2 border-zinc-300 focus:border-indigo-600 text-zinc-900 placeholder-zinc-400 outline-none transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Items Moved to Bill 2 */}
              <div className="flex-1 overflow-y-auto max-h-[240px] space-y-2 pr-1">
                {movedItemsList.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50/80">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2.5 shadow-xs">
                      <Split className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <p className="text-sm font-black text-zinc-900">No items selected yet</p>
                    <p className="text-xs font-semibold text-zinc-500 mt-0.5 max-w-xs">
                      Use the controls on the left to allocate items or quantities to this guest
                    </p>
                  </div>
                ) : (
                  movedItemsList.map((it) => {
                    const discRate = it.original_weight > 0 ? it.discount / it.original_weight : 0;
                    const lineTot = Math.max(0, it.price_per_kg * it.moved_weight - discRate * it.moved_weight);

                    return (
                      <div
                        key={it.product_id}
                        className="p-3 rounded-xl bg-indigo-50/70 border-2 border-indigo-200 flex items-center justify-between shadow-xs transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-black text-zinc-950 uppercase tracking-tight truncate">
                            {it.product_name}
                          </p>
                          <p className="text-[11px] font-bold text-zinc-600 mt-0.5">
                            {it.moved_weight} {it.unit} × {formatCurrency(it.price_per_kg)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-black text-indigo-900 font-mono">
                            {formatCurrency(lineTot)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleKeepAll(it.product_id)}
                            className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Remove from Bill 2"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t-2 border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs">
            <button
              type="button"
              onClick={handleResetAll}
              disabled={!hasAnyMoved}
              className={`h-11 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 ${
                hasAnyMoved
                  ? "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-500/25 border-2 border-amber-600"
                  : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60 shadow-none"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Reset Selection</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-2 border-zinc-300 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-800 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isValidSplit}
                className={`flex-1 sm:flex-none h-11 px-7 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                  isValidSplit && !isSubmitting
                    ? "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/30"
                    : "bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed shadow-none"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dividing Bill...</span>
                  </>
                ) : (
                  <>
                    <Split className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm Divide Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
