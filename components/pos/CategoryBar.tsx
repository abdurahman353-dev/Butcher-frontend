"use client";

import React from "react";
import { Category } from "@/types";

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryBar({ categories, selectedCategoryId, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto select-none" style={{ scrollbarWidth: "none" }}>
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
          selectedCategoryId === "all"
            ? "bg-green-600 text-white border-green-600"
            : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        All
      </button>
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id.toString();
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id.toString())}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border flex items-center gap-1 ${
              isSelected
                ? "bg-green-600 text-white border-green-600"
                : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <span>{cat.icon || "🥩"}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
