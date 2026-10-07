"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime, formatUnitLabel } from "@/lib/formatters";
import { Printer, X, Settings, Loader2 } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useSystemDialog } from "@/contexts/DialogContext";
import { printElementInWindow } from "@/lib/printWindow";
import { buildEscPosReceipt } from "@/lib/qz/receipt";
import { PrinterSettingsModal } from "@/components/pos/PrinterSettingsModal";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { checkHealth, createSetupOperationId, detectAgentState, ensureTokenClearedOn401, getToken, logSetupStep, printEscPos } from "@/lib/printAgent/client";
import type { PrintAgentState } from "@/lib/printAgent/client";

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  /** When true, automatically trigger print after the modal mounts */
  autoPrint?: boolean;
}

export function ReceiptModal({ sale, isOpen, onClose, autoPrint = false }: ReceiptModalProps) {
  const { user } = useAuth();
  const isRestaurant = user?.company?.business_type === "restaurant";
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [agentState, setAgentState] = useState<Partial<PrintAgentState>>({});
  const autoPrintAttemptedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !sale || !autoPrint || autoPrintAttemptedRef.current) return;
    autoPrintAttemptedRef.current = true;

    const runAutoPrint = async () => {
      const opId = createSetupOperationId();
      logSetupStep(opId, "print", { sale: sale.sale_number, autoPrint: true });
      try {
        const token = getToken();
        if (!token) {
          const detected = await detectAgentState(opId);
          if (!detected.health || (!detected.printer && !detected.error)) {
            setIsPrintAgentOpen(true);
            return;
          }
        }
        const escpos = buildEscPosReceipt(sale, settings);
        const res = await printEscPos(escpos, {
          title: `Receipt #${sale.sale_number}`,
        });
        if (res.status === "FAILED") {
          logSetupStep(opId, "failed", { resError: res.error });
          await alert({
            title: "Print Failed",
            message: res.error || "The receipt could not be printed.",
            type: "danger",
          });
          setIsPrintAgentOpen(true);
          return;
        }
        logSetupStep(opId, "complete");
      } catch (err: any) {
        logSetupStep(opId, "failed", { error: err?.message });
        if (ensureTokenClearedOn401(err)) {
          setIsPrintAgentOpen(true);
          return;
        }
        await alert({
          title: "Print Agent Unavailable",
          message: err?.message || "Cannot reach the local Print Agent.",
          type: "warning",
        });
        setIsPrintAgentOpen(true);
      }
    };

    const timer = setTimeout(() => {
      runAutoPrint();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen, sale, autoPrint, settings, alert]);

  const handlePrint = async () => {
    if (!sale) return;
    setIsPrinting(true);
    try {
      const escpos = buildEscPosReceipt(sale, settings);
      const res = await printEscPos(escpos, {
        title: `Receipt #${sale.sale_number}`,
      });
      if (res.status === "FAILED") {
        await alert({
          title: "Print Failed",
          message: res.error || "The receipt could not be printed.",
          type: "danger",
        });
        setIsPrintAgentOpen(true);
        return;
      }
      if (res.status === "PENDING" && res.reason) {
        await alert({
          title: "Receipt Queued",
          message:
            "The receipt is waiting for the printer. It will print automatically when the printer becomes available.",
          type: "info",
        });
        return;
      }
    } catch (err: any) {
      if (ensureTokenClearedOn401(err)) {
        setIsPrintAgentOpen(true);
        return;
      }
      try {
        await checkHealth();
      } catch {
        setIsPrintAgentOpen(true);
        return;
      }
      await alert({
        title: "Print Failed",
        message: err?.message || "The Print Agent returned an error.",
        type: "warning",
      });
      setIsPrintAgentOpen(true);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs print:hidden" onClick={onClose} />

      {/* Receipt Card - Responsive lengthwise on all mobile & desktop screens */}
      <div className="relative w-full max-w-sm max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white text-zinc-900 font-mono rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200 print:max-h-none print:h-auto print:overflow-visible print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar (Hidden when printing) - Always visible & sticky at top */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0 z-20 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Receipt Preview</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPrinterSettingsOpen(true)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
              title="Receipt Printer Settings (QZ Tray)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors active:scale-95 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{isPrinting ? "Printing..." : "Print"}</span>
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
                    : sale.payment_method === "free"
                      ? "FREE MEAL"
                      : sale.sale_status.toUpperCase()}
              </span>
            </div>
            <div>
              <span>Date: {formatDateTime(sale.created_at)}</span>
            </div>
            <div className="text-xs pt-0.5 space-y-0.5">
              <div className="grid grid-cols-2 gap-2 items-start">
                <div className="space-y-0.5">
                  {sale.table_number && (
                    <div className="font-black text-black">Table: Table {sale.table_number}</div>
                  )}
                  {sale.bill_number && (
                    <div className="font-black text-black">Bill No: {sale.bill_number}</div>
                  )}
                  {sale.waiter_name && (
                    <div>Server: {sale.waiter_name}</div>
                  )}
                  {sale.order_type && sale.order_type !== "counter" && (
                    <div>Type: {sale.order_type.toUpperCase()}</div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div>Customer: {sale.customer_name || "Walk-in Customer"}</div>
                  {(sale.customer_phone || sale.customer?.phone) && (
                    <div>Phone: {sale.customer_phone || sale.customer?.phone}</div>
                  )}
                  {(sale.customer_address || sale.customer?.address) && (
                    <div>Address: {sale.customer_address || sale.customer?.address}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1 space-y-2.5 text-black">
            {sale.items.map((item) => {
              const refundedWeight = Number(item.refunded_weight || 0);
              const isItemFullyRefunded = Boolean(
                item.is_refunded || (refundedWeight >= Number(item.weight) - 0.0001 && refundedWeight > 0)
              );
              const itemDiscount = Number(item.discount || 0);

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
                    {itemDiscount > 0 && (
                      <span className="text-[11px]">
                        (Disc: -{formatCurrency(itemDiscount)})
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
                <span>Total Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            <div
              className={`flex justify-between font-black pt-1 border-t-2 border-black ${(sale.refunded_amount || 0) > 0 ? "text-xs text-zinc-600 line-through" : "text-sm sm:text-base text-black"
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
          ) : sale.payment_method === "free" ? (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** FREE MEAL / COMPLIMENTARY ***
              </div>
              <div className="text-[11px] font-bold leading-snug">
                Authorized complimentary order on {formatDateTime(sale.settled_at || sale.created_at)}
                {sale.settled_by ? ` (${sale.settled_by})` : ""}
              </div>
            </div>
          ) : (
            <div className="border-2 border-black p-2 text-center text-black space-y-0.5">
              <div className="font-black text-xs uppercase tracking-wider">
                *** PAID &amp; SETTLED IN FULL ***
              </div>
              <div className="text-[11px] font-bold leading-snug">
                Settled via {sale.payment_method.toUpperCase()} on {formatDateTime(sale.settled_at || sale.created_at)}
                {sale.settled_by ? ` (${sale.settled_by})` : ""}
              </div>
            </div>
          )}

          {/* 6. Payment Breakdown Box */}
          <div className="border-2 border-black p-2 text-xs font-bold text-black space-y-1">
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="font-black uppercase">
                {sale.payment_method === "free"
                  ? "FREE MEAL (COMPLIMENTARY)"
                  : sale.payment_status === "pending" || sale.payment_method === "credit"
                    ? "PAY LATER (CREDIT)"
                    : sale.payment_method}
              </span>
            </div>

            {sale.payment_method === "free" && (
              <div className="flex justify-between">
                <span>Amount Charged:</span>
                <span className="font-black">{formatCurrency(0)}</span>
              </div>
            )}

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
                (isRestaurant
                  ? `Thank you for dining with us at ${settings.shop_name || "our restaurant"}! Please visit again soon.`
                  : `Thank you for choosing ${settings.shop_name || "our butchery"}! Fresh cuts daily.`)}
            </p>
          </div>
        </div>
      </div>

      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
      <PrintAgentDialog
        isOpen={isPrintAgentOpen}
        onClose={() => setIsPrintAgentOpen(false)}
        onReady={(s) => {
          setAgentState(s);
          if (s.status === "ready" && sale && !isPrinting) {
            void handlePrint();
          }
        }}
      />
    </div>
  );
}
