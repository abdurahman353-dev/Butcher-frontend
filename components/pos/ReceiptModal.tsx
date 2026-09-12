"use client";

import React, { useEffect } from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/formatters";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs print:hidden" onClick={onClose} />

      {/* Receipt Card */}
      <div className="relative w-full max-w-sm bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Receipt Preview</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Body */}
        <div id="thermal-receipt" className="p-4 sm:p-6 text-xs leading-snug space-y-3 bg-white text-black font-bold">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-black">
            <div className="text-lg font-black tracking-tight text-black">🥩 {settings.shop_name ? settings.shop_name.toUpperCase() : "BUTCHERY POS"}</div>
            {settings.address && <p className="text-xs font-bold text-black leading-snug">{settings.address}</p>}
            {(settings.phone || settings.email || settings.tax_pin) && (
              <div className="text-[11px] font-bold text-black space-y-0.5">
                {settings.phone && <p>Tel: {settings.phone}</p>}
                {settings.email && <p>Email: {settings.email}</p>}
                {settings.tax_pin && <p>PIN: {settings.tax_pin}</p>}
              </div>
            )}
            {settings.receipt_header && (
              <p className="text-xs font-black text-black whitespace-pre-line pt-1 border-t-2 border-dashed border-black mt-1">
                {settings.receipt_header}
              </p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1 text-xs pb-2 border-b-2 border-dashed border-black text-black">
            <div className="flex justify-between font-black text-sm">
              <span>RECEIPT: #{sale.sale_number}</span>
              <span>{sale.sale_status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between font-bold text-xs text-black">
              <span>Date: {formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs text-black">
              <span>Cashier: {sale.cashier_name}</span>
              <span>Customer: {sale.customer_name || "Walk-in"}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 py-1">
            {sale.items.map((item) => (
              <div key={item.id} className="space-y-0.5 text-black">
                <div className="flex justify-between font-black text-xs">
                  <span>{item.product_name}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                <div className="text-xs font-bold text-black">
                  {formatWeight(item.weight)} × {formatCurrency(item.price_per_kg)}/KG
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t-2 border-dashed border-black space-y-1 text-black">
            <div className="flex justify-between text-xs font-bold">
              <span>Subtotal:</span>
              <span className="font-black">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm sm:text-base font-black pt-1 border-t-2 border-black">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Pending Credit / Settled Status Banner */}
          {sale.payment_status === "pending" || sale.payment_method === "credit" ? (
            <div className="my-2 p-2 border-2 border-dashed border-black rounded text-center text-black">
              <div className="font-black text-xs uppercase tracking-wider text-black">
                *** PAY LATER / CREDIT BILL ***
              </div>
              <div className="text-xs font-black mt-0.5 text-black">
                OUTSTANDING DUE: {formatCurrency(sale.total)}
              </div>
              <div className="text-[11px] font-bold text-black mt-0.5">
                Payment is pending. Please retain this bill until settled.
              </div>
            </div>
          ) : sale.settled_at ? (
            <div className="my-2 p-2 border-2 border-dashed border-black rounded text-center text-black">
              <div className="font-black text-xs uppercase tracking-wider text-black">
                *** PAID &amp; SETTLED IN FULL ***
              </div>
              <div className="text-[11px] font-bold mt-0.5 text-black">
                Settled via {sale.payment_method.toUpperCase()} on {formatDateTime(sale.settled_at)}
                {sale.settled_by ? ` (${sale.settled_by})` : ""}
              </div>
            </div>
          ) : null}

          {/* Payment Details */}
          <div className="pt-2 border-t-2 border-dashed border-black space-y-0.5 text-xs text-black">
            <div className="flex justify-between font-bold">
              <span>Payment:</span>
              <span className="font-black uppercase">
                {sale.payment_status === "pending" || sale.payment_method === "credit"
                  ? "PAY LATER (CREDIT)"
                  : sale.payment_method}
              </span>
            </div>

            {sale.payment_method === "cash" && (
              <>
                <div className="flex justify-between font-bold text-black">
                  <span>Amount Received:</span>
                  <span className="font-black">{formatCurrency(sale.amount_received || sale.total)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-black">
                  <span>Change:</span>
                  <span>{formatCurrency(sale.change_given || 0)}</span>
                </div>
              </>
            )}

            {sale.payment_method === "mpesa" && sale.mpesa_reference && (
              <div className="flex justify-between font-bold text-black">
                <span>M-Pesa Ref:</span>
                <span className="font-mono font-black">{sale.mpesa_reference}</span>
              </div>
            )}

            {sale.notes && (
              <div className="pt-1 text-[11px] font-bold text-black border-t-2 border-dashed border-black mt-1">
                Notes: {sale.notes}
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="text-center pt-3 border-t-2 border-dashed border-black space-y-1.5 text-black">
            <div className="font-mono text-sm tracking-widest font-black py-1 border-2 border-black rounded text-black">
              * {sale.sale_number} *
            </div>
            {settings.receipt_footer ? (
              <p className="text-xs text-black font-black whitespace-pre-line pt-1">
                {settings.receipt_footer}
              </p>
            ) : (
              <>
                <p className="text-xs text-black font-black">Thank you for shopping with us!</p>
                <p className="text-[11px] text-black font-bold">Goods once sold cannot be returned without receipt.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
