"use client";

import React, { useState, useMemo } from "react";
import { Product, Category } from "@/types";
import { ProductCard } from "./ProductCard";
import { CategoryBar } from "./CategoryBar";
import { Search, X, PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  isLoading?: boolean;
  isRestaurant?: boolean;
  canDrag?: boolean;
  onUpdateProduct?: (productId: number, patch: Partial<Product>) => void;
}

export function ProductGrid({
  products,
  categories,
  onSelectProduct,
  isLoading = false,
  isRestaurant = false,
  canDrag = false,
  onUpdateProduct,
}: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Drag-and-drop state for products
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<number | null>(null);

  // Custom product order from localStorage + DB sync
  const [customOrderIds, setCustomOrderIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!isRestaurant) return;
    // 1) Instant: apply localStorage cache
    try {
      const saved = localStorage.getItem("pos_restaurant_product_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCustomOrderIds(parsed);
      }
    } catch (_) {}
    // 2) Background: fetch authoritative order from DB
    import("@/services/products.service").then(({ productsService }) => {
      productsService.getDisplayOrder().then(({ product_order }) => {
        if (Array.isArray(product_order) && product_order.length > 0) {
          try { localStorage.setItem("pos_restaurant_product_order", JSON.stringify(product_order)); } catch (_) {}
          setCustomOrderIds(product_order);
        }
      }).catch(() => {});
    });
  }, [isRestaurant]);

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (!p.is_active) return false;

      if (selectedCategory !== "all" && p.category_id.toString() !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.category_name || "").toLowerCase().includes(query)
        );
      }

      return true;
    });

    if (!isRestaurant || customOrderIds.length === 0) {
      return list;
    }

    // Sort by custom order
    const orderMap = new Map<number, number>();
    customOrderIds.forEach((id, idx) => orderMap.set(id, idx));

    return [...list].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
      if (idxA !== idxB) return idxA - idxB;
      return 0;
    });
  }, [products, selectedCategory, searchQuery, isRestaurant, customOrderIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const p of products) {
      if (p.is_active) {
        total++;
        const catId = p.category_id ? p.category_id.toString() : "";
        if (catId) {
          counts[catId] = (counts[catId] || 0) + 1;
        }
      }
    }
    return { counts, total };
  }, [products]);

  // Handle direct swap between product at position A and product at position F (vice versa)
  const handleDropOnProduct = (targetProduct: Product) => {
    if (!draggedProductId || draggedProductId === targetProduct.id) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      return;
    }

    // Build the master list of product IDs reflecting current visual order
    let masterIds = [...customOrderIds];
    if (masterIds.length === 0) {
      masterIds = products.map((p) => p.id);
    } else {
      for (const p of products) {
        if (!masterIds.includes(p.id)) {
          masterIds.push(p.id);
        }
      }
    }

    const idxA = masterIds.indexOf(draggedProductId);
    const idxF = masterIds.indexOf(targetProduct.id);

    if (idxA !== -1 && idxF !== -1) {
      const swapped = [...masterIds];
      const temp = swapped[idxA];
      swapped[idxA] = swapped[idxF];
      swapped[idxF] = temp;

      setCustomOrderIds(swapped);
      // 1) Instant local cache
      try { localStorage.setItem("pos_restaurant_product_order", JSON.stringify(swapped)); } catch (_) {}
      // 2) Persist to DB in background so all accounts sync
      import("@/services/products.service").then(({ productsService }) => {
        productsService.updateDisplayOrder({ product_order: swapped }).catch(() => {});
      });
    }

    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  // Handle dropping product onto a category pill to move it to that category
  const handleDropItemOnCategory = async (productId: number, categoryId: number) => {
    const targetCat = categories.find((c) => c.id === categoryId);
    try {
      const { productsService } = await import("@/services/products.service");
      await productsService.updateProduct(productId, { category_id: categoryId });
      onUpdateProduct?.(productId, {
        category_id: categoryId,
        category_name: targetCat?.name || "",
      });
    } catch (err) {
      console.error("Failed to move product to category:", err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-50">
      {/* Search + Categories */}
      <div className="p-3 border-b border-zinc-200 bg-white space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRestaurant ? "Search item, dish, or SKU..." : "Search cut, meat name, or SKU..."}
            className="w-full bg-zinc-50 border-2 border-emerald-500 rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <CategoryBar
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={setSelectedCategory}
          productCounts={categoryCounts.counts}
          totalCount={categoryCounts.total}
          isRestaurant={isRestaurant}
          canDrag={canDrag}
          onDropItemOnCategory={canDrag ? handleDropItemOnCategory : undefined}
        />
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && filteredProducts.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-zinc-200 p-4 animate-pulse h-36 flex flex-col justify-between"
              >
                <div className="h-4 bg-zinc-200 rounded w-2/3" />
                <div className="h-6 bg-zinc-100 rounded w-1/2" />
                <div className="h-8 bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={isRestaurant ? "No menu items found" : "No cuts found"}
            description={
              searchQuery
                ? `No ${isRestaurant ? "items" : "products"} matching "${searchQuery}". Try a different term or clear the search.`
                : `No ${isRestaurant ? "menu items" : "products"} available in this category.`
            }
            icon={PackageOpen}
            actionLabel={searchQuery || selectedCategory !== "all" ? "Clear Filters" : undefined}
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
                isRestaurant={isRestaurant}
                canDrag={canDrag}
                isBeingDragged={draggedProductId === product.id}
                isDragOver={dragOverProductId === product.id}
                onDragStartItem={canDrag ? () => setDraggedProductId(product.id) : undefined}
                onDragOverItem={canDrag ? () => {
                  if (draggedProductId && draggedProductId !== product.id) {
                    setDragOverProductId(product.id);
                  }
                } : undefined}
                onDragLeaveItem={canDrag ? () => {
                  if (dragOverProductId === product.id) {
                    setDragOverProductId(null);
                  }
                } : undefined}
                onDropOnItem={canDrag ? handleDropOnProduct : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
