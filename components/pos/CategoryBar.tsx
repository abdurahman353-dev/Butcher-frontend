"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Category } from "@/types";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  productCounts?: Record<string, number>;
  totalCount?: number;
  isRestaurant?: boolean;
  onReorderCategories?: (reorderedCategories: Category[]) => void;
  onDropItemOnCategory?: (productId: number, categoryId: number) => void;
}

function getCategoryCountBadgeStyle(name: string, count: number, isSelected: boolean): string {
  if (isSelected) {
    return "bg-white text-green-700 font-black shadow-2xs";
  }
  if (count <= 0) {
    return "bg-zinc-100 text-zinc-400 font-semibold";
  }

  const lower = name.toLowerCase();
  if (lower.includes("beef")) {
    return "bg-rose-500 text-white font-bold shadow-2xs";
  }
  if (lower.includes("sausage") || lower.includes("deli") || lower.includes("boerewors")) {
    return "bg-orange-500 text-white font-bold shadow-2xs";
  }
  if (lower.includes("goat") || lower.includes("mbuzi")) {
    return "bg-amber-600 text-white font-bold shadow-2xs";
  }
  if (lower.includes("chicken") || lower.includes("poultry") || lower.includes("kuku") || lower.includes("duck")) {
    return "bg-amber-500 text-white font-bold shadow-2xs";
  }
  if (lower.includes("fish") || lower.includes("seafood")) {
    return "bg-sky-500 text-white font-bold shadow-2xs";
  }
  if (lower.includes("pork") || lower.includes("lamb")) {
    return "bg-pink-600 text-white font-bold shadow-2xs";
  }
  if (lower.includes("mince") || lower.includes("burger")) {
    return "bg-red-600 text-white font-bold shadow-2xs";
  }
  if (lower.includes("egg") || lower.includes("dairy")) {
    return "bg-yellow-500 text-zinc-900 font-bold shadow-2xs";
  }

  return "bg-emerald-600 text-white font-bold shadow-2xs";
}

export function CategoryBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productCounts = {},
  totalCount,
  isRestaurant = false,
  onReorderCategories,
  onDropItemOnCategory,
}: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag and drop state
  const [draggedCatId, setDraggedCatId] = useState<number | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<number | null>(null);
  const [itemHoverCatId, setItemHoverCatId] = useState<number | null>(null);

  // Ordered categories respecting saved custom order in restaurant mode
  const [orderedCategories, setOrderedCategories] = useState<Category[]>(categories);

  useEffect(() => {
    if (!isRestaurant) {
      setOrderedCategories(categories);
      return;
    }
    try {
      const saved = localStorage.getItem("pos_restaurant_category_order");
      if (saved) {
        const orderIds: number[] = JSON.parse(saved);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const map = new Map<number, Category>();
          categories.forEach((c) => map.set(c.id, c));
          const sorted: Category[] = [];
          for (const id of orderIds) {
            const found = map.get(id);
            if (found) {
              sorted.push(found);
              map.delete(id);
            }
          }
          // append any newly added categories not yet in saved order
          map.forEach((c) => sorted.push(c));
          setOrderedCategories(sorted);
          return;
        }
      }
    } catch (_) {}
    setOrderedCategories(categories);
  }, [categories, isRestaurant]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, orderedCategories]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  };

  const displayTotal =
    totalCount !== undefined
      ? totalCount
      : categories.reduce((sum, cat) => {
          const count = productCounts[cat.id.toString()] ?? cat.products_count ?? 0;
          return sum + count;
        }, 0);

  // Reorder category pills: direct swap between position A and position F
  const handleCategoryDrop = (targetCatId: number) => {
    if (!draggedCatId || draggedCatId === targetCatId) return;
    const fromIndex = orderedCategories.findIndex((c) => c.id === draggedCatId);
    const toIndex = orderedCategories.findIndex((c) => c.id === targetCatId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...orderedCategories];
    const temp = next[fromIndex];
    next[fromIndex] = next[toIndex];
    next[toIndex] = temp;
    setOrderedCategories(next);

    try {
      localStorage.setItem("pos_restaurant_category_order", JSON.stringify(next.map((c) => c.id)));
    } catch (_) {}

    onReorderCategories?.(next);
  };

  return (
    <div className="relative flex items-center">
      {/* ── Left arrow ── */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll categories left"
        className={`absolute left-0 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-lg text-white transition-all duration-200 shrink-0 ${
          canScrollLeft ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-75"
        }`}
        style={{ left: "-6px" }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* ── Left fade overlay — green-tinted ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-14 z-[5] pointer-events-none transition-opacity duration-200"
        style={{
          background: "linear-gradient(to right, rgba(220,252,231,0.97) 10%, rgba(220,252,231,0.6) 60%, transparent)",
          opacity: canScrollLeft ? 1 : 0,
        }}
      />

      {/* ── Scrollable pill row ── */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto select-none py-1.5 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* "All Cuts" / "All Items" pill */}
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 border shrink-0 ${
            selectedCategoryId === "all"
              ? "bg-green-600 text-white border-green-600 shadow-sm font-extrabold"
              : "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400"
          }`}
        >
          <span className="tracking-tight">{isRestaurant ? "All Items" : "All Cuts"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono leading-none transition-transform group-hover:scale-105 ${
              selectedCategoryId === "all"
                ? "bg-white text-green-700 font-black shadow-2xs"
                : "bg-green-600 text-white font-bold shadow-2xs"
            }`}
          >
            {displayTotal}
          </span>
        </button>

        {/* Individual category pills */}
        {orderedCategories.map((cat) => {
          const catIdStr = cat.id.toString();
          const isSelected = selectedCategoryId === catIdStr;
          const count = productCounts[catIdStr] ?? cat.products_count ?? 0;
          const badgeStyle = getCategoryCountBadgeStyle(cat.name, count, isSelected);

          const isBeingDragged = draggedCatId === cat.id;
          const isTargeted = dragOverCatId === cat.id;
          const isHoveredByItem = itemHoverCatId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              draggable={isRestaurant}
              onDragStart={(e) => {
                if (!isRestaurant) return;
                e.dataTransfer.setData("application/pos-category-id", cat.id.toString());
                e.dataTransfer.effectAllowed = "move";
                setDraggedCatId(cat.id);
              }}
              onDragEnd={() => {
                setDraggedCatId(null);
                setDragOverCatId(null);
                setItemHoverCatId(null);
              }}
              onDragOver={(e) => {
                if (!isRestaurant) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (draggedCatId && draggedCatId !== cat.id) {
                  setDragOverCatId(cat.id);
                } else if (e.dataTransfer.types.includes("application/pos-product-id")) {
                  setItemHoverCatId(cat.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverCatId === cat.id) setDragOverCatId(null);
                if (itemHoverCatId === cat.id) setItemHoverCatId(null);
              }}
              onDrop={(e) => {
                if (!isRestaurant) return;
                e.preventDefault();
                // Check if an item was dropped onto this category
                const prodIdStr = e.dataTransfer.getData("application/pos-product-id");
                if (prodIdStr) {
                  const prodId = parseInt(prodIdStr, 10);
                  if (!isNaN(prodId)) {
                    onDropItemOnCategory?.(prodId, cat.id);
                  }
                  setItemHoverCatId(null);
                  return;
                }
                // Check if another category was dropped here
                const catIdStr = e.dataTransfer.getData("application/pos-category-id");
                if (catIdStr) {
                  handleCategoryDrop(cat.id);
                }
                setDraggedCatId(null);
                setDragOverCatId(null);
                setItemHoverCatId(null);
              }}
              onClick={() => onSelectCategory(catIdStr)}
              title={isRestaurant ? "Click to filter, or drag to reposition / drop items here" : undefined}
              className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 border shrink-0 ${
                isRestaurant ? "cursor-grab active:cursor-grabbing" : ""
              } ${
                isHoveredByItem
                  ? "bg-emerald-100 border-2 border-emerald-600 scale-105 ring-2 ring-emerald-500 shadow-lg text-emerald-900"
                  : isTargeted
                  ? "border-2 border-dashed border-emerald-600 bg-emerald-50 scale-105 shadow-md"
                  : isBeingDragged
                  ? "opacity-40 scale-95 border-dashed border-zinc-400"
                  : isSelected
                  ? "bg-green-600 text-white border-green-600 shadow-sm font-extrabold"
                  : count > 0
                  ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 shadow-2xs"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <span className="truncate max-w-[170px] tracking-tight">{cat.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono leading-none transition-transform group-hover:scale-105 ${badgeStyle}`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Trailing spacer so last pill never hides under the right fade */}
        <div className="w-6 shrink-0" />
      </div>

      {/* ── Right fade overlay — green-tinted ── */}
      <div
        className="absolute right-0 top-0 bottom-0 w-14 z-[5] pointer-events-none transition-opacity duration-200"
        style={{
          background: "linear-gradient(to left, rgba(220,252,231,0.97) 10%, rgba(220,252,231,0.6) 60%, transparent)",
          opacity: canScrollRight ? 1 : 0,
        }}
      />

      {/* ── Right arrow ── */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll categories right"
        className={`absolute right-0 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-lg text-white transition-all duration-200 shrink-0 ${
          canScrollRight ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-75"
        }`}
        style={{ right: "-6px" }}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
