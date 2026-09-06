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
}

export function ProductGrid({ products, categories, onSelectProduct, isLoading = false }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
  }, [products, selectedCategory, searchQuery]);

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
            placeholder="Search cut, meat name, or SKU..."
            className="w-full bg-zinc-50 border border-zinc-300 rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
        />
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && filteredProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
            title="No cuts found"
            description={
              searchQuery
                ? `No products matching "${searchQuery}". Try a different term or clear the search.`
                : "No products available in this category."
            }
            icon={PackageOpen}
            actionLabel={searchQuery || selectedCategory !== "all" ? "Clear Filters" : undefined}
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
