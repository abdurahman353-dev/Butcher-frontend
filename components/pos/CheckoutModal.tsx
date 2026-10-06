"use client";

import React, { useState, useEffect } from "react";
import { CartItem, Customer, Sale } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { useSystemDialog } from "@/contexts/DialogContext";
import { CashPayment } from "./CashPayment";
import { MPesaPayment } from "./MPesaPayment";
import {
  Banknote,
  Smartphone,
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
  Lock,
  Gift,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  customer: Customer | null;
  initialMethod?: "cash" | "mpesa" | "credit" | "free";
  isRestaurant?: boolean;
  orderType?: string;
  tableNumber?: string;
  onCompleteSale: (payload: {
    payment_method: "cash" | "mpesa" | "credit" | "free";
    amount_received?: number;
    mpesa_reference?: string;
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
  isRestaurant = false,
  orderType = "counter",
  tableNumber = "",
  onCompleteSale,
  onViewReceipt,
  onPrintReceipt,
  onNewSale,
}: CheckoutModalProps) {
  const { alert: showAlert } = useSystemDialog();
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "mpesa" | "credit" | "free">(
    initialMethod || "cash"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Pay Later & Free Meal Form State
  const [creditCustomerName, setCreditCustomerName] = useState(customer?.name || "");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState(customer?.phone || "");
  const [creditNotes, setCreditNotes] = useState("");
  const [freeMealReason, setFreeMealReason] = useState("");

  // Reset ONLY when the modal transitions from closed → open (fresh open)
  const prevIsOpenRef = React.useRef(false);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !wasOpen) {
      // Fresh open: reset everything
      setCompletedSale(null);
      setSelectedMethod(initialMethod || "cash");
      setCreditCustomerName(customer?.name || "");
      setCreditCustomerPhone(customer?.phone || "");
      setCreditNotes("");
      setFreeMealReason("");
      setIsProcessing(false);
    } else if (!isOpen && wasOpen) {
      // Closed: clear completed sale
      setCompletedSale(null);
    }
    // Intentionally NOT depending on customer/initialMethod changes after open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNextSale = () => {
    setCompletedSale(null);
    onNewSale();
  };

  const handleClose = () => {
    setCompletedSale(null);
    onClose();
  };

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

  const handleMPesaSuccess = async (received: number, change: number, ref?: string) => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({
        payment_method: "mpesa",
        amount_received: received,
        mpesa_reference: ref,
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

  const handleFreeSuccess = async () => {
    setIsProcessing(true);
    try {
      const sale = await onCompleteSale({
        payment_method: "free",
        amount_received: 0,
        customer_name: creditCustomerName.trim() || customer?.name || "Complimentary Guest",
        customer_phone: creditCustomerPhone.trim() || customer?.phone || undefined,
        notes: freeMealReason.trim() ? `[FREE MEAL / COMPLIMENTARY]: ${freeMealReason.trim()}` : "[FREE MEAL / COMPLIMENTARY]",
      });
      setCompletedSale(sale);
    } catch (e: any) {
      await showAlert({
        title: "Free Meal Error",
        message: e.message || "Failed to complete free meal checkout.",
        type: "danger",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isFreeMeal = completedSale?.payment_method === "free";
  const isPendingCredit = !isFreeMeal && (completedSale?.payment_status === "pending" || completedSale?.payment_method === "credit");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => !isProcessing && handleClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Success state */}
        {completedSale ? (
          <div className="p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${
                isFreeMeal
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : isPendingCredit
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-green-50 border-green-200 text-green-600"
              }`}
            >
              {isFreeMeal ? <Gift className="w-8 h-8" /> : isPendingCredit ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>

            <div>
              <span
                className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isFreeMeal
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : isPendingCredit
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {isFreeMeal
                  ? "Complimentary Meal (KSh 0.00)"
                  : isPendingCredit
                  ? "Order Saved — Payment Pending"
                  : "Transaction Complete"}
              </span>
              <h2 className="text-xl font-black text-zinc-900 mt-2 tracking-tight">
                {isFreeMeal
                  ? "FREE MEAL COMPLETED"
                  : isPendingCredit
                  ? (isRestaurant ? "OPEN TAB RECORDED" : "PAY LATER BILL ISSUED")
                  : (isRestaurant ? "ORDER PLACED" : "SALE COMPLETED")}
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
              {(completedSale.customer_address || completedSale.customer?.address) && (
                <div className="flex justify-between text-zinc-500">
                  <span>Address:</span>
                  <span className="font-semibold text-zinc-800">
                    {completedSale.customer_address || completedSale.customer?.address}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>Payment Status:</span>
                <span
                  className={`font-bold uppercase ${
                    isPendingCredit ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {isPendingCredit ? (isRestaurant ? "Open Tab (Unpaid)" : "Unpaid (Pay Later)") : completedSale.payment_method}
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
                {isRestaurant
                  ? "Menu items have been recorded. When the guest is ready to pay, settle the tab from Sales or POS."
                  : "Meat stock has been properly deducted from inventory. When the customer returns to pay, settle the bill in the Sales history or POS."}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const sale = completedSale;
                  handleClose();
                  onViewReceipt(sale);
                }}
                className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Bill
              </button>
              <button
                type="button"
                onClick={() => {
                  const sale = completedSale;
                  handleClose();
                  onPrintReceipt(sale);
                }}
                className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bill
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextSale}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isRestaurant ? "Next Order / New Bill" : "Next Sale / New Bill"}</span>
            </button>
          </div>
        ) : (
          /* Payment selection */
          <div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">{isRestaurant ? "Place Order" : "Checkout"}</h3>
                <p className="text-xs text-zinc-500">
                  Customer:{" "}
                  <span className="text-zinc-800 font-semibold">
                    {customer?.name || "Walk-in Customer"}
                  </span>
                  {isRestaurant && orderType !== "counter" && (
                    <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 rounded-md font-bold text-[10px] uppercase">
                      {orderType === "dine_in" ? `Dine-In${tableNumber ? ` · ${tableNumber}` : ""}` : "Takeaway"}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
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

            {/* Payment method tabs (4 options: Cash, M-Pesa, Pay Later, Free Meal) */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-4 gap-1 bg-zinc-100 border border-zinc-200 rounded-xl p-1">
                {(["cash", "mpesa", "credit", "free"] as const).map((method) => {
                  const Icon =
                    method === "cash"
                      ? Banknote
                      : method === "mpesa"
                      ? Smartphone
                      : method === "credit"
                      ? Clock
                      : Gift;
                  const label =
                    method === "mpesa"
                      ? "M-Pesa"
                      : method === "credit"
                      ? isRestaurant ? "Open Tab" : "Pay Later"
                      : method === "free"
                      ? "Free Meal"
                      : "Cash";
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method);
                        if (method === "credit" && customer) {
                          setCreditCustomerName(customer.name);
                          setCreditCustomerPhone(customer.phone || "");
                        }
                      }}
                      className={`py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                        selectedMethod === method
                          ? method === "credit"
                            ? "bg-amber-500 text-white shadow-xs"
                            : method === "free"
                            ? "bg-purple-600 text-white shadow-xs"
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
                  onConfirm={handleMPesaSuccess}
                  isProcessing={isProcessing}
                />
              )}

              {/* Pay Later / Credit Panel */}
              {selectedMethod === "credit" && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pay Later (Credit Sale):</strong> Customer receives the order now with payment settled later. Inventory is deducted immediately.
                    </div>
                  </div>

                  {customer && (
                    <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-green-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span>Auto-filled from selected customer profile:</span>
                      </div>
                      <div className="text-[11px] text-green-950 pl-5">
                        <p><strong>{customer.name}</strong> • {customer.phone || "No phone"}</p>
                        {customer.address && <p className="text-zinc-600">📍 {customer.address}</p>}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" /> Customer Name (Required)
                      </span>
                      {Boolean(customer) && (
                        <span className="text-[10px] text-zinc-400 font-normal flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-zinc-400" /> Read-only (Profile)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Mama Mboga / John / Table 4"
                        value={creditCustomerName}
                        readOnly={Boolean(customer)}
                        onChange={(e) => setCreditCustomerName(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition-colors ${
                          customer
                            ? "bg-zinc-100 text-zinc-600 border-zinc-200 cursor-not-allowed select-none pr-8"
                            : "border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                        }`}
                      />
                      {Boolean(customer) && (
                        <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-400" /> Customer Phone (Recommended)
                      </span>
                      {Boolean(customer) && (
                        <span className="text-[10px] text-zinc-400 font-normal flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-zinc-400" /> Read-only (Profile)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 0712 345 678"
                        value={creditCustomerPhone}
                        readOnly={Boolean(customer)}
                        onChange={(e) => setCreditCustomerPhone(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:outline-none transition-colors ${
                          customer
                            ? "bg-zinc-100 text-zinc-600 border-zinc-200 cursor-not-allowed select-none pr-8"
                            : "border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                        }`}
                      />
                      {Boolean(customer) && (
                        <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
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

              {/* Free Meal / Complimentary Panel */}
              {selectedMethod === "free" && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                    <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Free Meal / Complimentary Bill</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Products are recorded as sold in stock and reporting, but KSh 0 money is collected or recorded in cash shifts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                        Reason for Free Meal *
                      </label>
                      <input
                        type="text"
                        value={freeMealReason}
                        onChange={(e) => setFreeMealReason(e.target.value)}
                        placeholder="e.g. VIP guest, Manager offer, Staff complimentary meal"
                        className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                        Recipient / Guest Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={creditCustomerName}
                        onChange={(e) => setCreditCustomerName(e.target.value)}
                        placeholder="e.g. Table guest name"
                        className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-zinc-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleFreeSuccess}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Gift className="w-4 h-4" />
                    <span>{isProcessing ? "Processing..." : `Confirm Free Meal (${formatCurrency(0)})`}</span>
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
