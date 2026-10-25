"use client";

import React from "react";
import { Product } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { AlertTriangle, Infinity as InfinityIcon } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isRestaurant?: boolean;
  canDrag?: boolean;
  onDragStartItem?: (product: Product) => void;
  onDragOverItem?: (product: Product) => void;
  onDragLeaveItem?: (product: Product) => void;
  onDropOnItem?: (targetProduct: Product) => void;
  isDragOver?: boolean;
  isBeingDragged?: boolean;
}

export function ProductCard({
  product,
  onSelect,
  isRestaurant = false,
  canDrag = false,
  onDragStartItem,
  onDragOverItem,
  onDragLeaveItem,
  onDropOnItem,
  isDragOver = false,
  isBeingDragged = false,
}: ProductCardProps) {
  const isDraggingRef = React.useRef(false);
  const dragStartTimeRef = React.useRef(0);

  const isInfinite = product.current_stock >= 9999;
  const isOutOfStock = !isInfinite && product.current_stock <= 0;
  const isLowStock =
    !isInfinite && !isOutOfStock && product.current_stock <= product.min_stock;

  // Format unit label e.g., "/ pc", "/ kg", "/ plate"
  const unitLabel = (() => {
    const u = (product.unit || "").toUpperCase();
    if (!u) return "";
    const map: Record<string, string> = {
      KG: "/ kg",
      PACK: "/ pack",
      PCS: "/ pc",
      PLATE: "/ plate",
      PORTION: "/ portion",
      BOTTLE: "/ btl",
      CUP: "/ cup",
      BOWL: "/ bowl",
      GLASS: "/ glass",
      BOX: "/ box",
      TRIP: "/ trip",
    };
    return map[u] || `/${u.toLowerCase()}`;
  })();

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return;
        isDraggingRef.current = true;
        dragStartTimeRef.current = Date.now();
        e.dataTransfer.setData("application/pos-product-id", product.id.toString());
        e.dataTransfer.effectAllowed = "move";
        onDragStartItem?.(product);
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      onDragOver={(e) => {
        if (!isRestaurant) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverItem?.(product);
      }}
      onDragLeave={() => {
        if (!isRestaurant) return;
        onDragLeaveItem?.(product);
      }}
      onDrop={(e) => {
        if (!isRestaurant) return;
        e.preventDefault();
        onDropOnItem?.(product);
      }}
      onClick={() => {
        if (isDraggingRef.current) return;
        if (Date.now() - dragStartTimeRef.current < 250 && dragStartTimeRef.current > 0) return;
        if (!isOutOfStock) onSelect(product);
      }}
      title={isRestaurant ? "Click to add/increment, or drag to reposition / drop into category" : undefined}
      className={`group relative rounded-xl bg-white shadow-2xs flex flex-col justify-between transition-all duration-150 select-none overflow-hidden p-2.5 sm:p-3 ${
        isBeingDragged
          ? "opacity-30 scale-95 border-2 border-dashed border-zinc-400"
          : isDragOver
          ? "border-2 border-dashed border-emerald-600 bg-emerald-50 scale-105 shadow-lg ring-2 ring-emerald-500/50"
          : isOutOfStock
          ? "border border-zinc-200 opacity-50 cursor-not-allowed bg-zinc-50/80"
          : "border-2 border-emerald-500 hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.97] active:bg-emerald-50/20"
      } ${isRestaurant ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ minHeight: "92px" }}
    >
      {/* Top Header Row: Product Name + High-Visibility Stock Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm sm:text-base md:text-[17px] font-bold text-zinc-900 leading-snug line-clamp-2 capitalize group-hover:text-emerald-700 transition-colors">
          {product.name}
        </h3>

        {/* Stock Badge - compact and balanced */}
        <div className="shrink-0 pt-0.5">
          {isInfinite ? (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-0.5"
              title="Unlimited Stock"
            >
              <InfinityIcon className="w-3 h-3 text-zinc-600" />
            </span>
          ) : isOutOfStock ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-red-600 text-white tracking-wide">
              OUT
            </span>
          ) : isLowStock ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500 text-white flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5 text-white shrink-0" />
              {formatWeight(product.current_stock, product.unit)}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-300 tabular-nums">
              {formatWeight(product.current_stock, product.unit)}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Price + Unit on one clean line */}
      <div className="mt-2.5 flex items-baseline justify-between gap-1 pt-1.5 border-t border-zinc-100">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <p className="text-sm sm:text-base md:text-lg font-black text-emerald-700 tabular-nums leading-none whitespace-nowrap">
            {formatCurrency(product.price_per_kg)}
          </p>
          {unitLabel && (
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-400 whitespace-nowrap">
              {unitLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
