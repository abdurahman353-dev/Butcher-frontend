"use client";

import React from "react";
import { CartItem } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { Trash2, Plus, Minus, Edit2 } from "lucide-react";

interface CartItemRowProps {
  item: CartItem;
  onAdjustWeight: (id: string, deltaKg: number) => void;
  onOpenWeightEdit: (item: CartItem) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onAdjustWeight, onOpenWeightEdit, onRemove }: CartItemRowProps) {
  const isAtMaxStock = typeof item.available_stock === "number" && item.weight >= item.available_stock;

  return (
    <div className="p-3 bg-white border border-zinc-200 rounded-lg flex flex-col gap-2 hover:border-zinc-300 transition-colors">
      {/* Top: name + subtotal */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 truncate">{item.product_name}</h4>
          <p className="text-[11px] text-zinc-400">{formatCurrency(item.price_per_kg)} / KG</p>
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

      {/* Bottom: weight adjuster + remove */}
      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onAdjustWeight(item.id, -0.25)}
            className="w-6 h-6 rounded flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors"
            title="Decrease 250g"
          >
            <Minus className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => onOpenWeightEdit(item)}
            className="px-2 py-0.5 text-xs font-bold text-zinc-800 hover:text-green-700 tabular-nums flex items-center gap-0.5 transition-colors"
            title="Click to enter exact weight"
          >
            <span>{formatWeight(item.weight)}</span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={() => onAdjustWeight(item.id, 0.25)}
            disabled={isAtMaxStock}
            className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
              isAtMaxStock
                ? "bg-zinc-100 border-zinc-200 text-zinc-300 cursor-not-allowed"
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            }`}
            title={
              isAtMaxStock
                ? `Max available stock reached (${formatWeight(item.available_stock ?? 0)})`
                : "Increase 250g"
            }
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {isAtMaxStock && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Max ({formatWeight(item.available_stock ?? 0)})
          </span>
        )}

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Remove from sale"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
