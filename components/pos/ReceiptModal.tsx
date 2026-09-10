"use client";

import React from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/formatters";
import { Printer, X } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ sale, isOpen, onClose }: ReceiptModalProps) {
  const { settings } = useShopSettings();
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
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
        <div id="thermal-receipt" className="p-6 text-xs leading-tight space-y-3 bg-white text-black">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
            <div className="text-lg font-bold tracking-tight">🥩 {settings.shop_name.toUpperCase()}</div>
            {settings.address && <p className="text-[11px] text-gray-700">{settings.address}</p>}
            <p className="text-[10px] text-gray-600">
              {settings.phone && `Tel: ${settings.phone}`}
              {settings.phone && settings.tax_pin && " • "}
              {settings.tax_pin && `PIN: ${settings.tax_pin}`}
            </p>
            {settings.receipt_header && (
              <p className="text-[10px] font-semibold text-gray-800">{settings.receipt_header}</p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-0.5 text-[11px] pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between font-bold">
              <span>RECEIPT: #{sale.sale_number}</span>
              <span>{sale.sale_status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Date: {formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Cashier: {sale.cashier_name}</span>
              <span>Customer: {sale.customer_name || "Walk-in"}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 py-1">
            {sale.items.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{item.product_name}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                <div className="text-[10px] text-gray-600">
                  {formatWeight(item.weight)} × {formatCurrency(item.price_per_kg)}/KG
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-dashed border-gray-400 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-[11px]">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-800">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="pt-2 border-t border-dashed border-gray-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="font-bold uppercase">{sale.payment_method}</span>
            </div>

            {sale.payment_method === "cash" && (
              <>
                <div className="flex justify-between text-gray-700">
                  <span>Amount Received:</span>
                  <span>{formatCurrency(sale.amount_received || sale.total)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Change:</span>
                  <span>{formatCurrency(sale.change_given || 0)}</span>
                </div>
              </>
            )}

            {sale.payment_method === "mpesa" && sale.mpesa_reference && (
              <div className="flex justify-between text-gray-700">
                <span>M-Pesa Ref:</span>
                <span className="font-mono">{sale.mpesa_reference}</span>
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="text-center pt-3 border-t border-dashed border-gray-400 space-y-1">
            <div className="font-mono text-xs tracking-widest font-bold py-1 bg-gray-100 rounded">
              * {sale.sale_number} *
            </div>
            {settings.receipt_footer ? (
              <p className="text-[10px] text-gray-700 font-semibold">{settings.receipt_footer}</p>
            ) : (
              <p className="text-[10px] text-gray-700 font-semibold">Thank you for shopping with us!</p>
            )}
            <p className="text-[9px] text-gray-500">Goods once sold cannot be returned without receipt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
