/**
 * receipt.ts
 * Formats POS sales into standard ESC/POS thermal printer commands (80mm / 48 columns).
 * Supported by all EPSON, Xprinter, Rongta, Bixolon, Star, and generic thermal printers.
 */

import { Sale, SaleItem, ShopSettings } from "@/types";

// Single named constant for thermal receipt line width (42 or 48 columns)
export const LINE_WIDTH = 42;

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
  if (sale.table_number || sale.bill_number) {
    return buildRestaurantReceiptEscPos(sale, settings, options);
  }
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
  commands.push(padLine(`Time: ${saleDate.split(",")[1]?.trim() || ""}`, sale.waiter_name ? `Server: ${sale.waiter_name}` : "") + "\n");

  if (sale.table_number && sale.bill_number) {
    commands.push(padLine(`Table: Table ${sale.table_number}`, `Bill: ${sale.bill_number}`) + "\n");
  } else if (sale.table_number) {
    commands.push(padLine(`Table: Table ${sale.table_number}`, "") + "\n");
  } else if (sale.bill_number) {
    commands.push(padLine(`Bill: ${sale.bill_number}`, "") + "\n");
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
  tableName?: string,
  categoryName?: string,
  slipIndex?: number,
  totalSlips?: number
): any[] {
  const commands: any[] = [
    "\x1B\x40", // Initialize
    "\x1B\x61\x01", // Center
    "\x1B\x45\x01\x1B\x21\x30", // Quad size bold
    "** KITCHEN ORDER **\n",
    "\x1B\x21\x00\x1B\x45\x00",
  ];

  if (categoryName) {
    commands.push("\x1B\x45\x01\x1B\x21\x20"); // Double height bold
    commands.push(`STATION: ${categoryName.toUpperCase()}\n`);
    commands.push("\x1B\x21\x00\x1B\x45\x00");
  }

  if (totalSlips && totalSlips > 1 && slipIndex) {
    commands.push(`[ SLIP ${slipIndex} OF ${totalSlips} ]\n`);
  }

  commands.push(
    divider("="),
    "\x1B\x61\x00", // Left
    padLine(`Table: ${tableName || bill.table_name || "N/A"}`, `Time: ${new Date().toLocaleTimeString()}`) + "\n",
    padLine(`Bill: #${bill.id || bill.bill_number || "NEW"}`, `Waiter: ${waiterName || bill.waiter_name || "Staff"}`) + "\n",
    divider("="),
    padLine("ITEM / DISH", "QTY") + "\n",
    divider("-")
  );

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
  if (categoryName) {
    commands.push(`Section: ${categoryName}\n`);
  }
  commands.push("\n\n\n");
  commands.push("\x1D\x56\x41\x03"); // Cut

  return commands;
}

/**
 * Safely converts an array of ESC/POS command strings / byte buffers into a base64 string.
 * Ensures characters are masked to <= 255 before btoa encoding.
 */

export function formatReceiptDate(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatReceiptTime(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${ampm}`;
}

export function cleanBillNumber(billNumber?: string | null, id?: number | null): string {
  if (!billNumber && id) return String(id);
  if (!billNumber) return "";
  const match = billNumber.match(/(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? billNumber : String(num);
  }
  return billNumber;
}

function format3Col(col1: string, col2: string, col3: string, width = LINE_WIDTH): string {
  const c2 = String(col2);
  const c3 = String(col3);
  const rightPart = c2.padStart(6) + c3.padStart(10);
  const maxCol1 = width - rightPart.length;
  const leftPart = col1.length > maxCol1 ? col1.substring(0, maxCol1) : col1.padEnd(maxCol1);
  return leftPart + rightPart;
}

/**
 * Builds raw ESC/POS byte commands for a restaurant receipt matching the exact physical receipt layout.
 */
export function buildRestaurantReceiptEscPos(
  data: any,
  settings?: Partial<ShopSettings>,
  options: ReceiptFormatOptions = { cutPaper: true }
): any[] {
  const storeName = settings?.shop_name || "JAMBO COAST PRIDE HOTEL";
  const storePhone = settings?.phone || "0710 747527 / 0757 363626";
  const paybillNo = settings?.tax_pin || "";

  const commands: any[] = [
    "\x1B\x40", // Initialize
  ];

  if (options.openCashDrawer) {
    commands.push("\x1B\x70\x00\x19\xFA"); // Drawer kick
  }

  // 1. Centered Header
  commands.push("\x1B\x61\x01"); // Center align
  commands.push("\x1B\x45\x01"); // Bold ON
  commands.push(`${storeName}\n`);
  commands.push("\x1B\x45\x00"); // Bold OFF
  commands.push(`${storePhone}\n`);
  commands.push(paybillNo ? `MPESA PAYBILL NO: ${paybillNo}\n` : "MPESA PAYBILL NO:\n");

  // 2. Metadata: Bill No., Table N, Date, Time, Served by, DINE IN, Zone
  commands.push("\x1B\x61\x00"); // Left align
  const billNo = cleanBillNumber(data.bill_number, data.id) || "1";
  const tableNo = data.table_number || "1";
  const dateStr = formatReceiptDate(data.bill_printed_at || data.created_at);
  const timeStr = formatReceiptTime(data.bill_printed_at || data.created_at);
  const waiterName = data.waiter_name || "Staff";
  const orderType = data.order_type ? String(data.order_type).toUpperCase().replace("_", " ") : "DINE IN";
  const zoneName = data.zone || data.table?.zone || "BACK HALL";

  commands.push(padLine(`Bill No.        ${billNo}`, dateStr) + "\n");
  commands.push(padLine(`Table N         ${tableNo}`, timeStr) + "\n");
  commands.push(`Served by:      ${waiterName}\n`);

  commands.push("\x1B\x61\x01"); // Center align
  commands.push(`${orderType}\n`);
  commands.push(`${zoneName}\n`);

  // 3. Item Table Header
  commands.push("\x1B\x61\x00"); // Left align
  commands.push(divider("-"));
  commands.push(format3Col("Item name", "Qty", "total") + "\n");
  commands.push(divider("-"));

  // 4. Line Items
  const items = data.items || [];
  for (const it of items) {
    const name = it.product_name || "Item";
    const qty = Math.round(Number(it.weight || it.quantity || 1));
    const total = Math.round(Number(it.line_total || it.subtotal || 0));
    commands.push(format3Col(name, String(qty), String(total)) + "\n");
    if (it.notes && it.notes.trim()) {
      commands.push(`  ${it.notes.trim()} #\n`);
    }
  }

  // 5. Totals
  commands.push(divider("-"));
  const grossTotal = Number(data.total || data.subtotal || 0);
  const ctLevy = grossTotal > 0 ? grossTotal - (grossTotal / 1.02) : 0;
  const totalVat = ctLevy;

  commands.push(padLine("Total", String(Math.round(grossTotal))) + "\n");
  commands.push(padLine("16% VAT", "0.00") + "\n");
  commands.push(padLine("2% C.T Levy", ctLevy.toFixed(2)) + "\n");
  commands.push(padLine("Total Vat", totalVat.toFixed(2)) + "\n");
  commands.push(padLine("Net Amount", String(Math.round(grossTotal))) + "\n");

  // Payment Breakdown if settled
  if (!data.isPreBill) {
    const method = (data.payment_method || "cash").toLowerCase();
    if (method === "cash") {
      const rec = Number(data.amount_received || grossTotal);
      const chg = Number(data.change_given || 0);
      commands.push(padLine("Cash", `KSh ${rec.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) + "\n");
      commands.push(padLine("Change", `KSh ${chg.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) + "\n");
    } else if (method === "mpesa") {
      commands.push(padLine("M-Pesa", `KSh ${grossTotal.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) + "\n");
      if (data.mpesa_reference) {
        commands.push(padLine("Ref:", data.mpesa_reference) + "\n");
      }
    } else {
      commands.push(padLine(method.toUpperCase(), `KSh ${grossTotal.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) + "\n");
    }
  }

  const cashier = data.cashier_name || data.bill_printed_by || data.settled_by || "Muhammad";
  commands.push(`Prepared by   ${cashier}\n`);

  // 6. Centered Footer
  const thankYouText = "Thank you";
  const dashesEach = Math.max(1, Math.floor((LINE_WIDTH - thankYouText.length - 2) / 2));
  const thankYouLine = "-".repeat(dashesEach) + " " + thankYouText + " " + "-".repeat(dashesEach);
  commands.push("\x1B\x61\x01"); // Center
  commands.push(`${thankYouLine}\n`);
  commands.push("\n\n\n");

  if (options.cutPaper) {
    commands.push("\x1D\x56\x41\x03"); // Cut paper
  }

  return commands;
}

export function encodeEscPosCommandsToBase64(commands: any[]): string {
  let binary = "";
  for (const cmd of commands) {
    if (typeof cmd === "string") {
      for (let i = 0; i < cmd.length; i++) {
        const code = cmd.charCodeAt(i);
        binary += String.fromCharCode(code & 0xff);
      }
    } else if (cmd instanceof Uint8Array || Array.isArray(cmd)) {
      for (let i = 0; i < cmd.length; i++) {
        binary += String.fromCharCode(cmd[i] & 0xff);
      }
    }
  }
  return typeof window !== "undefined" ? window.btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
