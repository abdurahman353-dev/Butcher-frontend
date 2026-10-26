"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Sale } from "@/types";
import { salesService } from "@/services/sales.service";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import {
  X,
  Printer,
  Share2,
  Mail,
  MessageCircle,
  Download,
  Loader2,
  Calendar,
} from "lucide-react";

interface SalesSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  cashierId?: string;
  tableNumber?: string;
  initialSales?: Sale[];
}

interface DailyRow {
  dateKey: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM/YYYY
  salesAmountTotal: number;
  finalVat: number;
  finalServiceCharge: number;
  finalDiscounts: number;
  finalTotal: number;
}

export function SalesSummaryPdfModal({
  isOpen,
  onClose,
  dateFrom,
  dateTo,
  paymentMethod = "all",
  paymentStatus = "all",
  cashierId = "all",
  tableNumber = "all",
  initialSales = [],
}: SalesSummaryPdfModalProps) {
  const { settings: shopSettings } = useShopSettings();
  const companyName = shopSettings?.shop_name?.trim() || "JAMBO COAST TASTE HOTEL";
  const companyPhone = shopSettings?.phone?.trim() || "0710 747527 / 0757 363626";

  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [isLoading, setIsLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Compute active date range from filter
  const { startDate, endDate, dateRangeDisplay } = useMemo(() => {
    let start: Date;
    let end: Date;

    const parseLocalDate = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    if (dateFrom && dateTo) {
      start = parseLocalDate(dateFrom);
      end = parseLocalDate(dateTo);
    } else if (dateFrom) {
      start = parseLocalDate(dateFrom);
      end = new Date();
    } else if (dateTo) {
      end = parseLocalDate(dateTo);
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      // Default to current month if no filter specified
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    return {
      startDate: start,
      endDate: end,
      dateRangeDisplay: `from ${fmt(start)} to ${fmt(end)}`,
    };
  }, [dateFrom, dateTo]);

  // Fetch all sales for this date range if needed
  useEffect(() => {
    if (!isOpen) return;

    const fetchRangeSales = async () => {
      try {
        setIsLoading(true);
        setSales([]); // Clear old sales immediately so no stale data is shown
        const pad = (n: number) => String(n).padStart(2, "0");
        const fmtYMD = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const params: any = {
          per_page: 5000,
          date_from: fmtYMD(startDate),
          date_to: fmtYMD(endDate),
        };

        if (paymentMethod && paymentMethod !== "all") params.payment_method = paymentMethod;
        if (paymentStatus && paymentStatus !== "all") params.payment_status = paymentStatus;
        if (cashierId && cashierId !== "all") params.cashier_id = cashierId;
        if (tableNumber && tableNumber !== "all") params.table_number = tableNumber;

        const fetchPromise = salesService.getSales(params);
        const delayPromise = new Promise((resolve) => setTimeout(resolve, 3000));

        const [res] = await Promise.all([fetchPromise, delayPromise]);
        setSales(res.data || []);
      } catch (err) {
        console.error("Failed to fetch range sales:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRangeSales();
  }, [isOpen, startDate, endDate, paymentMethod, paymentStatus, cashierId, tableNumber]);

  // Aggregate daily records matching Image 2 exactly
  const { dailyRows, totals } = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtYMD = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtDisplay = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    // Group sales by day (YYYY-MM-DD)
    const salesByDay: Record<string, { total: number; discount: number }> = {};

    (sales || []).forEach((s) => {
      // Exclude fully refunded or cancelled sales
      if (s.sale_status === "cancelled" || s.sale_status === "refunded") return;

      const dateStr = s.created_at || s.settled_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = fmtYMD(d);

      if (!salesByDay[key]) {
        salesByDay[key] = { total: 0, discount: 0 };
      }

      const netAmount = Math.max(0, Number(s.total || 0) - Number(s.refunded_amount || 0));
      salesByDay[key].total += netAmount;
      salesByDay[key].discount += Number(s.discount || 0);
    });

    // Build row for every day in the range
    const rows: DailyRow[] = [];
    const current = new Date(startDate);
    const targetEnd = new Date(endDate);

    let sumSales = 0;
    let sumVat = 0;
    let sumService = 0;
    let sumDiscounts = 0;
    let sumFinalTotal = 0;

    while (current <= targetEnd) {
      const key = fmtYMD(current);
      const dayData = salesByDay[key] || { total: 0, discount: 0 };

      // 1. The final sale is that day's actual total sale
      const finalTotal = dayData.total;

      // 2. Make VAT, service charge, and discounts 0s for now (percentages removed)
      const finalVat = 0;
      const finalServiceCharge = 0;
      const finalDiscounts = 0;

      // 3. Sales Amount Total is the remaining sale amount after VAT and discounts
      const salesAmountTotal = Math.max(0, finalTotal - finalVat - finalServiceCharge + finalDiscounts);

      rows.push({
        dateKey: key,
        dateDisplay: fmtDisplay(current),
        salesAmountTotal,
        finalVat,
        finalServiceCharge,
        finalDiscounts,
        finalTotal,
      });

      sumSales += salesAmountTotal;
      sumVat += finalVat;
      sumService += finalServiceCharge;
      sumDiscounts += finalDiscounts;
      sumFinalTotal += finalTotal;

      current.setDate(current.getDate() + 1);
    }

    return {
      dailyRows: rows,
      totals: {
        salesAmountTotal: sumSales,
        finalVat: sumVat,
        finalServiceCharge: sumService,
        finalDiscounts: sumDiscounts,
        finalTotal: sumFinalTotal,
      },
    };
  }, [sales, startDate, endDate]);

  // Generate the clean HTML matching Image 2 exactly
  const getReportHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Report ${dateRangeDisplay}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 15px 20px;
    }
    .company-header-box {
      border: 1.5px solid #000;
      padding: 10px 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-family: Arial, Helvetica, sans-serif;
    }
    .company-header-left {
      font-weight: 800;
      font-size: 13px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .company-header-right {
      text-align: right;
    }
    .company-header-right-name {
      font-weight: 800;
      font-size: 13px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .company-header-right-phone {
      font-weight: bold;
      font-size: 12px;
      color: #000;
      margin-top: 3px;
    }
    .top-double-line {
      border-top: 3px solid #000;
      border-bottom: 1.5px solid #000;
      height: 4px;
      width: 100%;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      font-size: 12.5px;
      font-weight: 500;
      color: #000;
      margin: 4px 0 12px 0;
    }
    table.sales-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    table.sales-table th {
      background-color: #e5e7eb;
      border: 1.5px solid #000;
      padding: 5px 6px;
      font-weight: bold;
      color: #000;
      font-size: 10.5px;
      text-align: center;
      line-height: 1.2;
    }
    table.sales-table th.col-date { text-align: left; padding-left: 8px; width: 17%; }
    table.sales-table th.col-sales { width: 17%; }
    table.sales-table th.col-vat { width: 14%; }
    table.sales-table th.col-service { width: 17%; }
    table.sales-table th.col-discount { width: 17%; }
    table.sales-table th.col-final { width: 18%; }

    table.sales-table td {
      padding: 4px 6px;
      color: #000;
      font-size: 10px;
      border-bottom: 1px solid #e5e7eb;
      border-left: 1.5px solid #000;
      border-right: 1.5px solid #000;
      text-align: center;
      white-space: nowrap;
    }
    table.sales-table td.col-date {
      text-align: left;
      padding-left: 8px;
    }
    table.sales-table tfoot td {
      border: 1.5px solid #000;
      background-color: #fed7aa;
      font-weight: bold;
      font-size: 11px;
      padding: 6px 8px;
      text-align: center;
    }
    table.sales-table tfoot td.empty-corner {
      border: none;
      background: transparent;
    }
    @media print {
      @page {
        size: portrait;
        margin: 10mm;
      }
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="company-header-box">
    <div class="company-header-left">${companyName}</div>
    <div class="company-header-right">
      <div class="company-header-right-name">${companyName}</div>
      <div class="company-header-right-phone">${companyPhone}</div>
    </div>
  </div>
  <div class="top-double-line"></div>
  <div class="subtitle">${dateRangeDisplay}</div>
  <table class="sales-table">
    <thead>
      <tr>
        <th class="col-date">Date</th>
        <th class="col-sales">Sales Amount Total</th>
        <th class="col-vat">Final VAT</th>
        <th class="col-service">Final service<br>charge</th>
        <th class="col-discount">Final discounts</th>
        <th class="col-final">Final Total</th>
      </tr>
    </thead>
    <tbody>
      ${dailyRows
        .map(
          (r) => `<tr>
        <td class="col-date">${r.dateDisplay}</td>
        <td>${r.salesAmountTotal.toFixed(2)}</td>
        <td>${r.finalVat.toFixed(2)}</td>
        <td>${r.finalServiceCharge.toFixed(2)}</td>
        <td>${r.finalDiscounts.toFixed(2)}</td>
        <td>${r.finalTotal.toFixed(2)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td class="empty-corner"></td>
        <td>${totals.salesAmountTotal.toFixed(2)}</td>
        <td>${totals.finalVat.toFixed(2)}</td>
        <td>${totals.finalServiceCharge.toFixed(2)}</td>
        <td>${totals.finalDiscounts.toFixed(2)}</td>
        <td>${totals.finalTotal.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  <\/script>
</body>
</html>`;
  };

  // Open native browser print / save as PDF
  const handlePrint = () => {
    const html = getReportHtml();
    const win = window.open("", "_blank", "width=900,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // Generate binary PDF document matching the report layout
  const generatePdfBlob = (): Blob => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 28;
    const contentWidth = pageWidth - margin * 2;

    // 1. Company Header Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.rect(margin, 24, contentWidth, 42);

    // Header left
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(companyName.toUpperCase(), margin + 10, 48);

    // Header right
    doc.text(companyName.toUpperCase(), margin + contentWidth - 10, 42, { align: "right" });
    doc.setFontSize(9.5);
    doc.text(companyPhone, margin + contentWidth - 10, 56, { align: "right" });

    // 2. Double Line
    doc.setLineWidth(2.2);
    doc.line(margin, 74, margin + contentWidth, 74);
    doc.setLineWidth(0.8);
    doc.line(margin, 78, margin + contentWidth, 78);

    // 3. Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(dateRangeDisplay, pageWidth / 2, 94, { align: "center" });

    // 4. Table using autoTable
    const head = [
      [
        "Date",
        "Sales Amount\nTotal",
        "Final\nVAT",
        "Final service\ncharge",
        "Final\ndiscounts",
        "Final\nTotal",
      ],
    ];

    const body = dailyRows.map((r) => [
      r.dateDisplay,
      r.salesAmountTotal.toFixed(2),
      r.finalVat.toFixed(2),
      r.finalServiceCharge.toFixed(2),
      r.finalDiscounts.toFixed(2),
      r.finalTotal.toFixed(2),
    ]);

    const foot = [
      [
        "",
        totals.salesAmountTotal.toFixed(2),
        totals.finalVat.toFixed(2),
        totals.finalServiceCharge.toFixed(2),
        totals.finalDiscounts.toFixed(2),
        totals.finalTotal.toFixed(2),
      ],
    ];

    autoTable(doc, {
      startY: 104,
      margin: { left: margin, right: margin, bottom: 28 },
      head,
      body,
      foot,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 3.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        halign: "center",
      },
      headStyles: {
        fillColor: [229, 231, 235],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.8,
        halign: "center",
      },
      footStyles: {
        fillColor: [254, 215, 170],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.8,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: contentWidth * 0.17 },
        1: { cellWidth: contentWidth * 0.17 },
        2: { cellWidth: contentWidth * 0.14 },
        3: { cellWidth: contentWidth * 0.17 },
        4: { cellWidth: contentWidth * 0.17 },
        5: { cellWidth: contentWidth * 0.18 },
      },
    });

    return doc.output("blob");
  };

  const handleDownloadPdf = () => {
    try {
      const blob = generatePdfBlob();
      const fileName = `Sales-Report-${dateRangeDisplay.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setShareFeedback("PDF downloaded successfully!");
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      setShareFeedback("Failed to download PDF.");
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  // Prepare text summary for WhatsApp / Email
  const summaryText = useMemo(() => {
    return (
      `*${companyName.toUpperCase()}*\n` +
      `Tel: ${companyPhone}\n\n` +
      `*SALES SUMMARY REPORT*\n` +
      `Period: ${dateRangeDisplay}\n` +
      `────────────────────────\n` +
      `• Sales Amount Total: KSh ${totals.salesAmountTotal.toFixed(2)}\n` +
      `• Final VAT: KSh ${totals.finalVat.toFixed(2)}\n` +
      `• Final Service Charge: KSh ${totals.finalServiceCharge.toFixed(2)}\n` +
      `• Final Discounts: KSh ${totals.finalDiscounts.toFixed(2)}\n` +
      `• Final Total: KSh ${totals.finalTotal.toFixed(2)}\n` +
      `• Days Audited: ${dailyRows.length} days\n` +
      `────────────────────────`
    );
  }, [companyName, companyPhone, dateRangeDisplay, totals, dailyRows]);

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(summaryText);
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
    setShareFeedback("Opening WhatsApp...");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Share via Email / Gmail
  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Sales Report (${dateRangeDisplay})`);
    const body = encodeURIComponent(
      `${summaryText}\n\nGenerated from Butcher POS Financial Ledger.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareFeedback("Opening Email client...");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Native Device Share — shares the actual PDF form document, not text
  const handleNativeShare = async () => {
    try {
      setShareFeedback("Preparing PDF form to share...");
      const blob = generatePdfBlob();
      const fileName = `Sales-Report-${dateRangeDisplay.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Sales Report PDF (${dateRangeDisplay})`,
          text: `Sales Report PDF for ${companyName} (${dateRangeDisplay})`,
        });
        setShareFeedback("PDF shared successfully!");
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      }

      // Fallback for browsers that don't support file sharing directly: download the PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setShareFeedback("PDF file generated & downloaded!");
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("PDF share failed:", err);
        handleDownloadPdf();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar with Share and Print Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black tracking-wide flex items-center gap-1.5">
                Sales Report PDF Preview
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {isLoading ? "Querying database (3s verification)..." : `${dateRangeDisplay} • ${dailyRows.length} Days`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isLoading}
              className={`h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Share via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Share via Email / Gmail */}
            <button
              type="button"
              onClick={handleShareEmail}
              disabled={isLoading}
              className={`h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Share via Gmail / Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gmail / Mail</span>
            </button>

            {/* Device Native Apps Share — Shares actual PDF Form */}
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isLoading}
              className={`h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Share PDF Form Document"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share PDF</span>
            </button>

            {/* Direct Save / Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isLoading}
              className={`h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Download PDF Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save PDF</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              className={`h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${isLoading ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 text-center shrink-0">
            {shareFeedback}
          </div>
        )}

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto bg-zinc-200/60 p-3 sm:p-6 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-3xl bg-white shadow-xl border border-zinc-300 p-6 sm:p-8 rounded-sm my-auto"
            style={{ minHeight: "600px" }}
          >
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                  <Printer className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto" />
                </div>
                <h4 className="text-base font-extrabold text-zinc-900 tracking-tight">
                  Compiling & Auditing Sales Ledger...
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Fetching verified live transaction data for <span className="font-semibold text-zinc-700">{dateRangeDisplay}</span> from database.
                </p>
                <div className="w-64 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-4 border border-zinc-200">
                  <div className="h-full bg-emerald-600 rounded-full animate-pulse w-full" />
                </div>
                <div className="w-full max-w-md mt-8 space-y-2 opacity-40">
                  <div className="h-10 bg-zinc-100 rounded border border-zinc-200 animate-pulse" />
                  <div className="h-4 bg-zinc-100 rounded w-1/2 mx-auto animate-pulse" />
                  <div className="h-40 bg-zinc-50 rounded border border-zinc-200 animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Company Header Box — Exact Match to Image 1 */}
                <div className="border-[1.5px] border-black p-2.5 sm:p-3.5 mb-2 flex items-start justify-between font-sans">
                  <div className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">
                    {companyName}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">
                      {companyName}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-black mt-0.5">
                      {companyPhone}
                    </div>
                  </div>
                </div>

                {/* 1. Double line across top */}
                <div
                  className="w-full mb-2"
                  style={{
                    borderTop: "3px solid #000",
                    borderBottom: "1.5px solid #000",
                    height: "4px",
                  }}
                />

                {/* 2. Subtitle: from DD/MM/YYYY to DD/MM/YYYY */}
                <div className="text-center font-sans text-xs sm:text-sm font-medium text-black mb-3">
                  {dateRangeDisplay}
                </div>

                {/* 3. The Table */}
                <div className="overflow-x-auto w-full">
                  <table
                    className="w-full min-w-[620px] border-collapse text-[11px] font-sans text-black"
                    style={{ tableLayout: "fixed" }}
                  >
                    <thead>
                      <tr className="bg-[#e5e7eb] border-y-[1.5px] border-black">
                        <th className="border-[1.5px] border-black p-1.5 text-left font-bold text-[10.5px] w-[17%] min-w-[90px] whitespace-nowrap pl-2">
                          Date
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[17%] whitespace-nowrap">
                          Sales Amount Total
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[14%] whitespace-nowrap">
                          Final VAT
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[17%] leading-tight whitespace-nowrap">
                          Final service
                          <br />
                          charge
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[17%] whitespace-nowrap">
                          Final discounts
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[18%] whitespace-nowrap">
                          Final Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((row) => (
                        <tr
                          key={row.dateKey}
                          className="border-b border-[#e5e7eb] hover:bg-zinc-50"
                        >
                          <td className="p-1 sm:p-1.5 border-x-[1.5px] border-black text-left font-normal whitespace-nowrap pl-2">
                            {row.dateDisplay}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal whitespace-nowrap">
                            {row.salesAmountTotal.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal whitespace-nowrap">
                            {row.finalVat.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal whitespace-nowrap">
                            {row.finalServiceCharge.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal whitespace-nowrap">
                            {row.finalDiscounts.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal whitespace-nowrap">
                            {row.finalTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-y-[1.5px] border-black">
                        <td className="border-none bg-transparent" />
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px] whitespace-nowrap">
                          {totals.salesAmountTotal.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px] whitespace-nowrap">
                          {totals.finalVat.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px] whitespace-nowrap">
                          {totals.finalServiceCharge.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px] whitespace-nowrap">
                          {totals.finalDiscounts.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px] whitespace-nowrap">
                          {totals.finalTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
