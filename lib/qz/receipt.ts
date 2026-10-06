/**
 * receipt.ts
 * Formats POS sales into standard ESC/POS thermal printer commands (80mm / 48 columns).
 * Supported by all EPSON, Xprinter, Rongta, Bixolon, Star, and generic thermal printers.
 */

import { Sale, SaleItem, ShopSettings } from "@/types";

// Helper to pad strings for fixed-width columns (default 42 chars for standard 80mm/58mm font A)
const LINE_WIDTH = 42;

function padLine(left: string, right: string, width = LINE_WIDTH): string {
  const total = left.length + right.length;
  if (total >= width) {
    const maxLeft = width - right.length - 1;
    return left.substring(0, maxLeft) + " " + right;
  }
  return left + " ".repeat(width - total) + right;
}

function centerText(text: string, width = LINE_WIDTH): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  return " ".repeat(leftPad) + text;
}

function divider(char = "-", width = LINE_WIDTH): string {
  return char.repeat(width) + "\n";
}

export interface ReceiptFormatOptions {
  openCashDrawer?: boolean;
  cutPaper?: boolean;
}

/**
 * Builds raw ESC/POS byte commands for a completed Sale receipt.
 */
export function buildEscPosReceipt(
  sale: Sale,
  settings?: Partial<ShopSettings>,
  options: ReceiptFormatOptions = { cutPaper: true }
): any[] {
  const storeName = settings?.shop_name || "BUTCHER & RESTAURANT";
  const storePhone = settings?.phone || "";
  const storeAddress = settings?.address || "";
  const storeTaxPin = settings?.tax_pin || "";
  const footerMsg = settings?.receipt_footer || "THANK YOU FOR YOUR PATRONAGE!";

  const commands: any[] = [
    "\x1B\x40", // ESC @ - Initialize printer
  ];

  if (options.openCashDrawer) {
    commands.push("\x1B\x70\x00\x19\xFA"); // ESC p 0 25 250 - Kick drawer pin 2
  }

  // --- HEADER ---
  commands.push("\x1B\x61\x01"); // Center align
  commands.push("\x1B\x45\x01"); // Bold ON
  commands.push("\x1B\x21\x20"); // Double width
  commands.push(`${storeName}\n`);
  commands.push("\x1B\x21\x00"); // Normal text
  commands.push("\x1B\x45\x00"); // Bold OFF

  if (storeAddress) commands.push(`${storeAddress}\n`);
  if (storePhone) commands.push(`Tel: ${storePhone}\n`);
  if (storeTaxPin) commands.push(`PIN: ${storeTaxPin}\n`);

  commands.push(divider("="));

  // --- ORDER METADATA ---
  commands.push("\x1B\x61\x00"); // Left align
  const saleCode = sale.sale_number || `#${sale.id}`;
  const saleDate = sale.created_at ? new Date(sale.created_at).toLocaleString() : new Date().toLocaleString();

  commands.push(padLine(`Receipt: ${saleCode}`, `Date: ${saleDate.split(",")[0]}`) + "\n");
  commands.push(padLine(`Time: ${saleDate.split(",")[1]?.trim() || ""}`, `Cashier: ${sale.cashier_name || "Staff"}`) + "\n");

  if (sale.table_number) {
    commands.push(padLine(`Table: Table ${sale.table_number}`, "") + "\n");
  }

  if (sale.customer_name) {
    commands.push(`Customer: ${sale.customer_name}${sale.customer_phone ? ` (${sale.customer_phone})` : ""}\n`);
  }

  commands.push(divider("-"));

  // --- ITEMS HEADER ---
  commands.push(padLine("ITEM", "QTY x PRICE        TOTAL") + "\n");
  commands.push(divider("-"));

  // --- ITEMS LIST ---
  const items: SaleItem[] = sale.items || [];
  for (const item of items) {
    const name = item.product_name || "Item";
    const qty = Number(item.weight || 1).toFixed(item.unit === "KG" ? 3 : 0);
    const unit = item.unit || "KG";
    const price = Number(item.price_per_kg || 0).toFixed(2);
    const total = Number(item.subtotal || 0).toFixed(2);

    commands.push(`\x1B\x45\x01${name}\x1B\x45\x00\n`);
    const lineRight = `${qty} ${unit} @ ${price}    ${total}`;
    commands.push("  " + padLine("", lineRight, LINE_WIDTH - 2) + "\n");
  }

  commands.push(divider("-"));

  // --- TOTALS ---
  const subtotal = Number(sale.subtotal || 0).toFixed(2);
  const discount = Number(sale.discount || 0);
  const grandTotal = Number(sale.total || 0).toFixed(2);

  commands.push(padLine("SUBTOTAL:", `KSh ${subtotal}`) + "\n");
  if (discount > 0) {
    commands.push(padLine("DISCOUNT:", `-KSh ${discount.toFixed(2)}`) + "\n");
  }

  commands.push("\x1B\x45\x01\x1B\x21\x10"); // Bold + Double height
  commands.push(padLine("TOTAL:", `KSh ${grandTotal}`) + "\n");
  commands.push("\x1B\x21\x00\x1B\x45\x00"); // Normal text

  commands.push(divider("-"));

  // --- PAYMENT DETAILS ---
  let paymentMethod = (sale.payment_method || "cash").toUpperCase();
  if (sale.payment_method === "free") {
    paymentMethod = "FREE MEAL (COMPLIMENTARY)";
  } else if (sale.payment_status === "pending" || sale.payment_method === "credit") {
    paymentMethod = "PAY LATER (CREDIT)";
  }
  commands.push(padLine("PAYMENT METHOD:", paymentMethod) + "\n");

  if (sale.payment_method === "free") {
    commands.push(padLine("AMOUNT CHARGED:", "KSh 0.00") + "\n");
  } else {
    if (sale.amount_received && Number(sale.amount_received) > 0) {
      commands.push(padLine("CASH TENDERED:", `KSh ${Number(sale.amount_received).toFixed(2)}`) + "\n");
    }
    if (sale.change_given && Number(sale.change_given) > 0) {
      commands.push(padLine("CHANGE:", `KSh ${Number(sale.change_given).toFixed(2)}`) + "\n");
    }
    if (sale.mpesa_reference) {
      commands.push(padLine("MPESA REF:", sale.mpesa_reference) + "\n");
    }
  }

  // --- FOOTER ---
  commands.push(divider("="));
  commands.push("\x1B\x61\x01"); // Center align
  commands.push(`${footerMsg}\n`);
  commands.push("Goods once sold are not returnable.\n");
  commands.push("\n\n\n"); // Feed paper

  if (options.cutPaper) {
    commands.push("\x1D\x56\x41\x03"); // GS V A 3 - Feed and full cut
  }

  return commands;
}

/**
 * Builds raw ESC/POS byte commands for a Kitchen Order Slip (KOT / Chef Slip).
 */
export function buildKitchenSlipEscPos(
  bill: any,
  items: any[],
  waiterName?: string,
  tableName?: string
): any[] {
  const commands: any[] = [
    "\x1B\x40", // Initialize
    "\x1B\x61\x01", // Center
    "\x1B\x45\x01\x1B\x21\x30", // Quad size bold
    "** KITCHEN ORDER **\n",
    "\x1B\x21\x00\x1B\x45\x00",
    divider("="),
    "\x1B\x61\x00", // Left
    padLine(`Table: ${tableName || bill.table_name || "N/A"}`, `Time: ${new Date().toLocaleTimeString()}`) + "\n",
    padLine(`Bill: #${bill.id || "NEW"}`, `Waiter: ${waiterName || bill.waiter_name || "Staff"}`) + "\n",
    divider("="),
    padLine("ITEM / DISH", "QTY") + "\n",
    divider("-"),
  ];

  for (const item of items) {
    const qty = Number(item.weight || item.quantity || 1).toFixed(item.unit === "KG" ? 3 : 0);
    const unit = item.unit || "PCS";
    commands.push("\x1B\x45\x01\x1B\x21\x10"); // Double height bold
    commands.push(padLine(item.product_name, `${qty} ${unit}`) + "\n");
    commands.push("\x1B\x21\x00\x1B\x45\x00"); // Normal
    if (item.notes) {
      commands.push(`  >>> NOTE: ${item.notes}\n`);
    }
  }

  commands.push(divider("="));
  commands.push("\n\n\n");
  commands.push("\x1D\x56\x41\x03"); // Cut

  return commands;
}
