"use client";

import React, { useEffect } from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime, formatUnitLabel } from "@/lib/formatters";
import { Printer, X } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { printElementInWindow } from "@/lib/printWindow";

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  /** When true, automatically trigger print after the modal mounts */
  autoPrint?: boolean;
}

export function ReceiptModal({ sale, isOpen, onClose, autoPrint = false }: ReceiptModalProps) {
  const { settings } = useShopSettings();

  // Auto-print when the modal opens with autoPrint=true
  // Using a short timeout so the DOM has fully painted before we snapshot innerHTML
  useEffect(() => {
    if (isOpen && sale && autoPrint) {
      const timer = setTimeout(() => {
        printElementInWindow("thermal-receipt", `Receipt #${sale.sale_number}`);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sale, autoPrint]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    printElementInWindow("thermal-receipt", `Receipt #${sale?.sale_number ?? ""}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs print:hidden" onClick={onClose} />

      {/* Receipt Card - Responsive lengthwise on all mobile & desktop screens */}
      <div className="relative w-full max-w-sm max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar (Hidden when printing) - Always visible & sticky at top */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0 z-20 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Receipt Preview</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Body - Smoothly scrollable lengthwise on any device */}
        <div id="thermal-receipt" className="p-4 sm:p-6 text-xs leading-snug space-y-3 bg-white text-black font-bold overflow-y-auto flex-1 overscroll-contain print:overflow-visible print:p-0 print:m-0">
          {/* 1. Header Box */}
          <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
            <div className="text-base sm:text-lg font-black tracking-tight uppercase">
              {settings.shop_name ? settings.shop_name.toUpperCase() : "HALAL CHICKEN HUB"}
            </div>
            {settings.address && (
              <p className="text-xs font-bold leading-snug">{settings.address}</p>
            )}
            {(settings.phone || settings.email || settings.tax_pin) && (
              <div className="text-[11px] font-bold space-y-0.5">
                {settings.phone && <p>Tel: {settings.phone}</p>}
                {settings.email && <p>Email: {settings.email}</p>}
                {settings.tax_pin && <p>PIN: {settings.tax_pin}</p>}
              </div>
            )}
            <div className="pt-1.5 mt-1.5 border-t-2 border-black text-xs font-bold">
              {settings.receipt_header || "Fresh Gourmet Meats • Halal Certified"}
            </div>
          </div>

          {/* 2. Transaction Metadata Box */}
          {/* 2. Transaction Metadata Box */}
          <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
            <div className="flex justify-between font-black text-sm">
              <span>RECEIPT: #{sale.sale_number}</span>
              <span className={sale.sale_status === "partially_refunded" ? "text-amber-900" : sale.sale_status === "refunded" ? "text-rose-900" : ""}>
                {sale.sale_status === "partially_refunded"
                  ? "PARTIALLY REFUNDED"
                  : sale.sale_status === "refunded"
                  ? "FULLY REFUNDED"
                  : sale.sale_status.toUpperCase()}
              </span>
            </div>
            <div>
              <span>Date: {formatDateTime(sale.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div>
                <span>Cashier: {sale.cashier_name}</span>
              </div>
              <div>
                <span>Customer: {sale.customer_name || "Walk-in Customer"}</span>
              </div>
            </div>
          </div>

          {/* 3. Line Items (Clean list with no outer box) */}
          <div className="py-1 space-y-2.5 text-black">
            {sale.items.map((item) => {
              const refundedWeight = Number(item.refunded_weight || 0);
              const isItemFullyRefunded = Boolean(
                item.is_refunded || (refundedWeight >= Number(item.weight) - 0.0001 && refundedWeight > 0)
              );

              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-black text-xs sm:text-sm">
                    <span className={isItemFullyRefunded ? "line-through" : ""}>
                      {item.product_name}
                    </span>
                    <span className={isItemFullyRefunded ? "line-through text-zinc-500" : ""}>
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-black">
                    <span>
                      {formatWeight(item.weight, item.unit)} x {formatCurrency(item.price_per_kg)}/{formatUnitLabel(item.unit)}
                    </span>
                    {Number(item.discount || 0) > 0 && (
                      <span className="text-[11px]">
                        (Disc: -{formatCurrency(item.discount || 0)})
                      </span>
                    )}
                  </div>
                  {refundedWeight > 0 && (
                    <div className="flex justify-between text-[11px] font-black text-black pl-1.5 border-l-2 border-black">
                      <span>↳ {isItemFullyRefunded ? "Returned in Full:" : "Partially Returned:"}</span>
                      <span>
                        -{formatWeight(refundedWeight, item.unit)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Subtotal & Total Box */}
          <div className="border-2 border-black p-2 text-black space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Subtotal:</span>
              <span className="font-bold">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            <div
              className={`flex justify-between font-black pt-1 border-t-2 border-black ${
                (sale.refunded_amount || 0) > 0 ? "text-xs text-zinc-600 line-through" : "text-sm sm:text-base text-black"
              }`}
            >
              <span>{(sale.refunded_amount || 0) > 0 ? "ORIGINAL TOTAL:" : "TOTAL:"}</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>

            {(sale.refunded_amount || 0) > 0 && (
              <>
                <div className="flex justify-between text-xs font-black text-black">
                  <span>REFUNDED AMOUNT:</span>
                  <span>-{formatCurrency(sale.refunded_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-black pt-1 border-t-2 border-black text-black">
                  <span>NET TOTAL DUE:</span>
                  <span>{formatCurrency(Math.max(0, Number(sale.total) - Number(sale.refunded_amount || 0)))}</span>
                </div>
              </>
            )}
          </div>

          {/* 5. Settlement / Status Banner Box */}
          {sale.sale_status === "refunded" ? (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** SALE FULLY REFUNDED &amp; CANCELLED ***
              </div>
              <div className="text-xs font-black">
                TOTAL REFUNDED: -{formatCurrency(sale.refunded_amount || sale.total)}
              </div>
              {sale.refund_reason && (
                <div className="text-[11px] font-bold">
                  Reason: {sale.refund_reason}
                </div>
              )}
              {sale.refunded_at && (
                <div className="text-[10px] font-bold">
                  Processed on {formatDateTime(sale.refunded_at)}{sale.refunded_by ? ` (${sale.refunded_by})` : ""}
                </div>
              )}
            </div>
          ) : sale.sale_status === "partially_refunded" || ((sale.refunded_amount || 0) > 0) ? (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** PARTIALLY REFUNDED RECEIPT ***
              </div>
              <div className="text-xs font-black">
                REFUNDED: -{formatCurrency(sale.refunded_amount || 0)} &bull; NET: {formatCurrency(Math.max(0, Number(sale.total) - Number(sale.refunded_amount || 0)))}
              </div>
              {sale.refund_reason && (
                <div className="text-[11px] font-bold">
                  Reason: {sale.refund_reason}
                </div>
              )}
              {sale.refunded_at && (
                <div className="text-[10px] font-bold">
                  Refunded on {formatDateTime(sale.refunded_at)}{sale.refunded_by ? ` (${sale.refunded_by})` : ""}
                </div>
              )}
            </div>
          ) : sale.payment_status === "pending" || sale.payment_method === "credit" ? (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** PAY LATER / CREDIT BILL ***
              </div>
              <div className="text-xs font-black">
                OUTSTANDING DUE: {formatCurrency(sale.total)}
              </div>
              <div className="text-[11px] font-bold">
                Payment is pending. Please retain this bill until settled.
              </div>
            </div>
          ) : (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** PAID &amp; SETTLED IN FULL ***
              </div>
              <div className="text-[11px] font-bold leading-snug">
                Settled via {sale.payment_method.toUpperCase()} on {formatDateTime(sale.settled_at || sale.created_at)}
                {sale.settled_by ? ` (${sale.settled_by})` : sale.cashier_name ? ` (${sale.cashier_name})` : ""}
              </div>
            </div>
          )}

          {/* 6. Payment Breakdown Box */}
          <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="font-black uppercase">
                {sale.payment_status === "pending" || sale.payment_method === "credit"
                  ? "PAY LATER (CREDIT)"
                  : sale.payment_method}
              </span>
            </div>

            {sale.payment_method === "cash" && (
              <>
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-black">{formatCurrency(sale.amount_received || sale.total)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>Change:</span>
                  <span>{formatCurrency(sale.change_given || 0)}</span>
                </div>
              </>
            )}

            {sale.payment_method === "mpesa" && (
              <>
                {sale.mpesa_reference && (
                  <div className="flex justify-between">
                    <span>M-Pesa Ref:</span>
                    <span className="font-mono font-black">{sale.mpesa_reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-black">{formatCurrency(sale.amount_received || sale.total)}</span>
                </div>
                {sale.change_given !== undefined && sale.change_given > 0 && (
                  <div className="flex justify-between font-black">
                    <span>Change:</span>
                    <span>{formatCurrency(sale.change_given)}</span>
                  </div>
                )}
              </>
            )}

            {sale.payment_method === "card" && (
              <>
                {sale.card_reference && (
                  <div className="flex justify-between">
                    <span>Card Ref:</span>
                    <span className="font-mono font-black">{sale.card_reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Amount Received:</span>
                  <span className="font-black">{formatCurrency(sale.amount_received || sale.total)}</span>
                </div>
              </>
            )}

            {(sale.refunded_amount || 0) > 0 && (
              <div className="pt-1 mt-1 border-t-2 border-black space-y-0.5">
                <div className="flex justify-between text-black">
                  <span>Refund Disbursed:</span>
                  <span className="font-black">-{formatCurrency(sale.refunded_amount || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-black">
                  <span>Net Retained:</span>
                  <span>{formatCurrency(Math.max(0, Number(sale.total) - Number(sale.refunded_amount || 0)))}</span>
                </div>
              </div>
            )}

            {sale.notes && (
              <div className="pt-1 text-[11px] border-t-2 border-black mt-1">
                Notes: {sale.notes}
              </div>
            )}
          </div>

          {/* 7. Barcode & Thank You Footer Box */}
          <div className="border-2 border-black p-2.5 text-center text-black space-y-1.5">
            <div className="font-mono text-sm tracking-widest font-black">
              * {sale.sale_number} *
            </div>
            <p className="text-xs font-black leading-snug whitespace-pre-line">
              {settings.receipt_footer ||
                `Thank you for choosing ${settings.shop_name || "HALAL CHICKEN HUB"}! Fresh cuts daily.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
