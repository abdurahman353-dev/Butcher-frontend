"use client";

import React, { useState, useRef, useEffect } from "react";
import { CartItem } from "@/types";
import { formatCurrency, formatWeight, formatUnitLabel } from "@/lib/formatters";
import { Trash2, Plus, Minus, Tag, X, Check } from "lucide-react";

interface CartItemRowProps {
  item: CartItem;
  onAdjustWeight: (id: string, deltaKg: number) => void;
  onOpenWeightEdit: (item: CartItem) => void;
  onRemove: (id: string) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  readOnly?: boolean;
  canDiscount?: boolean;
}

export function CartItemRow({
  item,
  onAdjustWeight,
  onOpenWeightEdit,
  onRemove,
  onUpdateDiscount,
  readOnly = false,
  canDiscount = true,
}: CartItemRowProps) {
  const isAtMaxStock =
    typeof item.available_stock === "number" &&
    item.available_stock < 9999 &&
    item.weight >= item.available_stock;

  // Recognise all discrete countable restaurant & butchery units
  const isCountable = [
    "PACK",
    "PCS",
    "PLATE",
    "PORTION",
    "BOTTLE",
    "CUP",
    "BOWL",
    "GLASS",
    "UNIT",
  ].includes((item.unit || "").toUpperCase());

  const stepDelta = isCountable ? 1 : 0.25;
  const unitLabel = formatUnitLabel(item.unit);

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState(
    item.discount > 0 ? String(item.discount) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external discount resets
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

  // Compact Single-Row Layout for Saved Items (Sent to Kitchen)
  if (readOnly) {
    return (
      <div className="py-1 px-2.5 bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-lg flex items-center justify-between gap-2 shadow-2xs transition-colors">
        {/* Left: Quantity Pill + Product Name & Unit Price */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-xs font-black text-zinc-950 tabular-nums">
            {formatWeight(item.weight, item.unit)}
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-black text-zinc-950 truncate leading-tight">
              {item.product_name}
            </h4>
            <p className="text-[10px] font-bold text-zinc-500 leading-none mt-0.5">
              {formatCurrency(item.price_per_kg)}/{unitLabel}
            </p>
          </div>
        </div>

        {/* Right: Subtotal + Sent Status */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <span className="text-sm font-black text-emerald-700 tabular-nums">
            {formatCurrency(item.subtotal)}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"
            title="Sent to Kitchen"
          >
            <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
            <span className="hidden xs:inline">Sent</span>
          </span>
        </div>
      </div>
    );
  }

  // Active / Editable Cart Item: Ultra-compact single-row so it doesn't fill the screen
  return (
    <div className="py-1.5 px-2.5 bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-lg flex flex-col gap-1 shadow-2xs transition-colors">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Compact Stepper + Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-0.5 bg-zinc-100 border border-zinc-300 rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onAdjustWeight(item.id, -stepDelta)}
              className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-transform"
              title={isCountable ? "Decrease 1" : "Decrease 250g"}
            >
              <Minus className="w-3 h-3 text-zinc-900" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={() => onOpenWeightEdit(item)}
              className="px-1.5 text-xs font-black text-zinc-950 tabular-nums hover:text-emerald-700 transition-colors"
              title="Click to enter exact quantity"
            >
              {formatWeight(item.weight, item.unit)}
            </button>

            <button
              type="button"
              onClick={() => onAdjustWeight(item.id, stepDelta)}
              disabled={isAtMaxStock}
              className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-transform disabled:opacity-30"
              title={isCountable ? "Increase 1" : "Increase 250g"}
            >
              <Plus className="w-3 h-3 text-zinc-900" strokeWidth={2.5} />
            </button>
          </div>

          {/* Product Name & unit rate */}
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-black text-zinc-950 truncate leading-tight">
              {item.product_name}
            </h4>
            <p className="text-[10px] font-bold text-zinc-500 leading-none mt-0.5">
              {formatCurrency(item.price_per_kg)}/{unitLabel}
              {item.discount > 0 && (
                <span className="text-amber-700 font-extrabold ml-1">(-{formatCurrency(item.discount)})</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Subtotal + Actions */}
        <div className="flex items-center gap-1.5 shrink-0 text-right">
          <span className="text-sm font-black text-emerald-700 tabular-nums">
            {formatCurrency(item.subtotal)}
          </span>

          {canDiscount && (
            <button
              type="button"
              onClick={handleDiscountToggle}
              title={item.discount > 0 ? `Discount: -${formatCurrency(item.discount)}` : "Add item discount"}
              className={`p-1 rounded text-xs transition-colors ${
                item.discount > 0 ? "bg-amber-500 text-white" : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Discount Input (collapsible) */}
      {showDiscount && (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded p-1 animate-in fade-in duration-100">
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
            placeholder="Discount KSh"
            className="flex-1 min-w-[4rem] bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs font-bold text-amber-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyDiscount}
            className="text-xs font-black text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded"
          >
            OK
          </button>
          <button
            type="button"
            onClick={clearDiscount}
            className="text-zinc-500 hover:text-red-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
