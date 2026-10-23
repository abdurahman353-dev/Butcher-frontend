"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  finalVat: number; // 16%
  finalServiceCharge: number; // 2%
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

        const res = await salesService.getSales(params);
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

      const salesAmountTotal = dayData.total;
      const finalVat = salesAmountTotal * 0.16; // Final VAT 16%
      const finalServiceCharge = salesAmountTotal * 0.02; // Final Service Charge 2%
      const finalDiscounts = dayData.discount;
      const finalTotal = salesAmountTotal - finalDiscounts + finalVat + finalServiceCharge;

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
    table.sales-table th.col-date { text-align: left; padding-left: 8px; width: 13%; }
    table.sales-table th.col-sales { width: 18%; }
    table.sales-table th.col-vat { width: 15%; }
    table.sales-table th.col-service { width: 18%; }
    table.sales-table th.col-discount { width: 18%; }
    table.sales-table th.col-final { width: 18%; }

    table.sales-table td {
      padding: 3.5px 8px;
      color: #000;
      font-size: 10.5px;
      border-bottom: 1px solid #e5e7eb;
      border-left: 1.5px solid #000;
      border-right: 1.5px solid #000;
      text-align: center;
    }
    table.sales-table td.col-date {
      text-align: left;
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
        <td>${r.finalVat.toFixed(3)}</td>
        <td>${r.finalServiceCharge.toFixed(2)}</td>
        <td>${r.finalDiscounts.toFixed(3)}</td>
        <td>${r.finalTotal.toFixed(2)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td class="empty-corner"></td>
        <td>${totals.salesAmountTotal.toFixed(2)}</td>
        <td>${totals.finalVat.toFixed(3)}</td>
        <td>${totals.finalServiceCharge.toFixed(2)}</td>
        <td>${totals.finalDiscounts.toFixed(3)}</td>
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

  // Prepare text summary for WhatsApp / Email
  const summaryText = useMemo(() => {
    return (
      `*${companyName.toUpperCase()}*\n` +
      `Tel: ${companyPhone}\n\n` +
      `*SALES SUMMARY REPORT*\n` +
      `Period: ${dateRangeDisplay}\n` +
      `────────────────────────\n` +
      `• Gross Sales Total: KSh ${totals.salesAmountTotal.toFixed(2)}\n` +
      `• Final VAT (16%): KSh ${totals.finalVat.toFixed(3)}\n` +
      `• Final Service Charge (2%): KSh ${totals.finalServiceCharge.toFixed(2)}\n` +
      `• Total Discounts: KSh ${totals.finalDiscounts.toFixed(3)}\n` +
      `• Final Net Total: KSh ${totals.finalTotal.toFixed(2)}\n` +
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

  // Native Device Share (WhatsApp, Google Drive, Gmail, etc.)
  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Sales Report ${dateRangeDisplay}`,
          text: summaryText,
        });
        setShareFeedback("Shared successfully!");
        setTimeout(() => setShareFeedback(null), 3000);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleShareWhatsApp();
        }
      }
    } else {
      handleShareWhatsApp();
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
              <h3 className="text-sm font-black tracking-wide">
                Sales Report PDF Preview
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {dateRangeDisplay} • {dailyRows.length} Days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Share via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Share via Email / Gmail */}
            <button
              type="button"
              onClick={handleShareEmail}
              className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Share via Gmail / Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gmail / Mail</span>
            </button>

            {/* Device Native Apps Share */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Share to other apps (Google, WhatsApp, etc.)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share Apps</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
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

        {/* Scrollable Document Canvas - EXACT Image 2 Look */}
        <div className="flex-1 overflow-y-auto bg-zinc-200/60 p-3 sm:p-6 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-3xl bg-white shadow-xl border border-zinc-300 p-6 sm:p-8 rounded-sm my-auto"
            style={{ minHeight: "600px" }}
          >
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm font-bold">Compiling sales ledger...</p>
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
                <div className="overflow-x-auto">
                  <table
                    className="w-full border-collapse text-[11px] font-sans text-black"
                    style={{ tableLayout: "fixed" }}
                  >
                    <thead>
                      <tr className="bg-[#e5e7eb] border-y-[1.5px] border-black">
                        <th className="border-[1.5px] border-black p-1.5 text-left font-bold text-[10.5px] w-[13%]">
                          Date
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[18%]">
                          Sales Amount Total
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[15%]">
                          Final VAT
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[18%] leading-tight">
                          Final service
                          <br />
                          charge
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[18%]">
                          Final discounts
                        </th>
                        <th className="border-[1.5px] border-black p-1.5 text-center font-bold text-[10.5px] w-[18%]">
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
                          <td className="p-1 sm:p-1.5 border-x-[1.5px] border-black text-left font-normal">
                            {row.dateDisplay}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal">
                            {row.salesAmountTotal.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal">
                            {row.finalVat.toFixed(3)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal">
                            {row.finalServiceCharge.toFixed(2)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal">
                            {row.finalDiscounts.toFixed(3)}
                          </td>
                          <td className="p-1 sm:p-1.5 border-r-[1.5px] border-black text-center font-normal">
                            {row.finalTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-y-[1.5px] border-black">
                        <td className="border-none bg-transparent" />
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px]">
                          {totals.salesAmountTotal.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px]">
                          {totals.finalVat.toFixed(3)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px]">
                          {totals.finalServiceCharge.toFixed(2)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px]">
                          {totals.finalDiscounts.toFixed(3)}
                        </td>
                        <td className="bg-[#fed7aa] border-[1.5px] border-black p-1.5 text-center font-bold text-[11px]">
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
