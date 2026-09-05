"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { productsService } from "@/services/products.service";
import { inventoryService } from "@/services/inventory.service";
import { Product } from "@/types";
import { formatWeight } from "@/lib/formatters";
import { ArrowLeft, PlusCircle, CheckCircle2 } from "lucide-react";

function StockInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("product_id");

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(
    preselectedProductId ? Number(preselectedProductId) : 1
  );
  const [quantity, setQuantity] = useState<string>("");
  const [buyingCost, setBuyingCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await productsService.getProducts({ per_page: 100 });
      setProducts(res.data);
      if (preselectedProductId) {
        const found = res.data.find((p) => p.id === Number(preselectedProductId));
        if (found && found.buying_cost_per_kg) {
          setBuyingCost(found.buying_cost_per_kg.toString());
        }
      }
    }
    load();
  }, [preselectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const cost = parseFloat(buyingCost) || 0;

    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid stock quantity in KG.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await inventoryService.stockIn({
        product_id: selectedProductId,
        quantity: qty,
        buying_cost: cost,
        notes,
      });
      setSuccessMessage(
        `Added ${formatWeight(qty)} to ${updated.name}. New stock: ${formatWeight(updated.current_stock)}.`
      );
      setQuantity("");
      setNotes("");
      setTimeout(() => {
        router.push("/inventory");
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to add stock.");
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
          <h1 className="text-xl font-bold text-zinc-900">Stock-In Replenishment</h1>
          <p className="text-xs text-zinc-500">Record incoming meat cuts delivered by suppliers</p>
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
            Select Meat Cut <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedProductId(id);
              const found = products.find((p) => p.id === id);
              if (found?.buying_cost_per_kg) {
                setBuyingCost(found.buying_cost_per_kg.toString());
              }
            }}
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
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between text-xs text-zinc-600">
            <span>Current Available Stock:</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatWeight(selectedProduct.current_stock)}
            </span>
          </div>
        )}

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Quantity Added (KG) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="0.001"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 50.000"
            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold text-green-700 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Supplier Buying Cost / KG (KSh)
          </label>
          <input
            type="number"
            step="0.01"
            value={buyingCost}
            onChange={(e) => setBuyingCost(e.target.value)}
            placeholder="e.g. 680"
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
          <p className="text-[10px] text-zinc-500 mt-1">Used to compute accurate shop profit margins.</p>
        </div>

        <div>
          <label className="block font-semibold uppercase text-zinc-700 mb-1">
            Supplier Delivery Notes / Invoice Ref
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Kajiado Farm delivery, Batch #401"
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isSubmitting ? "Adding Stock..." : "Add Stock to Inventory"}</span>
        </button>
      </form>
    </div>
  );
}

export default function StockInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading form...</div>}>
      <StockInForm />
    </Suspense>
  );
}
