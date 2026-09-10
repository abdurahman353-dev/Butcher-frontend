import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  type?: "sale" | "stock" | "shift" | "payment";
}

export function StatusBadge({ status, className = "", type = "sale" }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200";
  let label = status;

  if (type === "sale" || type === "payment") {
    if (normalized === "completed" || normalized === "paid") {
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = "Completed";
    } else if (normalized === "refunded") {
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      label = "Refunded";
    } else if (normalized === "partially_refunded" || normalized === "partial_refund") {
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      label = "Partially Refunded";
    } else if (normalized === "credit" || normalized === "unpaid" || normalized === "pay_later") {
      styles = "bg-amber-50 text-amber-800 border-amber-300 font-bold";
      label = "Pay Later (Due)";
    } else if (normalized === "pending" || normalized === "processing") {
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      label = "Pending";
    } else if (normalized === "failed" || normalized === "cancelled") {
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      label = "Failed";
    }
  } else if (type === "stock") {
    if (normalized === "good") {
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = "Good Stock";
    } else if (normalized === "low" || normalized === "low_stock") {
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      label = "Low Stock";
    } else if (normalized === "out_of_stock") {
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      label = "Out of Stock";
    }
  } else if (type === "shift") {
    if (normalized === "open") {
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = "Active Shift";
    } else {
      styles = "bg-slate-100 text-slate-600 border-slate-200";
      label = "Closed";
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  );
}
