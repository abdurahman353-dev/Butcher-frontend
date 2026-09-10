"use client";

import React, { useState } from "react";
import { HeldOrder } from "@/types";
import { formatCurrency, formatWeight, formatTimeOnly } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  Clock,
  Trash2,
  PlayCircle,
  X,
  FileText,
  User,
  ShoppingBag,
  PlusCircle,
  AlertCircle,
} from "lucide-react";

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (order: HeldOrder) => void;
  onRemoveOrder: (id: string) => void;
  onNewBill: () => void;
  hasActiveCartItems: boolean;
}

export function HeldOrdersModal({
  isOpen,
  onClose,
  heldOrders,
  onResumeOrder,
  onRemoveOrder,
  onNewBill,
  hasActiveCartItems,
}: HeldOrdersModalProps) {
  const { confirm } = useSystemDialog();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    heldOrders[0]?.id || null
  );

  if (!isOpen) return null;

  const handleResume = async (order: HeldOrder) => {
    if (hasActiveCartItems) {
      const proceed = await confirm({
        title: "Replace Current Cart?",
        message:
          "You currently have active cuts in your cart. Loading this saved order will replace your current cart.\n\nTip: You can hold your current cart first before resuming another order.",
        confirmText: "Load Order Anyway",
        cancelText: "Cancel",
        type: "warning",
      });
      if (!proceed) return;
    }
    onResumeOrder(order);
    onClose();
  };

  const handleDiscard = async (order: HeldOrder) => {
    const shouldDiscard = await confirm({
      title: "Discard Held Order",
      message: `Are you sure you want to discard "${order.reference}" worth ${formatCurrency(
        order.total
      )}? This cannot be undone.`,
      confirmText: "Yes, Discard Order",
      cancelText: "Keep Order",
      type: "danger",
    });

    if (shouldDiscard) {
      onRemoveOrder(order.id);
      if (selectedOrderId === order.id) {
        setSelectedOrderId(
          heldOrders.find((o) => o.id !== order.id)?.id || null
        );
      }
    }
  };

  const selectedOrder = heldOrders.find((o) => o.id === selectedOrderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900">
                  Held & Saved Orders
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  {heldOrders.length} Parked Bill{heldOrders.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Recall any parked customer order to resume checkout or add cuts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNewBill();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Blank Bill</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {heldOrders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800">
              No orders on hold right now
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              When serving a customer who steps away or wants to pay later, click
              <strong> "Hold Order"</strong> in the cart to save their cuts and start
              a fresh bill for the next customer.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
            {/* Left list (2 cols) */}
            <div className="md:col-span-2 overflow-y-auto p-3 space-y-2 bg-zinc-50/50">
              {heldOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-white border-green-600 shadow-xs ring-1 ring-green-600/30"
                        : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">
                        {order.reference}
                      </h4>
                      <span className="text-[10px] text-zinc-400 shrink-0 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeOnly(order.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 text-[11px]">
                        {order.items.length} cut{order.items.length !== 1 ? "s" : ""} •{" "}
                        {formatWeight(order.totalWeight)}
                      </span>
                      <span className="font-bold text-zinc-900 tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    {order.customer && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-green-700 font-medium truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{order.customer.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right preview & actions (3 cols) */}
            <div className="md:col-span-3 flex flex-col justify-between overflow-hidden bg-white">
              {selectedOrder ? (
                <>
                  <div className="p-4 overflow-y-auto space-y-4">
                    {/* Summary Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                          Parked Order Preview
                        </span>
                        <h4 className="text-base font-bold text-zinc-900">
                          {selectedOrder.reference}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Saved at {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Total Due</span>
                        <span className="text-xl font-black text-zinc-900 tabular-nums">
                          {formatCurrency(selectedOrder.total)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    {selectedOrder.customer && (
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                            Customer Attached
                          </span>
                          <span className="font-bold text-zinc-800">
                            {selectedOrder.customer.name}
                          </span>
                        </div>
                        {selectedOrder.customer.phone && (
                          <span className="text-zinc-500 font-mono">
                            {selectedOrder.customer.phone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes if present */}
                    {selectedOrder.notes && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>{selectedOrder.notes}</span>
                      </div>
                    )}

                    {/* Itemized List */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Order Items ({selectedOrder.items.length})
                      </span>
                      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden bg-zinc-50/40">
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-zinc-800">
                                {item.product_name}
                              </span>
                              <div className="text-[11px] text-zinc-500">
                                {formatWeight(item.weight)} @ {formatCurrency(item.price_per_kg)}/kg
                              </div>
                            </div>
                            <span className="font-bold text-zinc-900 tabular-nums">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDiscard(selectedOrder)}
                      className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResume(selectedOrder)}
                      className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Resume & Checkout ({formatCurrency(selectedOrder.total)})</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-zinc-400 flex items-center justify-center h-full">
                  Select an order on the left to preview.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
