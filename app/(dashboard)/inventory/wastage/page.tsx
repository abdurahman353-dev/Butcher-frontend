"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Product, WastageRecord, WastageReason } from "@/types";
import { formatWeight, formatCurrency, formatDateTime } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { ArrowLeft, Trash2, AlertOctagon, CheckCircle2 } from "lucide-react";

export default function WastagePage() {
  const { confirm, alert } = useSystemDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [wastageList, setWastageList] = useState<WastageRecord[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<WastageReason>("Spoilage");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [prodsRes, wastageRes] = await Promise.all([
        productsService.getProducts({ per_page: 100 }),
        inventoryService.getWastage(),
      ]);
      setProducts(prodsRes.data);
      if (prodsRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(prodsRes.data[0].id);
      }
      setWastageList(wastageRes);
    } catch (e) {
      console.error("Failed to load wastage data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const numQty = parseFloat(quantity) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0) {
      await alert({
        title: "Invalid Wastage Quantity",
        message: "Please enter a valid wastage quantity in KG greater than 0.",
        type: "warning",
      });
      return;
    }
    if (selectedProduct && numQty > selectedProduct.current_stock) {
      await alert({
        title: "Excessive Wastage Error",
        message: `Cannot log wastage (${formatWeight(numQty)}) exceeding current stock (${formatWeight(
          selectedProduct.current_stock
        )}).`,
        type: "danger",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Confirm Wastage Log",
      message: `Log ${formatWeight(numQty)} of "${selectedProduct?.name || 'Product'}" as wastage (${reason})?\n\nThis will permanently deduct the weight from available store stock.`,
      confirmText: "Yes, Record Wastage",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await inventoryService.recordWastage({
        product_id: selectedProductId,
        quantity: numQty,
        reason,
        notes,
      });
      setSuccessMessage(`Successfully logged ${formatWeight(numQty)} as ${reason}.`);
      setQuantity("");
      setNotes("");
      loadData();
      await alert({
        title: "Wastage Logged",
        message: `Recorded ${formatWeight(numQty)} of "${selectedProduct?.name}" as ${reason}. Stock has been updated.`,
        type: "success",
      });
    } catch (err: any) {
      await alert({
        title: "Wastage Log Failed",
        message: err.message || "Failed to record wastage.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto select-none">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory"
          className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Meat Wastage & Trimming Logs</h1>
          <p className="text-xs text-zinc-500">Record spoiled cuts, bone trimmings, and damaged meat</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-800">
          <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-4 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm pb-2 border-b border-zinc-100">
              <Trash2 className="w-4 h-4" />
              <span>Log Meat Wastage</span>
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">
                Meat Cut <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatWeight(p.current_stock)} avail)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">
                Wasted Quantity (KG) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1.250"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-base font-bold text-rose-600 placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">
                Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as WastageReason)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs"
              >
                <option value="Spoilage">Spoilage</option>
                <option value="Damage">Damage</option>
                <option value="Trimming">Trimming (Fat/Bone Excess)</option>
                <option value="Expired">Expired</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Discoloration due to power outage"
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || numQty <= 0}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{isSubmitting ? "Logging..." : "Record Wastage"}</span>
            </button>
          </form>
        </div>

        {/* History Table Column */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Wastage Log History
              </h2>
              <span className="text-xs text-zinc-500">{wastageList.length} incident records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                    <th className="py-3 pl-4">Date</th>
                    <th className="py-3 px-3">Cut Name</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Wasted (KG)</th>
                    <th className="py-3 px-3 text-right">Est. Loss (KSh)</th>
                    <th className="py-3 pr-4">Reported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {wastageList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400">
                        No meat wastage recorded.
                      </td>
                    </tr>
                  ) : (
                    wastageList.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 pl-4 text-zinc-500">{formatDateTime(w.created_at)}</td>
                        <td className="py-3 px-3 font-semibold text-zinc-900">{w.product_name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                            {w.reason}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600 tabular-nums">
                          {formatWeight(w.quantity)}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-800 font-semibold tabular-nums">
                          {formatCurrency(w.estimated_cost)}
                        </td>
                        <td className="py-3 pr-4 text-zinc-500">{w.reported_by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
