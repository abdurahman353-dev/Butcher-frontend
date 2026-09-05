"use client";

import React, { useState } from "react";
import { CartItem, Customer, Sale } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { CashPayment } from "./CashPayment";
import { MPesaPayment } from "./MPesaPayment";
import { Banknote, Smartphone, CreditCard, X, CheckCircle2, Printer, Eye, PlusCircle } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  customer: Customer | null;
  initialMethod?: "cash" | "mpesa" | "card";
  onCompleteSale: (payload: {
    payment_method: "cash" | "mpesa" | "card";
    amount_received?: number;
    mpesa_reference?: string;
    card_reference?: string;
  }) => Promise<Sale>;
  onViewReceipt: (sale: Sale) => void;
  onPrintReceipt: (sale: Sale) => void;
  onNewSale: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  items,
  subtotal,
  totalDiscount,
  total,
  customer,
  initialMethod = "cash",
  onCompleteSale,
  onViewReceipt,
  onPrintReceipt,
  onNewSale,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "mpesa" | "card">(initialMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [cardRef, setCardRef] = useState("");

  if (!isOpen) return null;

  const handleCashSuccess = async (received: number, change: number) => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({ payment_method: "cash", amount_received: received });
      setCompletedSale(sale);
    } catch (e: any) {
      alert(e.message || "Failed to complete sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMPesaSuccess = async (phone: string, ref: string) => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({ payment_method: "mpesa", mpesa_reference: ref });
      setCompletedSale(sale);
    } catch (e: any) {
      alert(e.message || "Failed to complete sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSuccess = async () => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({
        payment_method: "card",
        card_reference: cardRef || `AUTH-${Date.now().toString().slice(-6)}`,
      });
      setCompletedSale(sale);
    } catch (e: any) {
      alert(e.message || "Failed to complete sale.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden z-10">
        {/* Success state */}
        {completedSale ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-green-600">
                Transaction Complete
              </span>
              <h2 className="text-xl font-bold text-zinc-900 mt-1">SALE COMPLETED</h2>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Sale #{completedSale.sale_number}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-left space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Customer:</span>
                <span className="font-medium text-zinc-800">{completedSale.customer_name || "Walk-in"}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Payment:</span>
                <span className="font-bold text-green-700 uppercase">{completedSale.payment_method}</span>
              </div>
              {completedSale.mpesa_reference && (
                <div className="flex justify-between text-zinc-500">
                  <span>M-Pesa Ref:</span>
                  <span className="font-mono font-bold text-zinc-800">{completedSale.mpesa_reference}</span>
                </div>
              )}
              {completedSale.change_given !== undefined && completedSale.change_given > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Change Given:</span>
                  <span className="font-bold text-green-700">{formatCurrency(completedSale.change_given)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-zinc-700 uppercase">Total Paid:</span>
                <span className="text-xl font-bold text-zinc-900">{formatCurrency(completedSale.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onViewReceipt(completedSale)}
                className="py-2.5 rounded-lg border border-zinc-200 text-zinc-700 font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Receipt
              </button>
              <button
                type="button"
                onClick={() => onPrintReceipt(completedSale)}
                className="py-2.5 rounded-lg border border-zinc-200 text-zinc-700 font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>

            <button
              type="button"
              onClick={onNewSale}
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Next Sale
            </button>
          </div>
        ) : (
          /* Payment selection */
          <div>
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Checkout</h3>
                <p className="text-xs text-zinc-500">
                  Customer: <span className="text-zinc-800 font-medium">{customer?.name || "Walk-in"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total */}
            <div className="px-5 py-4 bg-green-50 border-b border-green-100 text-center">
              <span className="text-xs uppercase font-bold tracking-wider text-green-700 block">
                Total Amount Due
              </span>
              <div className="text-3xl font-bold text-green-900 tabular-nums mt-1">
                {formatCurrency(total)}
              </div>
            </div>

            {/* Payment methods + panels */}
            <div className="p-4 space-y-4">
              {/* Method tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 border border-zinc-200 rounded-lg p-1">
                {(["cash", "mpesa", "card"] as const).map((method) => {
                  const Icon = method === "cash" ? Banknote : method === "mpesa" ? Smartphone : CreditCard;
                  const label = method === "mpesa" ? "M-Pesa" : method.charAt(0).toUpperCase() + method.slice(1);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                        selectedMethod === method
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {selectedMethod === "cash" && (
                <CashPayment total={total} onConfirm={handleCashSuccess} isProcessing={isProcessing} />
              )}

              {selectedMethod === "mpesa" && (
                <MPesaPayment
                  total={total}
                  customerPhone={customer?.phone}
                  onConfirm={handleMPesaSuccess}
                  isProcessing={isProcessing}
                />
              )}

              {selectedMethod === "card" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Card Authorization Code
                    </label>
                    <input
                      type="text"
                      value={cardRef}
                      onChange={(e) => setCardRef(e.target.value)}
                      placeholder="e.g. VISA-948271"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCardSuccess}
                    className="w-full py-3 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isProcessing ? "Processing..." : `Complete Card Sale (${formatCurrency(total)})`}
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
