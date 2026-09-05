"use client";

import React from "react";
import { Product } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { MeatImage } from "@/components/shared/MeatImage";
import { AlertTriangle, Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const isOutOfStock = product.current_stock <= 0;
  const isLowStock = !isOutOfStock && product.current_stock <= product.min_stock;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) onSelect(product);
      }}
      className={`group relative rounded-xl bg-white border flex flex-col justify-between transition-all duration-150 select-none overflow-hidden ${
        isOutOfStock
          ? "border-zinc-200 opacity-50 cursor-not-allowed"
          : "border-zinc-200 hover:border-green-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
      }`}
    >
      {/* Image area */}
      <div className="h-28 w-full overflow-hidden relative">
        <MeatImage category={product.category_name} name={product.name} />

        {/* Stock badge */}
        <div className="absolute bottom-2 right-2">
          {isOutOfStock ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
              OUT
            </span>
          ) : isLowStock ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              {formatWeight(product.current_stock)}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/90 text-zinc-600 border border-zinc-200">
              {formatWeight(product.current_stock)}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-zinc-900 line-clamp-1 group-hover:text-green-700 transition-colors">
          {product.name}
        </h3>
        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{product.sku}</p>

        <div className="mt-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Per KG</span>
            <p className="text-base font-bold text-green-700 tabular-nums leading-tight">
              {formatCurrency(product.price_per_kg)}
            </p>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            aria-label={`Add ${product.name} to sale`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isOutOfStock
                ? "bg-zinc-100 text-zinc-300"
                : "bg-green-600 text-white group-hover:bg-green-700"
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
