import React from "react";
import { formatCurrency } from "@/lib/formatters";

interface MoneyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  highlight?: boolean;
}

export function MoneyDisplay({ amount, className = "", size = "md", highlight = false }: MoneyDisplayProps) {
  const formatted = formatCurrency(amount);

  const sizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-bold",
    lg: "text-base font-bold",
    xl: "text-xl font-bold tracking-tight",
    "2xl": "text-2xl sm:text-3xl font-bold tracking-tight",
  };

  const colorClass = highlight ? "text-blue-600" : "text-slate-900";

  return <span className={`tabular-nums ${sizeClasses[size]} ${colorClass} ${className}`}>{formatted}</span>;
}
