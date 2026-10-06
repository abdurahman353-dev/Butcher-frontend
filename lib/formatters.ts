/**
 * Butcher POS System - Standard Formatting Utilities
 * Adheres strictly to:
 * - Currency: KSh 2,125.00
 * - Weight: 2.500 KG
 */

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return "KSh 0.00";

  const formatted = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return `KSh ${formatted}`;
}

export function formatWeight(weight: number | string | null | undefined, unit: string = "KG"): string {
  const num = typeof weight === "string" ? parseFloat(weight) : Number(weight ?? 0);
  const u = (unit || "KG").toUpperCase();
  if (isNaN(num)) {
    return `0 ${formatUnitLabel(u)}`;
  }

  const isWholeUnit = ["PACK", "PCS", "PLATE", "PORTION", "BOTTLE", "CUP", "BOWL", "GLASS", "UNIT"].includes(u);
  if (isWholeUnit) {
    const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(2);
    if (u === "PACK") return `${formatted} ${num === 1 ? "Pack" : "Packs"}`;
    if (u === "PCS") return `${formatted} ${num === 1 ? "Pc" : "Pcs"}`;
    if (u === "PLATE") return `${formatted} ${num === 1 ? "Plate" : "Plates"}`;
    if (u === "PORTION") return `${formatted} ${num === 1 ? "Portion" : "Portions"}`;
    if (u === "BOTTLE") return `${formatted} ${num === 1 ? "Bottle" : "Bottles"}`;
    if (u === "CUP") return `${formatted} ${num === 1 ? "Cup" : "Cups"}`;
    if (u === "BOWL") return `${formatted} ${num === 1 ? "Bowl" : "Bowls"}`;
    if (u === "GLASS") return `${formatted} ${num === 1 ? "Glass" : "Glasses"}`;
    return `${formatted} ${u}`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(num);

  return `${formatted} ${u}`;
}

export function formatUnitLabel(unit: string = "KG"): string {
  const u = (unit || "KG").toUpperCase();
  if (u === "PACK") return "Pack";
  if (u === "PCS") return "Pc";
  if (u === "PLATE") return "Plate";
  if (u === "PORTION") return "Portion";
  if (u === "BOTTLE") return "Bottle";
  if (u === "CUP") return "Cup";
  if (u === "BOWL") return "Bowl";
  if (u === "GLASS") return "Glass";
  return "KG";
}

export function formatUnitRate(price: number | string | null | undefined, unit: string = "KG"): string {
  return `${formatCurrency(price)} / ${formatUnitLabel(unit)}`;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatTimeOnly(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateOnly(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
