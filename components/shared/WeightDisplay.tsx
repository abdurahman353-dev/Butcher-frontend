import React from "react";
import { formatWeight } from "@/lib/formatters";

interface WeightDisplayProps {
  weight: number | string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showUnit?: boolean;
}

export function WeightDisplay({ weight, className = "", size = "md" }: WeightDisplayProps) {
  const formatted = formatWeight(weight);

  const sizeClasses = {
    sm: "text-xs font-medium text-slate-500",
    md: "text-sm font-semibold text-slate-700",
    lg: "text-base font-bold text-slate-900",
    xl: "text-xl font-bold text-slate-900",
  };

  return <span className={`tabular-nums ${sizeClasses[size]} ${className}`}>{formatted}</span>;
}
