/**
 * receiptHtml.ts
 * Generates high-fidelity thermal receipt HTML strings matching the exact
 * 7-box structure, typography, spacing, and styling of ReceiptModal.tsx.
 *
 * Used by printHtmlSlip() for headless thermal printing via Edge/SumatraPDF.
 */

import { Sale, ShopSettings } from "@/types";
import { formatCurrency, formatWeight, formatDateTime, formatUnitLabel } from "@/lib/formatters";

/**
 * Escapes HTML characters to prevent XSS in rendered receipt HTML.
 */
function escapeHtml(str: string | null | undefined): string {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function renderReceiptHtml(
    sale: Sale,
    settings?: Partial<ShopSettings>,
    isRestaurant?: boolean
): string {
    const shopName = settings?.shop_name ? settings.shop_name.toUpperCase() : "HALAL CHICKEN HUB";
    const address = settings?.address || "";
    const phone = settings?.phone || "";
    const email = settings?.email || "";
    const taxPin = settings?.tax_pin || "";
    const headerNote = settings?.receipt_header || "Fresh Gourmet Meats • Halal Certified";
    const footerNote =
        settings?.receipt_footer ||
        (isRestaurant
            ? `Thank you for dining with us at ${settings?.shop_name || "our restaurant"}! Please visit again soon.`
            : `Thank you for choosing ${settings?.shop_name || "our butchery"}! Fresh cuts daily.`);

    const saleNumber = escapeHtml(sale.sale_number);
    const createdAtFormatted = formatDateTime(sale.created_at);
    const tableNumber = sale.table_number ? escapeHtml(String(sale.table_number)) : "";
    const billNumber = sale.bill_number ? escapeHtml(String(sale.bill_number)) : "";
    const waiterName = sale.waiter_name ? escapeHtml(sale.waiter_name) : "";
    const orderType = sale.order_type && sale.order_type !== "counter" ? escapeHtml(sale.order_type.toUpperCase()) : "";
    const customerName = escapeHtml(sale.customer_name || "Walk-in Customer");
    const customerPhone = escapeHtml(sale.customer_phone || sale.customer?.phone || "");
    const customerAddress = escapeHtml(sale.customer_address || sale.customer?.address || "");

    // Sale status badge text
    let statusBadgeText = sale.sale_status.toUpperCase();
    let statusBadgeClass = "";
    if (sale.sale_status === "partially_refunded") {
        statusBadgeText = "PARTIALLY REFUNDED";
        statusBadgeClass = "color: #78350f;";
    } else if (sale.sale_status === "refunded") {
        statusBadgeText = "FULLY REFUNDED";
        statusBadgeClass = "color: #881337;";
    } else if (sale.payment_method === "free") {
        statusBadgeText = "FREE MEAL";
    }

    // Items List HTML
    const itemsHtml = (sale.items || [])
        .map((item) => {
            const refundedWeight = Number(item.refunded_weight || 0);
            const isItemFullyRefunded = Boolean(
                item.is_refunded || (refundedWeight >= Number(item.weight) - 0.0001 && refundedWeight > 0)
            );
            const itemDiscount = Number(item.discount || 0);
            const productName = escapeHtml(item.product_name);
            const subtotalFormatted = formatCurrency(item.subtotal);
            const weightFormatted = formatWeight(item.weight, item.unit);
            const pricePerKgFormatted = formatCurrency(item.price_per_kg);
            const unitLabel = formatUnitLabel(item.unit);

            const nameStyle = isItemFullyRefunded ? "text-decoration: line-through;" : "";
            const subtotalStyle = isItemFullyRefunded ? "text-decoration: line-through; color: #71717a;" : "";

            return `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13px;">
            <span style="${nameStyle}">${productName}</span>
            <span style="${subtotalStyle}">${subtotalFormatted}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #000;">
            <span>${weightFormatted} x ${pricePerKgFormatted}/${unitLabel}</span>
            ${itemDiscount > 0
                    ? `<span style="font-size: 11px;">(Disc: -${formatCurrency(itemDiscount)})</span>`
                    : ""
                }
          </div>
          ${refundedWeight > 0
                    ? `<div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; color: #000; padding-left: 6px; border-left: 2px solid #000; margin-top: 2px;">
                  <span>↳ ${isItemFullyRefunded ? "Returned in Full:" : "Partially Returned:"}</span>
                  <span>-${formatWeight(refundedWeight, item.unit)}</span>
                </div>`
                    : ""
                }
        </div>
      `;
        })
        .join("");

    // Totals Section
    const refundedAmount = Number(sale.refunded_amount || 0);
    const isRefundedSale = refundedAmount > 0;
    const originalTotalFormatted = formatCurrency(sale.total);
    const netTotalFormatted = formatCurrency(Math.max(0, Number(sale.total) - refundedAmount));

    // Banner Box HTML
    let bannerHtml = "";
    if (sale.sale_status === "refunded") {
        bannerHtml = `
      <div style="border: 2px solid #000; padding: 8px; text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          *** SALE FULLY REFUNDED &amp; CANCELLED ***
        </div>
        <div style="font-size: 12px; font-weight: 900; margin-top: 2px;">
          TOTAL REFUNDED: -${formatCurrency(sale.refunded_amount || sale.total)}
        </div>
        ${sale.refund_reason
                ? `<div style="font-size: 11px; font-weight: 700; margin-top: 2px;">Reason: ${escapeHtml(sale.refund_reason)}</div>`
                : ""
            }
        ${sale.refunded_at
                ? `<div style="font-size: 10px; font-weight: 700; margin-top: 2px;">Processed on ${escapeHtml(formatDateTime(sale.refunded_at))}${sale.refunded_by ? ` (${escapeHtml(sale.refunded_by)})` : ""}</div>`
                : ""
            }
      </div>
    `;
    } else if (sale.sale_status === "partially_refunded" || isRefundedSale) {
        bannerHtml = `
      <div style="border: 2px solid #000; padding: 8px; text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          *** PARTIALLY REFUNDED RECEIPT ***
        </div>
        <div style="font-size: 12px; font-weight: 900; margin-top: 2px;">
          REFUNDED: -${formatCurrency(refundedAmount)} &bull; NET: ${netTotalFormatted}
        </div>
        ${sale.refund_reason
                ? `<div style="font-size: 11px; font-weight: 700; margin-top: 2px;">Reason: ${escapeHtml(sale.refund_reason)}</div>`
                : ""
            }
        ${sale.refunded_at
                ? `<div style="font-size: 10px; font-weight: 700; margin-top: 2px;">Refunded on ${escapeHtml(formatDateTime(sale.refunded_at))}${sale.refunded_by ? ` (${escapeHtml(sale.refunded_by)})` : ""}</div>`
                : ""
            }
      </div>
    `;
    } else if (sale.payment_status === "pending" || sale.payment_method === "credit") {
        bannerHtml = `
      <div style="border: 2px solid #000; padding: 8px; text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          *** PAY LATER / CREDIT BILL ***
        </div>
        <div style="font-size: 12px; font-weight: 900; margin-top: 2px;">
          OUTSTANDING DUE: ${formatCurrency(sale.total)}
        </div>
        <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">
          Payment is pending. Please retain this bill until settled.
        </div>
      </div>
    `;
    } else if (sale.payment_method === "free") {
        bannerHtml = `
      <div style="border: 2px solid #000; padding: 8px; text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          *** FREE MEAL / COMPLIMENTARY ***
        </div>
        <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">
          Authorized complimentary order on ${escapeHtml(formatDateTime(sale.settled_at || sale.created_at))}
          ${sale.settled_by ? ` (${escapeHtml(sale.settled_by)})` : ""}
        </div>
      </div>
    `;
    } else {
        bannerHtml = `
      <div style="border: 2px solid #000; padding: 8px; text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          *** PAID &amp; SETTLED IN FULL ***
        </div>
        <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">
          Settled via ${escapeHtml(sale.payment_method.toUpperCase())} on ${escapeHtml(formatDateTime(sale.settled_at || sale.created_at))}
          ${sale.settled_by ? ` (${escapeHtml(sale.settled_by)})` : ""}
        </div>
      </div>
    `;
    }

    // Payment Breakdown Details
    let paymentMethodLabel = (sale.payment_method || "CASH").toUpperCase();
    if (sale.payment_method === "free") {
        paymentMethodLabel = "FREE MEAL (COMPLIMENTARY)";
    } else if (sale.payment_status === "pending" || sale.payment_method === "credit") {
        paymentMethodLabel = "PAY LATER (CREDIT)";
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${saleNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
      width: 76mm;
      margin: 0 auto;
      padding: 8px;
      background: #fff;
      color: #000;
      font-size: 12px;
      line-height: 1.35;
      font-weight: 700;
      -webkit-print-color-adjust: exact;
    }
    .box {
      border: 2px solid #000;
      padding: 8px;
      margin-bottom: 12px;
    }
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .font-black {
      font-weight: 900;
    }
    .text-center {
      text-align: center;
    }
    .border-top {
      border-top: 2px solid #000;
      padding-top: 6px;
      margin-top: 6px;
    }
  </style>
</head>
<body>

  <!-- 1. Header Box -->
  <div class="box text-center">
    <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;">
      ${escapeHtml(shopName)}
    </div>
    ${address ? `<div style="font-size: 12px; font-weight: 700; margin-top: 2px;">${escapeHtml(address)}</div>` : ""}
    ${phone || email || taxPin
            ? `<div style="font-size: 11px; font-weight: 700; margin-top: 2px;">
            ${phone ? `<div>Tel: ${escapeHtml(phone)}</div>` : ""}
            ${email ? `<div>Email: ${escapeHtml(email)}</div>` : ""}
            ${taxPin ? `<div>PIN: ${escapeHtml(taxPin)}</div>` : ""}
          </div>`
            : ""
        }
    <div class="border-top" style="font-size: 12px; font-weight: 700;">
      ${escapeHtml(headerNote)}
    </div>
  </div>

  <!-- 2. Transaction Metadata Box -->
  <div class="box">
    <div class="flex-between font-black" style="font-size: 14px; margin-bottom: 4px;">
      <span>RECEIPT: #${saleNumber}</span>
      <span style="${statusBadgeClass}">${statusBadgeText}</span>
    </div>
    <div style="margin-bottom: 4px;">
      <span>Date: ${createdAtFormatted}</span>
    </div>
    <div style="display: table; width: 100%; font-size: 12px;">
      <div style="display: table-row;">
        <div style="display: table-cell; width: 50%; vertical-align: top;">
          ${tableNumber ? `<div class="font-black">Table: Table ${tableNumber}</div>` : ""}
          ${billNumber ? `<div class="font-black">Bill No: ${billNumber}</div>` : ""}
          ${waiterName ? `<div>Server: ${waiterName}</div>` : ""}
          ${orderType ? `<div>Type: ${orderType}</div>` : ""}
        </div>
        <div style="display: table-cell; width: 50%; vertical-align: top;">
          <div>Customer: ${customerName}</div>
          ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ""}
          ${customerAddress ? `<div>Address: ${customerAddress}</div>` : ""}
        </div>
      </div>
    </div>
  </div>

  <!-- 3. Items Section -->
  <div style="padding: 4px 0 10px 0;">
    ${itemsHtml}
  </div>

  <!-- 4. Subtotal & Total Box -->
  <div class="box">
    <div class="flex-between" style="font-size: 12px;">
      <span>Subtotal:</span>
      <span class="font-black">${formatCurrency(sale.subtotal)}</span>
    </div>

    ${Number(sale.discount || 0) > 0
            ? `<div class="flex-between" style="font-size: 12px; margin-top: 2px;">
            <span>Total Discount:</span>
            <span>-${formatCurrency(sale.discount)}</span>
          </div>`
            : ""
        }

    <div class="flex-between font-black border-top" style="${isRefundedSale ? "font-size: 12px; color: #52525b; text-decoration: line-through;" : "font-size: 15px;"}">
      <span>${isRefundedSale ? "ORIGINAL TOTAL:" : "TOTAL:"}</span>
      <span>${originalTotalFormatted}</span>
    </div>

    ${isRefundedSale
            ? `<div class="flex-between font-black" style="font-size: 12px; margin-top: 4px;">
            <span>REFUNDED AMOUNT:</span>
            <span>-${formatCurrency(refundedAmount)}</span>
          </div>
          <div class="flex-between font-black border-top" style="font-size: 15px; margin-top: 4px;">
            <span>NET TOTAL DUE:</span>
            <span>${netTotalFormatted}</span>
          </div>`
            : ""
        }
  </div>

  <!-- 5. Settlement / Status Banner Box -->
  ${bannerHtml}

  <!-- 6. Payment Breakdown Box -->
  <div class="box">
    <div class="flex-between" style="margin-bottom: 2px;">
      <span>Payment:</span>
      <span class="font-black" style="text-transform: uppercase;">${escapeHtml(paymentMethodLabel)}</span>
    </div>

    ${sale.payment_method === "free"
            ? `<div class="flex-between">
            <span>Amount Charged:</span>
            <span class="font-black">${formatCurrency(0)}</span>
          </div>`
            : ""
        }

    ${sale.payment_method === "cash"
            ? `<div class="flex-between">
            <span>Amount Received:</span>
            <span class="font-black">${formatCurrency(sale.amount_received || sale.total)}</span>
          </div>
          <div class="flex-between font-black">
            <span>Change:</span>
            <span>${formatCurrency(sale.change_given || 0)}</span>
          </div>`
            : ""
        }

    ${sale.payment_method === "mpesa"
            ? `${sale.mpesa_reference
                ? `<div class="flex-between">
                  <span>M-Pesa Ref:</span>
                  <span class="font-black">${escapeHtml(sale.mpesa_reference)}</span>
                </div>`
                : ""
            }
          <div class="flex-between">
            <span>Amount Received:</span>
            <span class="font-black">${formatCurrency(sale.amount_received || sale.total)}</span>
          </div>
          ${sale.change_given !== undefined && Number(sale.change_given) > 0
                ? `<div class="flex-between font-black">
                  <span>Change:</span>
                  <span>${formatCurrency(sale.change_given)}</span>
                </div>`
                : ""
            }`
            : ""
        }

    ${sale.payment_method === "card"
            ? `${sale.card_reference
                ? `<div class="flex-between">
                  <span>Card Ref:</span>
                  <span class="font-black">${escapeHtml(sale.card_reference)}</span>
                </div>`
                : ""
            }
          <div class="flex-between">
            <span>Amount Received:</span>
            <span class="font-black">${formatCurrency(sale.amount_received || sale.total)}</span>
          </div>`
            : ""
        }

    ${isRefundedSale
            ? `<div class="border-top" style="margin-top: 4px;">
            <div class="flex-between">
              <span>Refund Disbursed:</span>
              <span class="font-black">-${formatCurrency(refundedAmount)}</span>
            </div>
            <div class="flex-between font-black">
              <span>Net Retained:</span>
              <span>${netTotalFormatted}</span>
            </div>
          </div>`
            : ""
        }

    ${sale.notes
            ? `<div class="border-top" style="font-size: 11px; margin-top: 4px;">
            Notes: ${escapeHtml(sale.notes)}
          </div>`
            : ""
        }
  </div>

  <!-- 7. Barcode & Thank You Footer Box -->
  <div class="box text-center">
    <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.15em; margin-bottom: 4px;">
      * ${saleNumber} *
    </div>
    <div style="font-size: 12px; font-weight: 900; white-space: pre-line;">
      ${escapeHtml(footerNote)}
    </div>
  </div>

</body>
</html>`;
}
