"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { salesService } from "@/services/sales.service";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  ArrowLeft,
  Printer,
  RotateCcw,
  AlertTriangle,
  User,
  CreditCard,
} from "lucide-react";

export default function SaleDetailPage() {
  const { confirm, alert } = useSystemDialog();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Refund dialog state
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    async function loadSale() {
      if (!id) return;
      try {
        const found = await salesService.getSaleById(id);
        if (found) setSale(found);
      } catch (e) {
        console.error("Failed to load sale:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSale();
  }, [id]);

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      await alert({
        title: "Refund Reason Required",
        message: "Please enter an explanation or reason for processing this refund.",
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Confirm Transaction Refund",
      message: `Are you sure you want to refund sale #${sale?.sale_number} for ${formatCurrency(
        sale?.total || 0
      )}?\n\nReason: "${refundReason.trim()}".\nAll sold items will be returned to store inventory.`,
      confirmText: "Yes, Issue Refund",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    setIsRefunding(true);
    try {
      const updated = await salesService.refundSale(id, refundReason);
      setSale(updated);
      setIsRefundDialogOpen(false);
      await alert({
        title: "Refund Completed",
        message: `Sale #${updated.sale_number} was successfully refunded and inventory has been restored.`,
        type: "success",
      });
    } catch (e: any) {
      await alert({
        title: "Refund Failed",
        message: e.message || "Failed to process refund.",
        type: "danger",
      });
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Loading transaction details...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-zinc-900">Sale Not Found</h2>
        <p className="text-xs text-zinc-500">The requested transaction does not exist.</p>
        <Link
          href="/sales"
          className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-xs"
        >
          Back to Sales History
        </Link>
      </div>
    );
  }

  const isRefunded = sale.sale_status === "refunded";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto select-none">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 font-mono">{sale.sale_number}</h1>
              <StatusBadge status={sale.sale_status} type="sale" />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Recorded on {formatDateTime(sale.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReceiptOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span>Print Receipt</span>
          </button>

          {!isRefunded && (
            <button
              type="button"
              onClick={() => setIsRefundDialogOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refund Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* Refunded Banner if applicable */}
      {isRefunded && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-rose-900">This sale has been refunded and inventory restored</h4>
            <p className="text-rose-700">
              Reason: <strong>{sale.refund_reason}</strong>
            </p>
            <p className="text-rose-500 text-[11px]">
              Processed by {sale.refunded_by || "Authorized Staff"} on {formatDateTime(sale.refunded_at)}
            </p>
          </div>
        </div>
      )}

      {/* Sale Info Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Cashier</span>
          <p className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            {sale.cashier_name}
          </p>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Customer</span>
          <p className="text-sm font-bold text-zinc-900">{sale.customer_name || "Walk-in Customer"}</p>
          {sale.customer_phone && (
            <p className="text-[10px] text-zinc-500">{sale.customer_phone}</p>
          )}
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Payment Method</span>
          <p className="text-sm font-bold text-green-700 uppercase flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            {sale.payment_method}
          </p>
          {sale.mpesa_reference && (
            <p className="text-[10px] text-zinc-500 font-mono">Ref: {sale.mpesa_reference}</p>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Items Sold</h3>
          <span className="text-xs text-zinc-500">{sale.items.length} meat cuts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                <th className="py-3 pl-4">Product Name</th>
                <th className="py-3 px-3">Weight (KG)</th>
                <th className="py-3 px-3">Price / KG</th>
                <th className="py-3 pr-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sale.items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50">
                  <td className="py-3 pl-4 font-semibold text-zinc-900">{item.product_name}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-700 tabular-nums">
                    {formatWeight(item.weight)}
                  </td>
                  <td className="py-3 px-3 text-zinc-500 tabular-nums">
                    {formatCurrency(item.price_per_kg)}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold text-green-700 tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Calculation Footer */}
        <div className="p-4 bg-zinc-50/80 border-t border-zinc-200 flex flex-col items-end space-y-1 text-xs">
          <div className="flex justify-between w-64 text-zinc-600">
            <span>Subtotal:</span>
            <span className="font-semibold text-zinc-900 tabular-nums">
              {formatCurrency(sale.subtotal)}
            </span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between w-64 text-amber-700">
              <span>Discount:</span>
              <span className="font-semibold tabular-nums">-{formatCurrency(sale.discount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-200 flex justify-between w-64 items-baseline">
            <span className="text-sm font-bold uppercase text-zinc-900">Grand Total:</span>
            <span className="text-xl font-bold text-green-700 tabular-nums">
              {formatCurrency(sale.total)}
            </span>
          </div>

          {sale.payment_method === "cash" && sale.amount_received && (
            <div className="flex justify-between w-64 text-zinc-500 pt-1 text-[11px]">
              <span>Received / Change:</span>
              <span>
                {formatCurrency(sale.amount_received)} / {formatCurrency(sale.change_given || 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Refund Confirmation Dialog */}
      {isRefundDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !isRefunding && setIsRefundDialogOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Sale Refund</span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Refunding <strong>Sale #{sale.sale_number}</strong> ({formatCurrency(sale.total)}) will:
              <br />• Reverse the financial transaction
              <br />• Automatically restore {sale.items.length} cuts back into live inventory
              <br />• Log a refund movement into the audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Reason for Refund <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer returned cuts, wrong meat selected, cashier typo..."
                rows={3}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRefundDialogOpen(false)}
                disabled={isRefunding}
                className="w-1/2 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRefund}
                disabled={isRefunding || !refundReason.trim()}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
              >
                {isRefunding ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        sale={sale}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
