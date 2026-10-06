"use client";

import React from "react";
import { Product } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { MeatImage } from "@/components/shared/MeatImage";
import { AlertTriangle, Plus, Infinity as InfinityIcon } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const isInfinite = product.current_stock >= 9999;
  const isOutOfStock = !isInfinite && product.current_stock <= 0;
  const isLowStock = !isInfinite && !isOutOfStock && product.current_stock <= product.min_stock;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) onSelect(product);
      }}
      className={`group relative rounded-2xl bg-white border flex flex-col justify-between transition-all duration-150 select-none overflow-hidden ${
        isOutOfStock
          ? "border-zinc-200 opacity-50 cursor-not-allowed"
          : "border-zinc-200 hover:border-green-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.97] active:shadow-sm"
      }`}
    >
      {/* Color-block image area — taller for better visual impact */}
      <div className="h-32 w-full overflow-hidden relative">
        <MeatImage category={product.category_name} name={product.name} image={product.image} />

        {/* Stock badge — top-right so it doesn't overlap the code text */}
        <div className="absolute top-2 right-2">
          {isInfinite ? (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-700/90 text-white shadow-sm backdrop-blur-sm flex items-center gap-1" title="Unlimited Stock">
              <InfinityIcon className="w-3 h-3" />
            </span>
          ) : isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-600 text-white shadow-sm tracking-wide">
              OUT
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              {formatWeight(product.current_stock, product.unit)}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/30 text-white backdrop-blur-sm">
              {formatWeight(product.current_stock, product.unit)}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-zinc-900 line-clamp-1 group-hover:text-green-700 transition-colors leading-snug">
          {product.name}
        </h3>
        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 tracking-wide">{product.sku}</p>

        <div className="mt-2.5 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
              {(() => {
                const u = (product.unit || "KG").toUpperCase();
                const labels: Record<string, string> = {
                  KG: "Per KG", PACK: "Per Pack", PCS: "Per Pc",
                  PLATE: "Per Plate", PORTION: "Per Portion", BOTTLE: "Per Bottle",
                  CUP: "Per Cup", BOWL: "Per Bowl", GLASS: "Per Glass",
                };
                return labels[u] ?? `Per ${u}`;
              })()}
            </span>
            <p className="text-base font-black text-green-700 tabular-nums leading-tight">
              {formatCurrency(product.price_per_kg)}
            </p>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            aria-label={`Add ${product.name} to sale`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              isOutOfStock
                ? "bg-zinc-100 text-zinc-300 shadow-none"
                : "bg-green-600 text-white group-hover:bg-green-700 group-hover:scale-110 active:scale-95"
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
