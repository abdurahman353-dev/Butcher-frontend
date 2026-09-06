"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Product } from "@/types";
import { formatWeight } from "@/lib/formatters";
import { roundTo } from "@/lib/math";
import { useSystemDialog } from "@/contexts/DialogContext";
import { ArrowLeft, SlidersHorizontal, CheckCircle2 } from "lucide-react";

function StockAdjustForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("product_id");
  const { confirm, alert } = useSystemDialog();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(
    preselectedProductId ? Number(preselectedProductId) : 1
  );
  const [adjustmentKg, setAdjustmentKg] = useState<string>("");
  const [reason, setReason] = useState<string>("Audit Discrepancy");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await productsService.getProducts({ per_page: 100 });
      setProducts(res.data);
    }
    load();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const adjNum = parseFloat(adjustmentKg) || 0;
  const newStock = selectedProduct ? roundTo(selectedProduct.current_stock + adjNum, 3) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjNum === 0) {
      await alert({
        title: "Invalid Adjustment",
        message: "Please enter a non-zero adjustment amount (+KG to add, or -KG to reduce).",
        type: "warning",
      });
      return;
    }
    if (!reason.trim()) {
      await alert({
        title: "Reason Required",
        message: "An adjustment audit reason is mandatory for all inventory changes.",
        type: "warning",
      });
      return;
    }
    if (newStock < 0) {
      await alert({
        title: "Negative Stock Error",
        message: `Adjustment cannot result in negative stock. Current stock is ${formatWeight(
          selectedProduct?.current_stock || 0
        )}.`,
        type: "danger",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Confirm Stock Adjustment",
      message: `Adjust stock for "${selectedProduct?.name || 'Product'}" by ${
        adjNum > 0 ? `+${adjNum}` : adjNum
      } KG?\n\nReason: "${reason.trim()}".\nNew stock will be: ${formatWeight(newStock)}.`,
      confirmText: "Yes, Apply Adjustment",
      cancelText: "Cancel",
      type: adjNum < 0 ? "warning" : "info",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const updated = await inventoryService.adjustStock({
        product_id: selectedProductId,
        adjustment_kg: adjNum,
        reason,
        notes,
      });
      setSuccessMessage(
        `Adjusted ${updated.name} by ${adjNum > 0 ? `+${adjNum}` : adjNum} KG. New stock: ${formatWeight(
          updated.current_stock
        )}.`
      );
      setTimeout(() => {
        router.push("/inventory");
      }, 1500);
    } catch (err: any) {
      await alert({
        title: "Adjustment Failed",
        message: err.message || "Failed to adjust stock.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-xl mx-auto select-none">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory"
          className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Stock Adjustment</h1>
          <p className="text-xs text-zinc-500">Reconcile meat weight discrepancies with audit trail</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-green-800">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 text-xs shadow-xs">
        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Product Cut <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Current: {formatWeight(p.current_stock)})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Current Stock</span>
              <span className="text-sm font-bold text-zinc-900 tabular-nums">
                {formatWeight(selectedProduct.current_stock)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Projected New Stock</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  newStock < 0 ? "text-rose-600" : "text-green-700"
                }`}
              >
                {formatWeight(newStock)}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Adjustment Quantity (+/- KG) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="0.001"
            required
            value={adjustmentKg}
            onChange={(e) => setAdjustmentKg(e.target.value)}
            placeholder="e.g. -1.500 or +2.000"
            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Enter a negative number (e.g. -2) to reduce stock, or positive (+3) to increase.
          </p>
        </div>

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Mandatory Reason <span className="text-rose-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="Audit Discrepancy">Audit Discrepancy</option>
            <option value="Scale Recalibration">Scale Recalibration</option>
            <option value="Counting Error">Counting Error</option>
            <option value="Packaging Shrinkage">Packaging Shrinkage</option>
            <option value="Manager Approval Override">Manager Approval Override</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Detailed Explanation / Audit Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. End of day physical scale recount verified by supervisor"
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || adjNum === 0 || newStock < 0}
          className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{isSubmitting ? "Saving..." : "Apply Stock Adjustment"}</span>
        </button>
      </form>
    </div>
  );
}

export default function StockAdjustPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading form...</div>}>
      <StockAdjustForm />
    </Suspense>
  );
}
