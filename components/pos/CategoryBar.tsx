"use client";

import React from "react";
import { Category } from "@/types";

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

function getCategoryEmoji(cat: Category): string {
  if (cat.icon && cat.icon.trim()) return cat.icon;
  const name = (cat.name || "").toLowerCase();
  if (name.includes("goat") || name.includes("mbuzi")) return "🐐";
  if (name.includes("chicken") || name.includes("kuku") || name.includes("poultry")) return "🍗";
  if (name.includes("mince") || name.includes("burger") || name.includes("patty")) return "🍔";
  if (name.includes("sausage") || name.includes("deli") || name.includes("boerewors")) return "🌭";
  if (name.includes("offal") || name.includes("liver") || name.includes("matumbo") || name.includes("special")) return "🍲";
  if (name.includes("pork") || name.includes("pig")) return "🥓";
  if (name.includes("lamb") || name.includes("mutton")) return "🍖";
  if (name.includes("fish") || name.includes("seafood")) return "🐟";
  return "🥩";
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
            <span>{getCategoryEmoji(cat)}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
