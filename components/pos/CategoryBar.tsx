"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Category } from "@/types";

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  productCounts?: Record<string, number>;
  isRestaurant?: boolean;
  isClothing?: boolean;
  canDrag?: boolean;
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
  isRestaurant = false,
  isClothing = false,
  canDrag = false,
  onReorderCategories,
  onDropItemOnCategory,
}: CategoryBarProps) {
  // Drag and drop state
  const [draggedCatId, setDraggedCatId] = useState<number | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<number | null>(null);
  const [itemHoverCatId, setItemHoverCatId] = useState<number | null>(null);

  // Ordered categories respecting saved custom order in restaurant mode
  const [orderedCategories, setOrderedCategories] = useState<Category[]>(categories);

  /** Apply a list of IDs to order categories, appending any not in list. */
  const applyOrder = useCallback((ids: number[], cats: Category[]) => {
    const map = new Map<number, Category>();
    cats.forEach((c) => map.set(c.id, c));
    const sorted: Category[] = [];
    for (const id of ids) {
      const found = map.get(id);
      if (found) { sorted.push(found); map.delete(id); }
    }
    map.forEach((c) => sorted.push(c));
    return sorted;
  }, []);

  useEffect(() => {
    if (!isRestaurant) {
      setOrderedCategories(categories);
      return;
    }
    // 1) Immediately apply localStorage cache (0 ms)
    try {
      const saved = localStorage.getItem("pos_restaurant_category_order");
      if (saved) {
        const ids: number[] = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length > 0) {
          setOrderedCategories(applyOrder(ids, categories));
        } else {
          setOrderedCategories(categories);
        }
      } else {
        setOrderedCategories(categories);
      }
    } catch (_) {
      setOrderedCategories(categories);
    }
    // 2) Fetch authoritative order from DB in background
    import("@/services/products.service").then(({ productsService }) => {
      productsService.getDisplayOrder().then(({ category_order }) => {
        if (Array.isArray(category_order) && category_order.length > 0) {
          try { localStorage.setItem("pos_restaurant_category_order", JSON.stringify(category_order)); } catch (_) {}
          setOrderedCategories((prev) => applyOrder(category_order, prev.length > 0 ? prev : categories));
        }
      }).catch(() => {/* silently ignore network error */});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isRestaurant]);


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

    const newIds = next.map((c) => c.id);
    // 1) Instant local cache
    try { localStorage.setItem("pos_restaurant_category_order", JSON.stringify(newIds)); } catch (_) {}
    // 2) Persist to DB in background so all accounts sync
    import("@/services/products.service").then(({ productsService }) => {
      productsService.updateDisplayOrder({ category_order: newIds }).catch(() => {});
    });

    onReorderCategories?.(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 px-1 select-none">
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
            draggable={canDrag}
            onDragStart={(e) => {
              if (!canDrag) return;
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
              if (!canDrag && !onDropItemOnCategory) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (canDrag && draggedCatId && draggedCatId !== cat.id) {
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
              if (!canDrag && !onDropItemOnCategory) return;
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
              // Check if another category was dropped here (superadmin only)
              if (canDrag) {
                const catIdStr2 = e.dataTransfer.getData("application/pos-category-id");
                if (catIdStr2) {
                  handleCategoryDrop(cat.id);
                }
              }
              setDraggedCatId(null);
              setDragOverCatId(null);
              setItemHoverCatId(null);
            }}
            onClick={() => onSelectCategory(catIdStr)}
            title={canDrag ? "Drag to reposition / drop items here" : isRestaurant ? "Drop items here" : undefined}
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 border ${
              canDrag ? "cursor-grab active:cursor-grabbing" : ""
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
            <span className="truncate max-w-[120px] tracking-tight">{cat.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none transition-transform group-hover:scale-105 ${badgeStyle}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
