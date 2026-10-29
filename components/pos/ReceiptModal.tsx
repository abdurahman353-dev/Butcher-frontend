"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sale } from "@/types";
import { formatCurrency, formatWeight, formatDateTime, formatUnitLabel } from "@/lib/formatters";
import { Printer, X, Settings, Loader2 } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { useSystemDialog } from "@/contexts/DialogContext";
import { printElementInWindow } from "@/lib/printWindow";
import { buildEscPosReceipt, cleanBillNumber, formatReceiptDate, formatReceiptTime } from "@/lib/qz/receipt";
import { PrinterSettingsModal } from "@/components/pos/PrinterSettingsModal";
import { PrintAgentDialog } from "@/components/pos/PrintAgentDialog";
import { checkHealth, createSetupOperationId, detectAgentState, ensureTokenClearedOn401, getToken, logSetupStep, printEscPos, printHtmlSlip } from "@/lib/printAgent/client";
import { renderReceiptHtml } from "@/lib/printAgent/receiptHtml";
import type { PrintAgentState } from "@/lib/printAgent/client";

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  /** When true, automatically trigger print after the modal mounts */
  autoPrint?: boolean;
  isReprint?: boolean;
}

export function ReceiptModal({ sale, isOpen, onClose, autoPrint = false, isReprint = false }: ReceiptModalProps) {
  const { user } = useAuth();
  const isRestaurant = user?.company?.business_type === "restaurant";
  const isRestaurantSale = isRestaurant || Boolean(sale?.table_number || sale?.bill_number);
  const { settings } = useShopSettings();
  const { alert } = useSystemDialog();
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [isPrintAgentOpen, setIsPrintAgentOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [agentState, setAgentState] = useState<Partial<PrintAgentState>>({});
  const autoPrintAttemptedRef = useRef(false);
  const hasPrintedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoPrintAttemptedRef.current = false;
      inFlightRef.current = false;
      hasPrintedRef.current = false;
      setHasPrinted(false);
    }
  }, [isOpen]);

  const isReprintSale = isReprint || hasPrintedRef.current;

  const handlePrint = async (arg?: boolean | React.MouseEvent) => {
    if (!sale || inFlightRef.current) return;
    const isReprintNow = typeof arg === "boolean" ? arg : isReprintSale;
    inFlightRef.current = true;
    setIsPrinting(true);
    try {
      const token = getToken();
      if (!token) {
        const detected = await detectAgentState();
        if (!detected.health || (!detected.printer && !detected.error)) {
          setIsPrintAgentOpen(true);
          return;
        }
      }

      const clientRef = isReprintNow
        ? `sale-${sale.id}-reprint-${Date.now()}`
        : `sale-${sale.id}-${Date.now()}`;
      const commands = buildEscPosReceipt(sale, settings, { openCashDrawer: true, cutPaper: true });
      const res = await printEscPos(commands, {
        title: `Receipt #${sale.sale_number}`,
        drawerKick: true,
        clientRef,
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

      hasPrintedRef.current = true;
      setHasPrinted(true);

      if (res.status === "PENDING" && res.reason) {
        await alert({
          title: "Receipt Queued",
          message:
            "The receipt is queued in the Print Agent and will print automatically once the printer is connected.",
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
      inFlightRef.current = false;
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
              <span>{isPrinting ? "Printing..." : (isReprintSale || hasPrinted) ? "Re-print" : "Print"}</span>
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
          {isRestaurantSale ? (
            /* Restaurant Receipt - Exactly matches physical receipt photo */
            <div className="space-y-2 font-mono font-bold">
              {/* 1. Header (Centered) */}
              <div className="text-center space-y-0.5">
                <div className="text-sm sm:text-base font-black uppercase tracking-tight">
                  {settings.shop_name || "JAMBO COAST PRIDE HOTEL"}
                </div>
                <div className="text-xs font-bold">
                  {settings.phone || "0710 747527 / 0757 363626"}
                </div>
                <div className="text-xs font-bold">
                  {settings.tax_pin ? `MPESA PAYBILL NO: ${settings.tax_pin}` : "MPESA PAYBILL NO:"}
                </div>
              </div>

              {/* 2. Metadata Section */}
              <div className="pt-2 text-xs font-bold space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No. &nbsp;&nbsp;&nbsp;&nbsp;{cleanBillNumber(sale.bill_number, sale.id) || sale.sale_number}</span>
                  <span>{formatReceiptDate(sale.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Table N &nbsp;&nbsp;&nbsp;&nbsp;{sale.table_number || "1"}</span>
                  <span>{formatReceiptTime(sale.created_at)}</span>
                </div>
                <div>
                  <span>Served by: &nbsp;{sale.waiter_name || "Magufuli"}</span>
                </div>
                <div className="text-center pt-1 font-black">
                  <div>{sale.order_type ? sale.order_type.toUpperCase().replace("_", " ") : "DINE IN"}</div>
                  <div>BACK HALL</div>
                </div>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-black my-1" />

              {/* 3. Column Header */}
              <div className="flex justify-between text-xs font-bold">
                <span className="flex-1 text-left">Item name</span>
                <span className="w-12 text-center">Qty</span>
                <span className="w-16 text-right">total</span>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-black my-1" />

              {/* 4. Items List */}
              <div className="space-y-1 text-xs">
                {(sale.items || []).map((item) => (
                  <div key={item.id} className="space-y-0.5 font-bold">
                    <div className="flex justify-between">
                      <span className="flex-1 text-left truncate pr-2">{item.product_name}</span>
                      <span className="w-12 text-center">{Math.round(Number(item.weight || 1))}</span>
                      <span className="w-16 text-right">{Math.round(Number(item.subtotal || 0))}</span>
                    </div>
                    {(item as any).notes && (
                      <div className="pl-2 text-[11px] font-semibold text-zinc-800">
                        {(item as any).notes.trim()} #
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-black my-1" />

              {/* 5. Totals */}
              {(() => {
                const gross = Number(sale.total || 0);
                const ctLevy = gross > 0 ? gross - (gross / 1.02) : 0;
                const rec = Number(sale.amount_received || gross);
                const chg = Number(sale.change_given || 0);
                return (
                  <div className="space-y-0.5 text-xs font-bold">
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span>{Math.round(gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>16% VAT</span>
                      <span>0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2% C.T Levy</span>
                      <span>{ctLevy.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Vat</span>
                      <span>{ctLevy.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Amount</span>
                      <span>{Math.round(gross)}</span>
                    </div>

                    {sale.payment_method === "cash" && (
                      <>
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(rec)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Change</span>
                          <span>{formatCurrency(chg)}</span>
                        </div>
                      </>
                    )}

                    {sale.payment_method === "mpesa" && (
                      <>
                        <div className="flex justify-between">
                          <span>M-Pesa</span>
                          <span>{formatCurrency(gross)}</span>
                        </div>
                        {sale.mpesa_reference && (
                          <div className="flex justify-between">
                            <span>Ref:</span>
                            <span className="font-mono">{sale.mpesa_reference}</span>
                          </div>
                        )}
                      </>
                    )}

                    {sale.payment_method !== "cash" && sale.payment_method !== "mpesa" && (
                      <div className="flex justify-between">
                        <span className="uppercase">{sale.payment_method}</span>
                        <span>{formatCurrency(gross)}</span>
                      </div>
                    )}

                    <div className="pt-1">
                      <span>Prepared by &nbsp;&nbsp;&nbsp;{sale.cashier_name || "Muhammad"}</span>
                    </div>
                  </div>
                );
              })()}

              {/* 6. Footer */}
              <div className="text-center pt-2 text-xs font-bold">
                ----------------- Thank you -----------------
              </div>
            </div>
          ) : (
            /* Traditional Butchery / Retail Receipt */
            <>
              {/* ...retail boxes... */}
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
            </>
          )}
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
