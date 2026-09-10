"use client";

import React, { useState } from "react";
import { CartItem, Customer, Sale } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { CashPayment } from "./CashPayment";
import { MPesaPayment } from "./MPesaPayment";
import {
  Banknote,
  Smartphone,
  CreditCard,
  X,
  CheckCircle2,
  Printer,
  Eye,
  PlusCircle,
  Clock,
  User,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  customer: Customer | null;
  initialMethod?: "cash" | "mpesa" | "card" | "credit";
  onCompleteSale: (payload: {
    payment_method: "cash" | "mpesa" | "card" | "credit";
    amount_received?: number;
    mpesa_reference?: string;
    card_reference?: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
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
  const { alert: showAlert } = useSystemDialog();
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "mpesa" | "card" | "credit">(initialMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [cardRef, setCardRef] = useState("");

  // Pay Later Form State
  const [creditCustomerName, setCreditCustomerName] = useState(customer?.name || "");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState(customer?.phone || "");
  const [creditNotes, setCreditNotes] = useState("");

  if (!isOpen) return null;

  const handleCashSuccess = async (received: number, change: number) => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({ payment_method: "cash", amount_received: received });
      setCompletedSale(sale);
    } catch (e: any) {
      await showAlert({
        title: "Checkout Error",
        message: e.message || "Failed to complete sale.",
        type: "danger",
      });
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
      await showAlert({
        title: "Checkout Error",
        message: e.message || "Failed to complete sale.",
        type: "danger",
      });
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
      await showAlert({
        title: "Checkout Error",
        message: e.message || "Failed to complete sale.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayLaterSuccess = async () => {
    const custName = creditCustomerName.trim() || customer?.name || "";
    if (!custName) {
      await showAlert({
        title: "Customer Name Required",
        message: "Please enter the customer's name so the shop knows who owes the balance.",
        type: "warning",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({
        payment_method: "credit",
        customer_name: custName,
        customer_phone: creditCustomerPhone.trim() || customer?.phone || undefined,
        notes: creditNotes.trim() || undefined,
      });
      setCompletedSale(sale);
    } catch (e: any) {
      await showAlert({
        title: "Pay Later Error",
        message: e.message || "Failed to record pay later sale.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isPendingCredit = completedSale?.payment_status === "pending" || completedSale?.payment_method === "credit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Success state */}
        {completedSale ? (
          <div className="p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${
                isPendingCredit
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-green-50 border-green-200 text-green-600"
              }`}
            >
              {isPendingCredit ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>

            <div>
              <span
                className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isPendingCredit
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {isPendingCredit ? "Order Saved — Payment Pending" : "Transaction Complete"}
              </span>
              <h2 className="text-xl font-black text-zinc-900 mt-2 tracking-tight">
                {isPendingCredit ? "PAY LATER BILL ISSUED" : "SALE COMPLETED"}
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Sale #{completedSale.sale_number}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Customer:</span>
                <span className="font-bold text-zinc-800">
                  {completedSale.customer_name || "Walk-in Customer"}
                </span>
              </div>
              {completedSale.customer_phone && (
                <div className="flex justify-between text-zinc-500">
                  <span>Phone:</span>
                  <span className="font-mono text-zinc-800">{completedSale.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>Payment Status:</span>
                <span
                  className={`font-bold uppercase ${
                    isPendingCredit ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {isPendingCredit ? "Unpaid (Pay Later)" : completedSale.payment_method}
                </span>
              </div>
              {completedSale.mpesa_reference && (
                <div className="flex justify-between text-zinc-500">
                  <span>M-Pesa Ref:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    {completedSale.mpesa_reference}
                  </span>
                </div>
              )}
              {completedSale.change_given !== undefined && completedSale.change_given > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Change Given:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(completedSale.change_given)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline text-sm">
                <span className="font-bold text-zinc-700 uppercase">
                  {isPendingCredit ? "Balance Outstanding:" : "Total Paid:"}
                </span>
                <span
                  className={`text-xl font-black ${
                    isPendingCredit ? "text-amber-700" : "text-zinc-900"
                  }`}
                >
                  {formatCurrency(completedSale.total)}
                </span>
              </div>
            </div>

            {isPendingCredit && (
              <p className="text-[11px] text-zinc-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                Meat stock has been properly deducted from inventory. When the customer returns to pay, settle the bill in the Sales history or POS.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onViewReceipt(completedSale)}
                className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Bill
              </button>
              <button
                type="button"
                onClick={() => onPrintReceipt(completedSale)}
                className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bill
              </button>
            </div>

            <button
              type="button"
              onClick={onNewSale}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Next Sale / New Bill</span>
            </button>
          </div>
        ) : (
          /* Payment selection */
          <div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Checkout</h3>
                <p className="text-xs text-zinc-500">
                  Customer:{" "}
                  <span className="text-zinc-800 font-semibold">
                    {customer?.name || "Walk-in Customer"}
                  </span>
                </p>
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

            {/* Total Due Banner */}
            <div className="px-5 py-3.5 bg-green-50 border-b border-green-100 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-green-700 block">
                Total Order Value
              </span>
              <div className="text-2xl sm:text-3xl font-black text-green-900 tabular-nums mt-0.5">
                {formatCurrency(total)}
              </div>
            </div>

            {/* Payment method tabs (4 options) */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-4 gap-1 bg-zinc-100 border border-zinc-200 rounded-xl p-1">
                {(["cash", "mpesa", "card", "credit"] as const).map((method) => {
                  const Icon =
                    method === "cash"
                      ? Banknote
                      : method === "mpesa"
                      ? Smartphone
                      : method === "card"
                      ? CreditCard
                      : Clock;
                  const label =
                    method === "mpesa"
                      ? "M-Pesa"
                      : method === "credit"
                      ? "Pay Later"
                      : method.charAt(0).toUpperCase() + method.slice(1);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`py-2 px-1 rounded-lg text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                        selectedMethod === method
                          ? method === "credit"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Panel */}
              {selectedMethod === "cash" && (
                <CashPayment total={total} onConfirm={handleCashSuccess} isProcessing={isProcessing} />
              )}

              {/* M-Pesa Panel */}
              {selectedMethod === "mpesa" && (
                <MPesaPayment
                  total={total}
                  customerPhone={customer?.phone}
                  onConfirm={handleMPesaSuccess}
                  isProcessing={isProcessing}
                />
              )}

              {/* Card Panel */}
              {selectedMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Card Authorization Code
                    </label>
                    <input
                      type="text"
                      value={cardRef}
                      onChange={(e) => setCardRef(e.target.value)}
                      placeholder="e.g. VISA-948271"
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm font-bold text-zinc-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCardSuccess}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isProcessing ? "Processing..." : `Complete Card Sale (${formatCurrency(total)})`}</span>
                  </button>
                </div>
              )}

              {/* Pay Later / Credit Panel */}
              {selectedMethod === "credit" && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pay Later (Credit Sale):</strong> Customer takes the cuts now with payment due later. Meat inventory is deducted immediately.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-zinc-400" /> Customer Name (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mama Mboga / John / Table 4"
                      value={creditCustomerName}
                      onChange={(e) => setCreditCustomerName(e.target.value)}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-zinc-400" /> Customer Phone (Recommended)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0712 345 678"
                      value={creditCustomerPhone}
                      onChange={(e) => setCreditCustomerPhone(e.target.value)}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-zinc-400" /> Due Date / Promise Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Will pay tomorrow morning via M-Pesa"
                      value={creditNotes}
                      onChange={(e) => setCreditNotes(e.target.value)}
                      className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing || (!creditCustomerName.trim() && !customer?.name)}
                    onClick={handlePayLaterSuccess}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
                  >
                    <Clock className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? "Saving Order..."
                        : `Record Pay Later (${formatCurrency(total)})`}
                    </span>
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
