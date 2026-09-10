"use client";

import React, { useState } from "react";
import { Sale } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { salesService } from "@/services/sales.service";
import {
  X,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  DollarSign,
  User,
  Clock,
  Printer,
  Eye,
} from "lucide-react";

interface SettlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPaymentSettled: (updatedSale: Sale) => void;
  onViewReceipt?: (sale: Sale) => void;
  onPrintReceipt?: (sale: Sale) => void;
}

export function SettlePaymentModal({
  isOpen,
  onClose,
  sale,
  onPaymentSettled,
  onViewReceipt,
  onPrintReceipt,
}: SettlePaymentModalProps) {
  const { alert: showAlert } = useSystemDialog();
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "mpesa" | "card">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledSale, setSettledSale] = useState<Sale | null>(null);

  // Cash Form State
  const [amountReceived, setAmountReceived] = useState<string>("");

  // MPesa Form State
  const [mpesaPhone, setMpesaPhone] = useState<string>("");
  const [mpesaRef, setMpesaRef] = useState<string>("");

  // Card Form State
  const [cardRef, setCardRef] = useState<string>("");

  // Notes
  const [notes, setNotes] = useState<string>("");

  if (!isOpen || !sale) return null;

  const totalDue = Number(sale.total || 0);
  const numReceived = parseFloat(amountReceived) || 0;
  const change = Math.max(0, Math.round((numReceived - totalDue) * 100) / 100);

  const handleCashSettle = async () => {
    const receivedVal = numReceived || totalDue;
    if (receivedVal < totalDue) {
      await showAlert({
        title: "Insufficient Cash",
        message: `Amount received (${formatCurrency(receivedVal)}) is less than total due (${formatCurrency(totalDue)}).`,
        type: "danger",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await salesService.settlePayment(sale.id, {
        payment_method: "cash",
        amount_received: receivedVal,
        notes: notes.trim() || undefined,
      });
      setSettledSale(updated);
      onPaymentSettled(updated);
    } catch (e: any) {
      await showAlert({
        title: "Settlement Error",
        message: e.message || "Failed to settle payment.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaSettle = async () => {
    if (!mpesaRef.trim()) {
      await showAlert({
        title: "M-Pesa Reference Required",
        message: "Please enter the M-Pesa transaction confirmation code (e.g. QJD7839X).",
        type: "warning",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await salesService.settlePayment(sale.id, {
        payment_method: "mpesa",
        mpesa_reference: mpesaRef.trim().toUpperCase(),
        notes: notes.trim() || undefined,
      });
      setSettledSale(updated);
      onPaymentSettled(updated);
    } catch (e: any) {
      await showAlert({
        title: "Settlement Error",
        message: e.message || "Failed to settle payment.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSettle = async () => {
    setIsProcessing(true);
    try {
      const updated = await salesService.settlePayment(sale.id, {
        payment_method: "card",
        card_reference: cardRef.trim() || `AUTH-${Date.now().toString().slice(-6)}`,
        notes: notes.trim() || undefined,
      });
      setSettledSale(updated);
      onPaymentSettled(updated);
    } catch (e: any) {
      await showAlert({
        title: "Settlement Error",
        message: e.message || "Failed to settle payment.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10">
        {settledSale ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 mx-auto flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                Payment Collected & Verified
              </span>
              <h3 className="text-xl font-bold text-zinc-900 mt-2">BILL PAID IN FULL</h3>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">
                Sale #{settledSale.sale_number}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Customer:</span>
                <span className="font-bold text-zinc-800">
                  {settledSale.customer_name || "Walk-in"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Payment Method:</span>
                <span className="font-bold text-green-700 uppercase">
                  {settledSale.payment_method}
                </span>
              </div>
              {settledSale.change_given !== undefined && settledSale.change_given > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Change Given:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(settledSale.change_given)}
                  </span>
                </div>
              )}
              {settledSale.mpesa_reference && (
                <div className="flex justify-between text-zinc-500">
                  <span>M-Pesa Reference:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {settledSale.mpesa_reference}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline text-sm">
                <span className="font-bold text-zinc-700 uppercase">Total Settled:</span>
                <span className="text-lg font-black text-zinc-900">
                  {formatCurrency(settledSale.total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {onViewReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onViewReceipt(settledSale);
                    onClose();
                  }}
                  className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Receipt
                </button>
              )}
              {onPrintReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onPrintReceipt(settledSale);
                    onClose();
                  }}
                  className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              Done / Close
            </button>
          </div>
        ) : (
          /* Payment Collection Form */
          <div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Collect Outstanding Balance
                </span>
                <h3 className="text-base font-bold text-zinc-900 mt-0.5">
                  Settle Bill #{sale.sale_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Due Banner */}
            <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  {sale.customer_name || "Walk-in Customer"}
                </span>
                {sale.customer_phone && (
                  <span className="text-[11px] text-amber-700 block font-mono">
                    {sale.customer_phone}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">
                  Amount Due
                </span>
                <span className="text-2xl font-black text-amber-900 tabular-nums">
                  {formatCurrency(totalDue)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 border border-zinc-200 rounded-xl p-1">
                {(["cash", "mpesa", "card"] as const).map((m) => {
                  const Icon = m === "cash" ? Banknote : m === "mpesa" ? Smartphone : CreditCard;
                  const label = m === "mpesa" ? "M-Pesa" : m.charAt(0).toUpperCase() + m.slice(1);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMethod(m)}
                      className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        selectedMethod === m
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Cash Panel */}
              {selectedMethod === "cash" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Cash Received from Customer (KSh)
                    </label>
                    <input
                      type="number"
                      min={totalDue}
                      step="any"
                      placeholder={`Exact: ${totalDue}`}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2.5 text-base font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(totalDue.toString())}
                      className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
                    >
                      Exact ({formatCurrency(totalDue)})
                    </button>
                    {[500, 1000, 2000, 5000]
                      .filter((amt) => amt >= totalDue)
                      .slice(0, 3)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmountReceived(amt.toString())}
                          className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
                        >
                          KSh {amt}
                        </button>
                      ))}
                  </div>

                  {/* Change Preview */}
                  {numReceived > totalDue && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-green-800">Change Due to Customer:</span>
                      <span className="text-sm font-black text-green-700 tabular-nums">
                        {formatCurrency(change)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCashSettle}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : `Confirm Cash Payment (${formatCurrency(totalDue)})`}
                  </button>
                </div>
              )}

              {/* M-Pesa Panel */}
              {selectedMethod === "mpesa" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      M-Pesa Confirmation Code (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. QJD7839X"
                      value={mpesaRef}
                      onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wider text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing || !mpesaRef.trim()}
                    onClick={handleMpesaSettle}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "Verifying..." : `Confirm M-Pesa Payment (${formatCurrency(totalDue)})`}
                  </button>
                </div>
              )}

              {/* Card Panel */}
              {selectedMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Card Auth Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VISA-84729"
                      value={cardRef}
                      onChange={(e) => setCardRef(e.target.value)}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCardSettle}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : `Confirm Card Payment (${formatCurrency(totalDue)})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
