"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { salesService } from "@/services/sales.service";
import { Sale, SaleItem } from "@/types";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { SettlePaymentModal } from "@/components/pos/SettlePaymentModal";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  ArrowLeft,
  Printer,
  RotateCcw,
  AlertTriangle,
  User,
  CreditCard,
  CheckCircle2,
  Check,
  Package,
  Layers,
  Info,
  DollarSign,
  Clock,
} from "lucide-react";

interface ItemRefundState {
  selected: boolean;
  refundWeight: string;
}

export default function SaleDetailPage() {
  const { confirm, alert } = useSystemDialog();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [itemStates, setItemStates] = useState<Record<number, ItemRefundState>>({});

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

  // Initialize item refund states whenever the modal is opened
  const openRefundModal = () => {
    if (!sale) return;
    const initialStates: Record<number, ItemRefundState> = {};
    sale.items.forEach((item) => {
      const alreadyRefunded = Number(item.refunded_weight || 0);
      const remaining = Math.max(0, Number(item.weight) - alreadyRefunded);
      const isFullyRefunded = Boolean(item.is_refunded || remaining <= 0.0001);

      initialStates[item.id] = {
        selected: !isFullyRefunded,
        refundWeight: isFullyRefunded ? "0" : remaining.toFixed(3),
      };
    });
    setItemStates(initialStates);
    setRefundReason("");
    setIsRefundModalOpen(true);
  };

  // Helper to calculate refundable weight for an item
  const getItemRemainingWeight = (item: SaleItem): number => {
    const alreadyRefunded = Number(item.refunded_weight || 0);
    return Math.max(0, Number(item.weight) - alreadyRefunded);
  };

  // Compute live refund total in modal
  const liveRefundTotal = useMemo(() => {
    if (!sale) return 0;
    let total = 0;
    sale.items.forEach((item) => {
      const state = itemStates[item.id];
      if (state?.selected) {
        const weight = parseFloat(state.refundWeight) || 0;
        const remaining = getItemRemainingWeight(item);
        const validWeight = Math.min(Math.max(0, weight), remaining);
        const unitRate =
          Number(item.weight) > 0
            ? Number(item.subtotal) / Number(item.weight)
            : Number(item.price_per_kg);
        total += validWeight * unitRate;
      }
    });

    const currentRefunded = Number(sale.refunded_amount || 0);
    const maxRefundable = Math.max(0, Number(sale.total) - currentRefunded);
    return Math.min(total, maxRefundable);
  }, [sale, itemStates]);

  const handleSelectAll = (select: boolean) => {
    if (!sale) return;
    setItemStates((prev) => {
      const next = { ...prev };
      sale.items.forEach((item) => {
        const remaining = getItemRemainingWeight(item);
        if (remaining > 0.0001) {
          next[item.id] = {
            selected: select,
            refundWeight: remaining.toFixed(3),
          };
        }
      });
      return next;
    });
  };

  const handleItemWeightChange = (itemId: number, value: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        refundWeight: value,
      },
    }));
  };

  const handleItemToggle = (itemId: number) => {
    setItemStates((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          ...current,
          selected: !current?.selected,
        },
      };
    });
  };

  const handleSetMaxWeight = (item: SaleItem) => {
    const remaining = getItemRemainingWeight(item);
    setItemStates((prev) => ({
      ...prev,
      [item.id]: {
        selected: true,
        refundWeight: remaining.toFixed(3),
      },
    }));
  };

  const handleSubmitRefund = async () => {
    if (!sale) return;

    if (!refundReason.trim()) {
      await alert({
        title: "Refund Reason Required",
        message: "Please enter an explanation or reason for processing this refund.",
        type: "warning",
      });
      return;
    }

    // Build payload of selected items with weight > 0
    const itemsToRefund: Array<{ sale_item_id: number; refund_weight: number }> = [];
    for (const item of sale.items) {
      const state = itemStates[item.id];
      if (state?.selected) {
        const weight = parseFloat(state.refundWeight) || 0;
        const remaining = getItemRemainingWeight(item);

        if (weight <= 0) continue;

        if (weight > remaining + 0.0001) {
          await alert({
            title: "Weight Exceeds Refundable Amount",
            message: `You entered ${weight.toFixed(3)} KG for "${item.product_name}", but only ${remaining.toFixed(3)} KG is refundable.`,
            type: "warning",
          });
          return;
        }

        itemsToRefund.push({
          sale_item_id: item.id,
          refund_weight: Math.round(weight * 1000) / 1000,
        });
      }
    }

    if (itemsToRefund.length === 0) {
      await alert({
        title: "No Items Selected",
        message: "Please select at least one item cut with a valid weight greater than 0 KG to refund.",
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Confirm Refund Processing",
      message: `You are about to process a refund of ${formatCurrency(
        liveRefundTotal
      )} for Sale #${sale.sale_number}.\n\nItems to refund: ${itemsToRefund.length} cut(s).\nInventory will be automatically restocked.\n\nReason: "${refundReason.trim()}".`,
      confirmText: "Yes, Issue Refund",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    setIsRefunding(true);
    try {
      const updated = await salesService.partialRefundSale(sale.id, {
        reason: refundReason.trim(),
        items: itemsToRefund,
      });
      setSale(updated);
      setIsRefundModalOpen(false);
      await alert({
        title: "Refund Completed",
        message: `Refund of ${formatCurrency(liveRefundTotal)} processed for Sale #${updated.sale_number}. Inventory stock has been restored.`,
        type: "success",
      });
    } catch (e: any) {
      await alert({
        title: "Refund Failed",
        message: e.response?.data?.message || e.message || "Failed to process refund.",
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

  const isFullyRefunded = sale.sale_status === "refunded";
  const isPartiallyRefunded = sale.sale_status === "partially_refunded";
  const canRefund = !isFullyRefunded && sale.sale_status !== "cancelled";

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
          {sale.payment_status === "pending" && (
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Settle Payment</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReceiptOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span>Print Receipt</span>
          </button>

          {canRefund && (
            <button
              type="button"
              onClick={openRefundModal}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isPartiallyRefunded ? "Refund Additional Cuts" : "Refund / Return Cuts"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pay Later Pending Banner */}
      {sale.payment_status === "pending" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-900">Pay Later / Credit Sale — Payment Pending</h4>
              <p className="text-amber-800">
                Outstanding Balance: <strong className="text-amber-950 font-black">{formatCurrency(sale.total)}</strong>
              </p>
              {sale.customer_name && (
                <p className="text-amber-700">
                  Customer / Debtor: <strong>{sale.customer_name}</strong> {sale.customer_phone ? `(${sale.customer_phone})` : ""}
                </p>
              )}
              {sale.notes && (
                <p className="text-amber-700 italic">
                  Notes: {sale.notes}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettleModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs active:scale-95"
          >
            Collect Payment
          </button>
        </div>
      )}

      {/* Settled Banner */}
      {sale.settled_at && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <h4 className="font-bold text-green-900">Payment Settled in Full</h4>
            <p className="text-green-700">
              Paid via <strong>{sale.payment_method.toUpperCase()}</strong> on {formatDateTime(sale.settled_at)}
              {sale.settled_by ? ` by ${sale.settled_by}` : ""}.
            </p>
          </div>
        </div>
      )}

      {/* Fully Refunded Banner if applicable */}
      {isFullyRefunded && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-rose-900">This sale has been fully refunded and inventory restored</h4>
            {sale.refund_reason && (
              <p className="text-rose-700">
                Reason: <strong>{sale.refund_reason}</strong>
              </p>
            )}
            <p className="text-rose-500 text-[11px]">
              Processed by {sale.refunded_by || "Authorized Staff"}
              {sale.refunded_at ? ` on ${formatDateTime(sale.refunded_at)}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Partially Refunded Banner if applicable */}
      {isPartiallyRefunded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-900">This sale has been partially refunded</h4>
              <p className="text-amber-800">
                Refunded Amount: <strong className="text-rose-700">{formatCurrency(sale.refunded_amount || 0)}</strong> &bull; Net Balance: <strong className="text-emerald-700">{formatCurrency(Number(sale.total) - Number(sale.refunded_amount || 0))}</strong>
              </p>
              {sale.refund_reason && (
                <p className="text-amber-700">
                  Latest Reason: <strong>{sale.refund_reason}</strong>
                </p>
              )}
              <p className="text-amber-600 text-[11px]">
                Last updated by {sale.refunded_by || "Authorized Staff"}
                {sale.refunded_at ? ` on ${formatDateTime(sale.refunded_at)}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openRefundModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            Refund More
          </button>
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
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Items Sold & Refund Status</h3>
          </div>
          <span className="text-xs text-zinc-500">{sale.items.length} meat cuts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                <th className="py-3 pl-4">Product Cut</th>
                <th className="py-3 px-3">Original Weight</th>
                <th className="py-3 px-3">Refunded</th>
                <th className="py-3 px-3">Price / KG</th>
                <th className="py-3 pr-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sale.items.map((item) => {
                const refundedWeight = Number(item.refunded_weight || 0);
                const isItemFullyRefunded = Boolean(
                  item.is_refunded || (refundedWeight >= Number(item.weight) - 0.0001 && refundedWeight > 0)
                );
                const isPartiallyRefundedItem = refundedWeight > 0 && !isItemFullyRefunded;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-50/50 ${
                      isItemFullyRefunded ? "bg-rose-50/30 opacity-75" : isPartiallyRefundedItem ? "bg-amber-50/20" : ""
                    }`}
                  >
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            isItemFullyRefunded
                              ? "line-through text-zinc-500"
                              : "text-zinc-900"
                          }`}
                        >
                          {item.product_name}
                        </span>
                        {isItemFullyRefunded && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Fully Returned
                          </span>
                        )}
                        {isPartiallyRefundedItem && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {formatWeight(refundedWeight)} Returned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-700 tabular-nums">
                      {formatWeight(item.weight)}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {refundedWeight > 0 ? (
                        <span className="font-semibold text-rose-600">
                          {formatWeight(refundedWeight)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 tabular-nums">
                      {formatCurrency(item.price_per_kg)}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-green-700 tabular-nums">
                      <span className={isItemFullyRefunded ? "line-through text-zinc-400" : ""}>
                        {formatCurrency(item.subtotal)}
                      </span>
                    </td>
                  </tr>
                );
              })}
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

          <div className="flex justify-between w-64 text-zinc-700">
            <span>Original Total:</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatCurrency(sale.total)}
            </span>
          </div>

          {(sale.refunded_amount || 0) > 0 && (
            <div className="flex justify-between w-64 text-rose-600 font-semibold">
              <span>Total Refunded:</span>
              <span className="tabular-nums">-{formatCurrency(sale.refunded_amount || 0)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-200 flex justify-between w-64 items-baseline">
            <span className="text-sm font-bold uppercase text-zinc-900">
              {(sale.refunded_amount || 0) > 0 ? "Net Settled:" : "Grand Total:"}
            </span>
            <span className="text-xl font-bold text-green-700 tabular-nums">
              {formatCurrency(Math.max(0, Number(sale.total) - Number(sale.refunded_amount || 0)))}
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

      {/* ── SMART PARTIAL & ITEM-LEVEL REFUND MODAL ── */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !isRefunding && setIsRefundModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                    Process Item-Level / Partial Refund
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Sale #{sale.sale_number} &bull; Select cuts and specify weight to return
                  </p>
                </div>
              </div>

              {/* Select all / none quick toggle */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-semibold transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Modal Body: Item list */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs text-zinc-600 bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Check the cuts customer is returning and enter the exact weight. Stock will automatically be restored to your inventory, and the register shift totals adjusted.
                </span>
              </div>

              <div className="space-y-2">
                {sale.items.map((item) => {
                  const remaining = getItemRemainingWeight(item);
                  const isExhausted = remaining <= 0.0001;
                  const state = itemStates[item.id] || { selected: false, refundWeight: "0" };
                  const unitRate =
                    Number(item.weight) > 0
                      ? Number(item.subtotal) / Number(item.weight)
                      : Number(item.price_per_kg);
                  const currentInputWeight = parseFloat(state.refundWeight) || 0;
                  const itemRefundCost = Math.min(Math.max(0, currentInputWeight), remaining) * unitRate;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                        isExhausted
                          ? "bg-zinc-50/80 border-zinc-200 opacity-60"
                          : state.selected
                          ? "bg-rose-50/30 border-rose-200 shadow-2xs"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Cut info & Checkbox */}
                        <div className="flex items-start sm:items-center gap-3">
                          <input
                            type="checkbox"
                            id={`item-check-${item.id}`}
                            disabled={isExhausted || isRefunding}
                            checked={state.selected}
                            onChange={() => handleItemToggle(item.id)}
                            className="mt-0.5 sm:mt-0 w-4 h-4 rounded-md border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <label
                              htmlFor={`item-check-${item.id}`}
                              className="font-bold text-xs sm:text-sm text-zinc-900 cursor-pointer"
                            >
                              {item.product_name}
                            </label>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap mt-0.5">
                              <span>Bought: <strong>{formatWeight(item.weight)}</strong></span>
                              <span>&bull;</span>
                              <span>Rate: <strong>{formatCurrency(item.price_per_kg)}/KG</strong></span>
                              {Number(item.refunded_weight || 0) > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-amber-700 font-semibold">
                                    {formatWeight(item.refunded_weight || 0)} already refunded
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Weight adjustment input & Item refund preview */}
                        {isExhausted ? (
                          <span className="text-[11px] font-bold text-zinc-400 self-end sm:self-center">
                            Fully Refunded
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-zinc-500 hidden sm:inline">KG:</span>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                max={remaining}
                                disabled={!state.selected || isRefunding}
                                value={state.refundWeight}
                                onChange={(e) => handleItemWeightChange(item.id, e.target.value)}
                                placeholder="0.000"
                                className="w-24 h-9 bg-white border border-zinc-200 rounded-lg px-2 text-xs font-bold text-zinc-900 text-right focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                              />
                              <button
                                type="button"
                                title={`Set to max refundable (${remaining.toFixed(3)} KG)`}
                                disabled={isRefunding}
                                onClick={() => handleSetMaxWeight(item)}
                                className="px-2 h-9 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold transition-colors"
                              >
                                Max
                              </button>
                            </div>

                            <div className="w-24 text-right">
                              <span className="text-xs font-bold text-rose-600 block tabular-nums">
                                {state.selected ? formatCurrency(itemRefundCost) : "KSh 0.00"}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">
                                {remaining.toFixed(3)} KG left
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Refund Reason */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Reason for Refund <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer returned wrong cut, quality issue, entered wrong weight at checkout..."
                  rows={2}
                  disabled={isRefunding}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs disabled:bg-zinc-50"
                />
              </div>
            </div>

            {/* Modal Footer: Live total & Confirm buttons */}
            <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Refund Amount:
                </span>
                <span className="text-xl font-black text-rose-600 tabular-nums">
                  {formatCurrency(liveRefundTotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={isRefunding}
                  className="w-1/2 sm:w-auto px-4 py-2.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRefund}
                  disabled={isRefunding || liveRefundTotal <= 0 || !refundReason.trim()}
                  className="w-1/2 sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isRefunding ? (
                    <span>Processing Refund...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Issue {formatCurrency(liveRefundTotal)} Refund</span>
                    </>
                  )}
                </button>
              </div>
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

      {/* Settle Payment Modal */}
      <SettlePaymentModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        sale={sale}
        onPaymentSettled={(updated) => setSale(updated)}
        onViewReceipt={() => setIsReceiptOpen(true)}
        onPrintReceipt={() => {
          setIsReceiptOpen(true);
          setTimeout(() => window.print(), 300);
        }}
      />
    </div>
  );
}
