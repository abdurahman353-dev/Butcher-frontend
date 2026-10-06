"use client";

import React, { useState, useRef, useEffect } from "react";
import { CartItem } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { Trash2, Plus, Minus, Edit2, Tag, X } from "lucide-react";

interface CartItemRowProps {
  item: CartItem;
  onAdjustWeight: (id: string, deltaKg: number) => void;
  onOpenWeightEdit: (item: CartItem) => void;
  onRemove: (id: string) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  readOnly?: boolean;
}

export function CartItemRow({
  item,
  onAdjustWeight,
  onOpenWeightEdit,
  onRemove,
  onUpdateDiscount,
  readOnly = false,
}: CartItemRowProps) {
  const isAtMaxStock =
    typeof item.available_stock === "number" &&
    item.available_stock < 9999 &&
    item.weight >= item.available_stock;
  const isCountable =
    item.unit?.toUpperCase() === "PACK" || item.unit?.toUpperCase() === "PCS";
  const stepDelta = isCountable ? 1 : 0.25;
  const unitLabel =
    item.unit?.toUpperCase() === "PACK"
      ? "Pack"
      : item.unit?.toUpperCase() === "PCS"
      ? "Pc"
      : "KG";

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState(
    item.discount > 0 ? String(item.discount) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external discount resets (e.g. when cart is restored from storage)
  useEffect(() => {
    if (!showDiscount) {
      setDiscountInput(item.discount > 0 ? String(item.discount) : "");
    }
  }, [item.discount, showDiscount]);

  const rawSubtotal = item.weight * item.price_per_kg;

  const handleDiscountToggle = () => {
    if (showDiscount) {
      setShowDiscount(false);
    } else {
      setShowDiscount(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setDiscountInput(val);
    }
  };

  const applyDiscount = () => {
    const parsed = parseFloat(discountInput) || 0;
    const capped = Math.min(Math.max(0, parsed), rawSubtotal);
    onUpdateDiscount(item.id, capped);
    setDiscountInput(capped > 0 ? String(capped) : "");
    setShowDiscount(false);
  };

  const clearDiscount = () => {
    onUpdateDiscount(item.id, 0);
    setDiscountInput("");
    setShowDiscount(false);
  };

  return (
    <div className="p-3 bg-white border border-zinc-200 rounded-lg flex flex-col gap-2 hover:border-zinc-300 transition-colors">
      {/* Top: name + subtotal */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 truncate">
            {item.product_name}
          </h4>
          <p className="text-[11px] text-zinc-400">
            {formatCurrency(item.price_per_kg)} / {unitLabel}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-green-700 tabular-nums">
            {formatCurrency(item.subtotal)}
          </span>
          {item.discount > 0 && (
            <p className="text-[10px] text-amber-600 font-medium">
              -{formatCurrency(item.discount)} off
            </p>
          )}
        </div>
      </div>

      {/* Inline Discount Input — wraps gracefully on small screens */}
      {showDiscount && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border-2 border-amber-400 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 shrink-0">
            <Tag className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-extrabold text-amber-900 tracking-tight">Disc KSh</span>
          </div>
          <input
            ref={inputRef}
            type="number"
            min="0"
            max={rawSubtotal}
            step="0.5"
            value={discountInput}
            onChange={handleDiscountChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDiscount();
              if (e.key === "Escape") setShowDiscount(false);
            }}
            placeholder="Enter amount"
            className="flex-1 min-w-[6rem] bg-white border-2 border-amber-400 rounded-lg px-3 py-1.5 text-base font-bold text-amber-900 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-amber-700 font-semibold font-mono whitespace-nowrap hidden xs:inline sm:inline">
              max {formatCurrency(rawSubtotal)}
            </span>
            <button
              type="button"
              onClick={applyDiscount}
              className="text-sm font-black text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              OK
            </button>
            <button
              type="button"
              onClick={clearDiscount}
              title="Remove discount"
              className="text-zinc-500 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom: weight adjuster + discount badge + remove — hidden when readOnly (order saved) */}
      {readOnly ? (
        /* Read-only saved state */
        <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
          <span className="text-xs font-semibold text-zinc-500">
            {formatWeight(item.weight, item.unit)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sent to Kitchen
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
          {/* Weight stepper — larger touch targets on mobile */}
          <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onAdjustWeight(item.id, -stepDelta)}
              className="w-8 h-8 sm:w-6 sm:h-6 rounded flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
              title={isCountable ? "Decrease 1" : "Decrease 250g"}
            >
              <Minus className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>

            <button
              type="button"
              onClick={() => onOpenWeightEdit(item)}
              className="px-2 py-1 sm:py-0.5 text-xs font-bold text-zinc-800 hover:text-green-700 tabular-nums flex items-center gap-0.5 transition-colors"
              title="Click to enter exact quantity"
            >
              <span>{formatWeight(item.weight, item.unit)}</span>
              <Edit2 className="w-2.5 h-2.5 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => onAdjustWeight(item.id, stepDelta)}
              disabled={isAtMaxStock}
              className={`w-8 h-8 sm:w-6 sm:h-6 rounded flex items-center justify-center border transition-colors ${
                isAtMaxStock
                  ? "bg-zinc-100 border-zinc-200 text-zinc-300 cursor-not-allowed"
                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200"
              }`}
              title={
                isAtMaxStock
                  ? `Max available stock reached (${formatWeight(item.available_stock ?? 0)})`
                  : "Increase 250g"
              }
            >
              <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {isAtMaxStock && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Max ({formatWeight(item.available_stock ?? 0)})
              </span>
            )}

            {/* Discount toggle badge — larger touch target on mobile */}
            <button
              type="button"
              onClick={handleDiscountToggle}
              title={item.discount > 0 ? `Discount: -${formatCurrency(item.discount)} (click to edit)` : "Add item discount"}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-xs font-bold border transition-colors ${
                item.discount > 0
                  ? "bg-amber-500 border-amber-600 text-white hover:bg-amber-600 active:bg-amber-700"
                  : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400"
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{item.discount > 0 ? `-${formatCurrency(item.discount)}` : "Disc"}</span>
            </button>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-2.5 sm:p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 active:bg-red-600 transition-colors"
              title="Remove from sale"
            >
              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
