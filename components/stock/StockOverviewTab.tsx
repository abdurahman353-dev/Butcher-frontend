"use client";

import React, { useState, useMemo } from "react";
import { StockExpenseAnalytics, RestaurantStockItem } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    UtensilsCrossed,
    PieChart,
    Percent,
    SlidersHorizontal,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar,
    FileText,
    Boxes,
    ShoppingBag,
    AlertTriangle,
    RotateCcw,
} from "lucide-react";

interface StockOverviewTabProps {
    analytics: StockExpenseAnalytics | null;
    stocks: RestaurantStockItem[];
    isLoading: boolean;
    period: string;
    onPeriodChange: (p: string) => void;
    startDate: string;
    onStartDateChange: (d: string) => void;
    endDate: string;
    onEndDateChange: (d: string) => void;
    onNavigateToIssues: () => void;
    onNavigateToStore: () => void;
}

export function StockOverviewTab({
    analytics,
    stocks,
    isLoading,
    period,
    onPeriodChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    onNavigateToIssues,
    onNavigateToStore,
}: StockOverviewTabProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [trendFilter, setTrendFilter] = useState<"all" | "profit" | "loss">("all");
    const [trendSort, setTrendSort] = useState<"date_desc" | "date_asc" | "sales_high" | "expense_high">("date_desc");
    const [trendPage, setTrendPage] = useState(1);
    const [catPage, setCatPage] = useState(1);
    const [itemPage, setItemPage] = useState(1);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const TREND_PAGE_SIZE = 5;
    const CAT_PAGE_SIZE = 4;
    const ITEM_PAGE_SIZE = 5;

    const toggleCategory = (cat: string) => {
        setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const {
        total_sales_revenue,
        sales_transactions_count,
        total_stock_consumed,
        total_stock_purchased,
        in_kitchen_active_cost,
        gross_kitchen_margin,
        food_cost_ratio,
        category_breakdown,
        top_items,
        trend,
    } = analytics || {
        total_sales_revenue: 0,
        sales_transactions_count: 0,
        total_stock_consumed: 0,
        total_stock_purchased: 0,
        in_kitchen_active_cost: 0,
        gross_kitchen_margin: 0,
        food_cost_ratio: 0,
        category_breakdown: [],
        top_items: [],
        trend: [],
    };

    // Filtered & sorted trend data
    const filteredTrend = useMemo(() => {
        let items = [...(trend || [])];
        if (startDate) {
            items = items.filter((d) => d.date.slice(0, 10) >= startDate);
        }
        if (endDate) {
            items = items.filter((d) => d.date.slice(0, 10) <= endDate);
        }
        if (trendFilter === "profit") {
            items = items.filter((d) => d.net >= 0);
        } else if (trendFilter === "loss") {
            items = items.filter((d) => d.net < 0);
        }
        items.sort((a, b) => {
            if (trendSort === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (trendSort === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (trendSort === "sales_high") return b.sales - a.sales;
            if (trendSort === "expense_high") return b.expenses - a.expenses;
            return 0;
        });
        return items;
    }, [trend, startDate, endDate, trendFilter, trendSort]);

    const totalTrendPages = Math.max(1, Math.ceil(filteredTrend.length / TREND_PAGE_SIZE));
    const safeTrendPage = Math.min(trendPage, totalTrendPages);
    const pagedTrend = filteredTrend.slice((safeTrendPage - 1) * TREND_PAGE_SIZE, safeTrendPage * TREND_PAGE_SIZE);

    // Paginated categories
    const categories = category_breakdown || [];
    const totalCatPages = Math.max(1, Math.ceil(categories.length / CAT_PAGE_SIZE));
    const safeCatPage = Math.min(catPage, totalCatPages);
    const pagedCategories = categories.slice((safeCatPage - 1) * CAT_PAGE_SIZE, safeCatPage * CAT_PAGE_SIZE);

    // Paginated top items
    const items = top_items || [];
    const totalItemPages = Math.max(1, Math.ceil(items.length / ITEM_PAGE_SIZE));
    const safeItemPage = Math.min(itemPage, totalItemPages);
    const pagedItems = items.slice((safeItemPage - 1) * ITEM_PAGE_SIZE, safeItemPage * ITEM_PAGE_SIZE);

    const activeFilterCount = [
        Boolean(startDate),
        Boolean(endDate),
        period !== "today" && !startDate && !endDate,
        trendFilter !== "all",
        trendSort !== "date_desc",
    ].filter(Boolean).length;

    // Food cost benchmark evaluation
    const isHealthyFoodCost = food_cost_ratio > 0 && food_cost_ratio <= 35;
    const isModerateFoodCost = food_cost_ratio > 35 && food_cost_ratio <= 45;

    const { settings: shopSettings } = useShopSettings();
    const { user } = useAuth();

    // ── PDF Generator ────────────────────────────────────────────────────────
    const generatePDF = () => {
        const fmt = (n: number) => `KSh ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const fmtQty = (q: number, unit?: string) => {
            const val = Number(q) % 1 === 0 ? Number(q).toFixed(0) : Number(q).toFixed(2);
            return `${val} ${unit || "KG"}`;
        };
        const now = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "long", timeStyle: "short" });
        const shopTitle = shopSettings?.shop_name || user?.company?.name || "RESTAURANT KITCHEN";
        const shopAddress = shopSettings?.address || "Kitchen & Stock Inventory Operations";
        const rangeLabel = startDate && endDate
            ? `${startDate} to ${endDate}`
            : startDate
            ? `From ${startDate}`
            : endDate
            ? `Up to ${endDate}`
            : (period ? period.replace("_", " ").toUpperCase() : "Today");

        // 1. Sales per category of items
        const salesCategories = analytics?.sales_category_breakdown || [];

        // 2. Kitchen stock items used grouped by category (with Restock Needed: Qty Used * Unit Cost)
        const categorizedKitchenStock = (analytics?.categorized_kitchen_stock && analytics.categorized_kitchen_stock.length > 0)
            ? analytics.categorized_kitchen_stock
            : (() => {
                const catMap: Record<string, { category_name: string; subtotal_qty: number; subtotal_restock_cost: number; items: any[] }> = {};
                (top_items || []).forEach((it) => {
                    const matchStock = (stocks || []).find((s) => s.item_name.toLowerCase() === it.item_name.toLowerCase());
                    const cat = matchStock?.category || "Kitchen Ingredients";
                    const unitCost = it.total_qty > 0 ? it.total_cost / it.total_qty : (matchStock?.unit_cost || 0);
                    const restockCost = it.total_qty * unitCost;
                    if (!catMap[cat]) {
                        catMap[cat] = { category_name: cat, subtotal_qty: 0, subtotal_restock_cost: 0, items: [] };
                    }
                    catMap[cat].subtotal_qty += it.total_qty;
                    catMap[cat].subtotal_restock_cost += restockCost;
                    catMap[cat].items.push({
                        item_name: it.item_name,
                        unit: it.unit || "KG",
                        unit_cost: unitCost,
                        used_quantity: it.total_qty,
                        restock_cost: restockCost,
                        current_quantity: matchStock?.current_quantity || 0,
                        min_threshold: matchStock?.min_threshold || 0,
                        is_low_stock: matchStock ? matchStock.current_quantity < matchStock.min_threshold : false,
                    });
                });
                return Object.values(catMap);
            })();

        const totalRestockCostUsed = analytics?.total_restock_cost_used ?? total_stock_consumed;

        // 3. Low-stock store items (current_quantity < min_threshold)
        const lowStockItems = (stocks || []).filter(
            (s) => s.min_threshold > 0 && s.current_quantity < s.min_threshold
        );
        const storeShortfallBudget = analytics?.store_restock_budget_needed ?? lowStockItems.reduce(
            (sum, s) => sum + Math.max(0, s.min_threshold - s.current_quantity) * (s.unit_cost || 0), 0
        );

        const totalFreedQty = salesCategories.reduce((sum, sc) => sum + (sc.subtotal_freed_qty || 0), 0);
        const totalFreedAmount = salesCategories.reduce((sum, sc) => sum + (sc.subtotal_freed_amount || 0), 0);
        const totalDiscount = salesCategories.reduce((sum, sc) => sum + (sc.subtotal_discount || 0), 0);

        // Sales Category Table HTML with itemized dish breakdown (including Freed Quantity, Freed Amount, Discount)
        const salesCatHTML = salesCategories.length > 0 ? `
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#15803d;border-bottom:2px solid #16a34a;padding:6px 0;margin:18px 0 8px;display:flex;justify-content:space-between">
            <span>🍽️ 1. Restaurant Sales by Menu Category & Itemized Dishes</span>
            <span style="font-size:10px;color:#6b7280;text-transform:none">Total Revenue: ${fmt(total_sales_revenue)}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px">
            <tbody>
              ${salesCategories.map((sc, catIdx) => {
                  const itemRows = (sc.items && sc.items.length > 0)
                      ? sc.items.map((it: any) => `
                        <tr>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600">${it.name}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${it.qty > 0 ? fmtQty(it.qty, it.unit) : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#15803d">${it.total_price > 0 ? fmt(it.total_price) : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#7e22ce;font-weight:700">${(it.freed_qty || 0) > 0 ? fmtQty(it.freed_qty, it.unit) : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#7e22ce;font-weight:700">${(it.freed_amount || 0) > 0 ? fmt(it.freed_amount) : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:${(it.discount || 0) > 0 ? "#b45309" : "#9ca3af"}">${(it.discount || 0) > 0 ? `-${fmt(it.discount)}` : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center"><span style="background:#f0fdf4;color:#166534;padding:1.5px 6px;border-radius:10px;font-size:9px;font-weight:700">${sc.total_sales > 0 ? Math.round((it.total_price / sc.total_sales) * 100) : 0}%</span></td>
                        </tr>`).join("")
                      : `
                        <tr>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600">${sc.category} Items</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtQty(sc.total_qty, "ITEMS")}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#15803d">${fmt(sc.total_sales)}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#7e22ce;font-weight:700">${(sc.subtotal_freed_qty || 0) > 0 ? fmtQty(sc.subtotal_freed_qty || 0, "ITEMS") : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#7e22ce;font-weight:700">${(sc.subtotal_freed_amount || 0) > 0 ? fmt(sc.subtotal_freed_amount || 0) : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:${(sc.subtotal_discount || 0) > 0 ? "#b45309" : "#9ca3af"}">${(sc.subtotal_discount || 0) > 0 ? `-${fmt(sc.subtotal_discount || 0)}` : "-"}</td>
                          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">100%</td>
                        </tr>`;

                  return `
                  <!-- Category Header Banner -->
                  <tr style="background:#14532d;color:#fff">
                    <th colspan="7" style="padding:7px 10px;font-size:10px;font-weight:800;text-align:left;letter-spacing:0.5px;${catIdx > 0 ? "border-top:12px solid #fff;" : ""}">
                      CATEGORY: ${sc.category.toUpperCase()} &nbsp;·&nbsp; ${sc.percentage}% OF TOTAL SALES
                    </th>
                  </tr>
                  <tr style="background:#dcfce7;color:#14532d;font-size:9px;font-weight:700;text-transform:uppercase">
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:left">Dish / Menu Product Item</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:right">Qty Sold</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:right">Amount</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:right;color:#7e22ce">Freed Quantity</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:right;color:#7e22ce">Freed Amount</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:right;color:#b45309">Discount</th>
                    <th style="padding:5px 10px;border:1px solid #bbf7d0;text-align:center">Share of Cat</th>
                  </tr>
                  ${itemRows}
                  <!-- Category Subtotal -->
                  <tr style="background:#f0fdf4;font-weight:800;border-top:2px solid #16a34a">
                    <td style="padding:6px 10px;border:1px solid #dcfce7;color:#14532d">SUBTOTAL — ${sc.category}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:right;color:#14532d">${sc.total_qty > 0 ? fmtQty(sc.total_qty, "ITEMS") : "-"}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:right;color:#15803d;font-size:11px">${fmt(sc.total_sales)}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:right;color:#7e22ce;font-weight:800">${(sc.subtotal_freed_qty || 0) > 0 ? fmtQty(sc.subtotal_freed_qty || 0, "ITEMS") : "-"}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:right;color:#7e22ce;font-weight:800">${(sc.subtotal_freed_amount || 0) > 0 ? fmt(sc.subtotal_freed_amount || 0) : "-"}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:right;color:#b45309">${(sc.subtotal_discount || 0) > 0 ? `-${fmt(sc.subtotal_discount || 0)}` : "-"}</td>
                    <td style="padding:6px 10px;border:1px solid #dcfce7;text-align:center;color:#15803d">${sc.percentage}%</td>
                  </tr>`;
              }).join("")}
              <!-- Grand Total Row -->
              <tr style="background:#166534;color:#fff;font-weight:900;font-size:11px">
                <td style="padding:9px 12px;border:1px solid #166534">GRAND TOTAL SALES REVENUE</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:right;color:#bbf7d0">${fmtQty(salesCategories.reduce((sum, sc) => sum + sc.total_qty, 0), "ITEMS")}</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:right;color:#bbf7d0;font-size:12.5px">${fmt(total_sales_revenue)}</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:right;color:#e9d5ff">${totalFreedQty > 0 ? fmtQty(totalFreedQty, "ITEMS") : "-"}</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:right;color:#e9d5ff">${totalFreedAmount > 0 ? fmt(totalFreedAmount) : "-"}</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:right;color:#fde68a">${totalDiscount > 0 ? `-${fmt(totalDiscount)}` : "-"}</td>
                <td style="padding:9px 12px;border:1px solid #166534;text-align:center;font-size:10px">100%</td>
              </tr>
            </tbody>
          </table>
        </div>` : "";

        // Categorized Kitchen Stock Used & Restock Cost HTML
        const categorizedStockHTML = categorizedKitchenStock.length > 0 ? `
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#b45309;border-bottom:2px solid #d97706;padding:6px 0;margin:18px 0 8px;display:flex;justify-content:space-between">
            <span>📦 2. Kitchen Stock Used per Item & Required Restock Amount</span>
            <span style="font-size:10px;color:#6b7280;text-transform:none">Restock = Qty Cooked × Buying Price</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10.5px">
            <tbody>
              ${categorizedKitchenStock.map((cat, catIdx) => {
                  const itemRows = (cat.items || []).map((it: any) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600">${it.item_name}</td>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtQty(it.used_quantity, it.unit)}</td>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;color:#6b7280">${fmt(it.unit_cost)} / ${it.unit}</td>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:800;color:#b45309">${fmt(it.restock_cost)}</td>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtQty(it.current_quantity, it.unit)}</td>
                    <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">
                      ${it.is_low_stock
                          ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:800">LOW STOCK</span>`
                          : `<span style="background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:700">OK</span>`
                      }
                    </td>
                  </tr>`).join("");

                  return `
                  <!-- Category Header Banner -->
                  <tr style="background:#92400e;color:#fff">
                    <th colspan="6" style="padding:7px 10px;font-size:10px;font-weight:800;text-align:left;letter-spacing:0.5px;${catIdx > 0 ? "border-top:12px solid #fff;" : ""}">
                      CATEGORY: ${cat.category_name.toUpperCase()}
                    </th>
                  </tr>
                  <tr style="background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;text-transform:uppercase">
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:left">Ingredient / Stock Item</th>
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:right">Qty Cooked</th>
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:right">Buying Cost</th>
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:right">Restock Required</th>
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:right">Store Balance</th>
                    <th style="padding:5px 10px;border:1px solid #fde68a;text-align:center">Health</th>
                  </tr>
                  ${itemRows}
                  <!-- Category Subtotal -->
                  <tr style="background:#fffbeb;font-weight:800;border-top:2px solid #f59e0b">
                    <td style="padding:6px 10px;border:1px solid #fde68a;color:#92400e">SUBTOTAL — ${cat.category_name}</td>
                    <td style="padding:6px 10px;border:1px solid #fde68a;text-align:right;color:#92400e">${fmtQty(cat.subtotal_qty)}</td>
                    <td style="padding:6px 10px;border:1px solid #fde68a;text-align:right;color:#a1a1aa">—</td>
                    <td style="padding:6px 10px;border:1px solid #fde68a;text-align:right;color:#b45309;font-size:11px">${fmt(cat.subtotal_restock_cost)}</td>
                    <td colspan="2" style="padding:6px 10px;border:1px solid #fde68a"></td>
                  </tr>`;
              }).join("")}
              <!-- Grand Total Restock Row -->
              <tr style="background:#78350f;color:#fff;font-weight:900;font-size:11.5px">
                <td colspan="3" style="padding:10px 12px;border:1px solid #78350f">TOTAL RESTOCK CAPITAL NEEDED (FOR ITEMS COOKED/USED)</td>
                <td style="padding:10px 12px;border:1px solid #78350f;text-align:right;color:#fef08a;font-size:13px">${fmt(totalRestockCostUsed)}</td>
                <td colspan="2" style="padding:10px 12px;border:1px solid #78350f;text-align:right;font-size:9.5px;color:rgba(255,255,255,0.8)">To fully replenish ingredients</td>
              </tr>
            </tbody>
          </table>
        </div>` : "";

        // Low stock store alert HTML
        const lowStockHTML = lowStockItems.length > 0 ? `
        <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:8px;padding:12px 16px;margin:18px 0">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#be123c;margin-bottom:8px;display:flex;justify-content:space-between">
            <span>⚠️ 3. Store Low-Stock Alert (Items Below Minimum Threshold)</span>
            <span>Total Threshold Deficit: ${fmt(storeShortfallBudget)}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead>
              <tr style="background:#ffe4e6;color:#9f1239;font-weight:700">
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:left">Item</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:left">Category</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:right">Current Store Stock</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:right">Min Threshold</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:right">Deficit to Restock</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:right">Unit Cost</th>
                <th style="padding:6px 8px;border:1px solid #fecdd3;text-align:right">Reorder Budget</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map((s) => {
                  const shortfall = Math.max(0, s.min_threshold - s.current_quantity);
                  const cost = shortfall * (s.unit_cost || 0);
                  return `
                  <tr style="background:#fff">
                    <td style="padding:5px 8px;border:1px solid #fecdd3;font-weight:700">${s.item_name}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3">${s.category}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3;text-align:right;color:#be123c;font-weight:700">${fmtQty(s.current_quantity, s.unit)}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3;text-align:right">${fmtQty(s.min_threshold, s.unit)}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3;text-align:right;font-weight:700;color:#b91c1c">${fmtQty(shortfall, s.unit)}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3;text-align:right">${fmt(s.unit_cost || 0)}</td>
                    <td style="padding:5px 8px;border:1px solid #fecdd3;text-align:right;font-weight:800;color:#be123c">${fmt(cost)}</td>
                  </tr>`;
              }).join("")}
              <tr style="background:#ffe4e6;font-weight:800">
                <td colspan="6" style="padding:6px 8px;border:1px solid #fecdd3;color:#9f1239">TOTAL STORE DEFICIT REORDER BUDGET</td>
                <td style="padding:6px 8px;border:1px solid #fecdd3;text-align:right;color:#be123c;font-size:11.5px">${fmt(storeShortfallBudget)}</td>
              </tr>
            </tbody>
          </table>
        </div>` : `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin:14px 0;color:#15803d;font-weight:700;font-size:10.5px">
          ✅ All store items are above minimum safety thresholds. No emergency store reorder required.
        </div>`;

        // Daily P&L Table HTML
        const trendHTML = (filteredTrend || []).length > 0 ? `
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1e3a8a;border-bottom:2px solid #2563eb;padding:6px 0;margin:18px 0 8px;display:flex;justify-content:space-between">
            <span>📈 4. Daily Profit & Loss Trend</span>
            <span style="font-size:10px;color:#6b7280;text-transform:none">POS Revenue vs Kitchen Stock Expenses</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead>
              <tr style="background:#eff6ff;color:#1e40af;font-weight:700">
                <th style="padding:6px 8px;border:1px solid #dbeafe;text-align:left">Date</th>
                <th style="padding:6px 8px;border:1px solid #dbeafe;text-align:right">Sales Revenue</th>
                <th style="padding:6px 8px;border:1px solid #dbeafe;text-align:right">Stock Expenses</th>
                <th style="padding:6px 8px;border:1px solid #dbeafe;text-align:right">Net Margin</th>
                <th style="padding:6px 8px;border:1px solid #dbeafe;text-align:center">Performance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTrend.map((d, i) => `
              <tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
                <td style="padding:5px 8px;border:1px solid #e5e7eb;font-weight:600">${d.label}</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#15803d;font-weight:700">${fmt(d.sales)}</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#b45309;font-weight:700">${fmt(d.expenses)}</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:800;color:${d.net >= 0 ? "#15803d" : "#be123c"}">${fmt(d.net)}</td>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:center">
                  <span style="background:${d.net >= 0 ? "#dcfce7" : "#fee2e2"};color:${d.net >= 0 ? "#15803d" : "#b91c1c"};padding:1.5px 6px;border-radius:10px;font-size:9px;font-weight:700">
                    ${d.net >= 0 ? "PROFITABLE" : "LOSS"}
                  </span>
                </td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>` : "";

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${shopTitle} - Kitchen Stock & Expenses Executive Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: linear-gradient(135deg, #78350f, #b45309, #d97706); color: #fff; padding: 24px 30px 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .kpi-strip { display: flex; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
  .kpi-box { flex: 1; padding: 12px 14px; border-right: 1px solid #e2e8f0; }
  .kpi-box:last-child { border-right: none; }
  .kpi-lbl { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 3px; }
  .kpi-sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }
  .body-content { padding: 18px 26px; }
  .footer-bar { border-top: 2px solid #e2e8f0; padding: 12px 26px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; font-size: 9.5px; color: #64748b; margin-top: 24px; }
  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <!-- Header Banner -->
  <div class="header">
    <div>
      <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px">🍽️ ${shopTitle.toUpperCase()}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;margin-top:3px">${shopAddress}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:800;letter-spacing:0.5px">EXECUTIVE STOCK & EXPENSES REPORT</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:3px">Generated: ${now}</div>
      <div style="display:inline-block;margin-top:6px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.35);font-size:9.5px;font-weight:700;padding:2px 10px;border-radius:12px;text-transform:uppercase">
        Range: ${rangeLabel}
      </div>
    </div>
  </div>

  <!-- KPI Overview Strip -->
  <div class="kpi-strip">
    <div class="kpi-box">
      <div class="kpi-lbl">Restaurant Sales</div>
      <div class="kpi-val" style="color:#15803d">${fmt(total_sales_revenue)}</div>
      <div class="kpi-sub">${sales_transactions_count} settled orders</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-lbl">Kitchen Stock Used</div>
      <div class="kpi-val" style="color:#b45309">${fmt(total_stock_consumed)}</div>
      <div class="kpi-sub">Active in kitchen: ${fmt(in_kitchen_active_cost)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-lbl">Restock Cost (Used)</div>
      <div class="kpi-val" style="color:#d97706">${fmt(totalRestockCostUsed)}</div>
      <div class="kpi-sub">To replace cooked items</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-lbl">Net Kitchen Margin</div>
      <div class="kpi-val" style="color:${gross_kitchen_margin >= 0 ? "#15803d" : "#be123c"}">${fmt(gross_kitchen_margin)}</div>
      <div class="kpi-sub">Sales − Consumed Stock</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-lbl">Food Cost Ratio</div>
      <div class="kpi-val">${food_cost_ratio}%</div>
      <div class="kpi-sub">${isHealthyFoodCost ? "Optimal (<35%)" : isModerateFoodCost ? "Moderate (35-45%)" : "High Alert (>45%)"}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-lbl">Store Deficit Budget</div>
      <div class="kpi-val" style="color:#be123c">${fmt(storeShortfallBudget)}</div>
      <div class="kpi-sub">${lowStockItems.length} low-stock items</div>
    </div>
  </div>

  <!-- Main Report Content -->
  <div class="body-content">
    ${salesCatHTML}
    ${categorizedStockHTML}
    ${lowStockHTML}
    ${trendHTML}
  </div>

  <!-- Audit Footer -->
  <div class="footer-bar">
    <div><strong>Report ID:</strong> KSE-${Date.now()} &nbsp;|&nbsp; <strong>Shop:</strong> ${shopTitle}</div>
    <div style="font-weight:700">Internal Operational Audit — Confidential</div>
    <div>${now}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  <\/script>
</body>
</html>`;

        const win = window.open("", "_blank", "width=1000,height=750");
        if (!win) {
            alert("Please allow popups to open the printable PDF report.");
            return;
        }
        win.document.write(html);
        win.document.close();
        win.focus();
    };

    if (isLoading && !analytics) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-zinc-100 rounded-xl border border-zinc-200" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-zinc-100 rounded-xl border border-zinc-200" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 h-72 bg-zinc-100 rounded-xl border border-zinc-200" />
                    <div className="h-72 bg-zinc-100 rounded-xl border border-zinc-200" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Filter Card - Arranged Horizontally */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900">P&L & Analytics Filters</h3>
                        {activeFilterCount > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {activeFilterCount} active
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            id="executive-pdf-export-btn"
                            type="button"
                            onClick={generatePDF}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs"
                            title="Print / Save Executive PDF Report"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                showFilters || activeFilterCount > 0
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200"
                                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                            }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                            {activeFilterCount > 0 && (
                                <span className="bg-white text-amber-700 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 via-amber-50/20 to-slate-50 border-t border-zinc-100">
                        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3">
                            {/* From Date */}
                            <div className="w-[calc(50%-5px)] sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">From Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        onStartDateChange(e.target.value);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                />
                            </div>

                            {/* To Date */}
                            <div className="w-[calc(50%-5px)] sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        onEndDateChange(e.target.value);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                />
                            </div>

                            {/* Quick Preset Dropdown */}
                            <div className="w-full sm:w-auto sm:min-w-[130px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Quick Range</label>
                                <select
                                    value={startDate || endDate ? "custom" : period}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== "custom") {
                                            onStartDateChange("");
                                            onEndDateChange("");
                                            onPeriodChange(val);
                                            setTrendPage(1);
                                        }
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="this_month">This Month</option>
                                    {startDate || endDate ? <option value="custom">Custom Range</option> : null}
                                </select>
                            </div>

                            {/* Margin Filter */}
                            <div className="w-full sm:w-auto sm:min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Margin Status</label>
                                <select
                                    value={trendFilter}
                                    onChange={(e) => {
                                        setTrendFilter(e.target.value as any);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="all">All Days</option>
                                    <option value="profit">Net Profit (Sales &gt; Stock)</option>
                                    <option value="loss">Net Loss (Stock &gt; Sales)</option>
                                </select>
                            </div>

                            {/* Sort Trend */}
                            <div className="w-full sm:w-auto sm:min-w-[140px] flex-1 sm:flex-initial">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Sort Trend By</label>
                                <select
                                    value={trendSort}
                                    onChange={(e) => {
                                        setTrendSort(e.target.value as any);
                                        setTrendPage(1);
                                    }}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-zinc-700 shadow-xs"
                                >
                                    <option value="date_desc">Date (Newest First)</option>
                                    <option value="date_asc">Date (Oldest First)</option>
                                    <option value="sales_high">Sales (Highest First)</option>
                                    <option value="expense_high">Stock (Highest First)</option>
                                </select>
                            </div>

                            {/* Reset Button */}
                            {(startDate || endDate || period !== "today" || trendFilter !== "all" || trendSort !== "date_desc") && (
                                <div className="w-full sm:w-auto pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onStartDateChange("");
                                            onEndDateChange("");
                                            onPeriodChange("today");
                                            setTrendFilter("all");
                                            setTrendSort("date_desc");
                                            setTrendPage(1);
                                            setCatPage(1);
                                            setItemPage(1);
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
                                    >
                                        <X className="w-3.5 h-3.5" /> Reset Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Executive Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Sales Revenue */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Restaurant Sales</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 break-words">{formatCurrency(total_sales_revenue)}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            <span>{sales_transactions_count} settled orders</span>
                        </div>
                    </div>
                </div>

                {/* Stock Expenses Consumed */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Kitchen Stock Used</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-zinc-900 break-words">{formatCurrency(total_stock_consumed)}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                            <span>Active in pots: {formatCurrency(in_kitchen_active_cost)}</span>
                        </div>
                    </div>
                </div>

                {/* Restock Cost (Cooked Items) */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-800 mb-2">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">Restock Needed</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <RotateCcw className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-extrabold text-amber-900 break-words">
                            {formatCurrency(analytics?.total_restock_cost_used ?? total_stock_consumed)}
                        </div>
                        <div className="text-xs text-amber-700/80 mt-1 flex items-center gap-1 font-medium">
                            <span>Qty Used × Buying Price</span>
                        </div>
                    </div>
                </div>

                {/* Net Kitchen Margin */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Net Kitchen Margin</span>
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${gross_kitchen_margin >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                }`}
                        >
                            {gross_kitchen_margin >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                    <div>
                        <div
                            className={`text-xl sm:text-2xl font-bold break-words ${gross_kitchen_margin >= 0 ? "text-emerald-700" : "text-rose-600"
                                }`}
                        >
                            {formatCurrency(gross_kitchen_margin)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">Sales − Stock Expenses</div>
                    </div>
                </div>

                {/* Food Cost Ratio % */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Food Cost Ratio</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xl sm:text-2xl font-bold text-zinc-900">{food_cost_ratio}%</span>
                            <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isHealthyFoodCost
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isModerateFoodCost
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                    }`}
                            >
                                {isHealthyFoodCost ? "Optimal (<35%)" : isModerateFoodCost ? "Moderate" : "High Alert"}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">% spent on ingredients</div>
                    </div>
                </div>
            </div>

            {/* Daily Comparison Trend & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Sales vs Stock Expenses Daily Trend */}
                <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-zinc-900">Sales vs. Stock Expense Trend</h3>
                                <p className="text-xs text-zinc-500">Day-by-day comparison of POS revenue vs kitchen stock consumed</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs self-start sm:self-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                                    <span className="text-zinc-600 font-medium">Sales</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                                    <span className="text-zinc-600 font-medium">Stock</span>
                                </div>
                            </div>
                        </div>

                        {pagedTrend && pagedTrend.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                {pagedTrend.map((day) => {
                                    const maxVal = Math.max(
                                        ...filteredTrend.map((t) => Math.max(t.sales, t.expenses, 1))
                                    );
                                    const salesWidth = Math.min(100, Math.round((day.sales / maxVal) * 100));
                                    const expensesWidth = Math.min(100, Math.round((day.expenses / maxVal) * 100));

                                    return (
                                        <div key={day.date} className="text-xs border-b border-zinc-100 pb-2.5 last:border-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between font-medium text-zinc-700 gap-1 mb-1.5">
                                                <span className="font-semibold">{day.label}</span>
                                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                    <span className="text-emerald-700 font-semibold">{formatCurrency(day.sales)}</span>
                                                    <span className="text-zinc-300">/</span>
                                                    <span className="text-amber-700 font-semibold">{formatCurrency(day.expenses)}</span>
                                                    <span
                                                        className={`font-bold sm:min-w-16 sm:text-right ${day.net >= 0 ? "text-emerald-600" : "text-rose-600"
                                                            }`}
                                                    >
                                                        Net: {formatCurrency(day.net)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Visual Dual Bars */}
                                            <div className="space-y-1">
                                                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.max(salesWidth, 2)}%` }}
                                                    />
                                                </div>
                                                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.max(expensesWidth, 2)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-zinc-400 text-sm">
                                No trend data matches the selected filters.
                            </div>
                        )}
                    </div>

                    {/* Trend Pagination Footer - Always Visible */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 w-full">
                        <span className="text-center sm:text-left">
                            Showing {filteredTrend.length === 0 ? 0 : (safeTrendPage - 1) * TREND_PAGE_SIZE + 1}–{Math.min(safeTrendPage * TREND_PAGE_SIZE, filteredTrend.length)} of {filteredTrend.length} days
                        </span>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5">
                            <button
                                type="button"
                                onClick={() => setTrendPage((p) => Math.max(1, p - 1))}
                                disabled={safeTrendPage <= 1}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="px-2 font-bold text-zinc-700 text-center shrink-0">
                                {safeTrendPage} / {totalTrendPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTrendPage((p) => Math.min(totalTrendPages, p + 1))}
                                disabled={safeTrendPage >= totalTrendPages}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Category Expense Breakdown */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-zinc-900">Expense by Category</h3>
                                <p className="text-xs text-zinc-500">Distribution of stock ingredients used</p>
                            </div>
                            <PieChart className="w-5 h-5 text-zinc-400 shrink-0" />
                        </div>

                        {pagedCategories && pagedCategories.length > 0 ? (
                            <div className="space-y-3">
                                {pagedCategories.map((cat, idx) => (
                                    <div key={cat.category} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-zinc-800">{cat.category}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-zinc-600 font-semibold">{formatCurrency(cat.total_cost)}</span>
                                                <span className="text-zinc-400 font-normal">({cat.percentage}%)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${idx % 4 === 0
                                                        ? "bg-amber-500"
                                                        : idx % 4 === 1
                                                            ? "bg-emerald-500"
                                                            : idx % 4 === 2
                                                                ? "bg-blue-500"
                                                                : "bg-purple-500"
                                                    }`}
                                                style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-zinc-400 text-sm">
                                No ingredient categories logged yet.
                            </div>
                        )}
                    </div>

                    {/* Category Pagination Footer - Always Visible */}
                    <div>
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 mb-2">
                            <span>
                                {categories.length === 0 ? 0 : (safeCatPage - 1) * CAT_PAGE_SIZE + 1}–{Math.min(safeCatPage * CAT_PAGE_SIZE, categories.length)} of {categories.length} categories
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                                    disabled={safeCatPage <= 1}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] shadow-xs"
                                >
                                    <ChevronLeft className="w-3 h-3" /> Prev
                                </button>
                                <span className="px-1.5 font-bold text-zinc-700 text-[11px]">
                                    {safeCatPage} / {totalCatPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCatPage((p) => Math.min(totalCatPages, p + 1))}
                                    disabled={safeCatPage >= totalCatPages}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] shadow-xs"
                                >
                                    Next <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Action footer */}
                        <div className="pt-3 border-t border-zinc-100 mt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Store Capital Outlay:</span>
                            <span className="font-bold text-zinc-900">{formatCurrency(total_stock_purchased)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales by Menu Category & Restock Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Sales by Menu Category */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-zinc-900">Sales by Menu Category</h3>
                                <p className="text-xs text-zinc-500">POS orders categorized by food & drink menu sections</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>

                        {analytics?.sales_category_breakdown && analytics.sales_category_breakdown.length > 0 ? (
                            <div className="divide-y divide-zinc-100 max-h-[340px] overflow-y-auto pr-1">
                                {analytics.sales_category_breakdown.map((sc) => {
                                    const isExpanded = !!expandedCategories[sc.category];
                                    const itemsToDisplay = isExpanded ? (sc.items || []) : (sc.items || []).slice(0, 3);
                                    const hasMore = (sc.items || []).length > 3;

                                    return (
                                        <div key={sc.category} className="py-2.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-bold text-zinc-900">{sc.category}</span>
                                                    <div className="text-[11px] text-zinc-500 mt-0.5">
                                                        {sc.items_count} {sc.items_count === 1 ? "item" : "items"} · {sc.total_qty} sold
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-emerald-700">{formatCurrency(sc.total_sales)}</span>
                                                    <span className="block text-[10px] text-zinc-400 font-medium">{sc.percentage}% share</span>
                                                </div>
                                            </div>

                                            {/* Itemized dishes sold in this category (top 3 peek + expand) */}
                                            {sc.items && sc.items.length > 0 && (
                                                <div className="mt-2 pl-2.5 border-l-2 border-emerald-400/80 space-y-1 bg-emerald-50/40 py-1.5 px-2 rounded-r-md">
                                                    {itemsToDisplay.map((it) => (
                                                        <div key={it.name} className="flex items-center justify-between text-[11px] gap-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-1">
                                                                <span className="font-medium text-zinc-700 truncate">
                                                                    {it.name} <span className="text-zinc-400 font-normal">({it.qty} {it.unit})</span>
                                                                </span>
                                                                {(it.freed_qty || 0) > 0 && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                                                        Freed: {it.freed_qty} {it.unit}
                                                                    </span>
                                                                )}
                                                                {(it.discount || 0) > 0 && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                                                        Disc: -{formatCurrency(it.discount || 0)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-zinc-900 shrink-0">{formatCurrency(it.total_price)}</span>
                                                        </div>
                                                    ))}
                                                    {hasMore && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCategory(sc.category)}
                                                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline pt-0.5 block"
                                                        >
                                                            {isExpanded ? "Show less" : `+ ${sc.items.length - 3} more items`}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-zinc-400 text-xs">
                                No sales recorded in this timeframe.
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-zinc-100 mt-3 flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-600">Total Period Sales:</span>
                        <span className="text-emerald-700 font-bold">{formatCurrency(total_sales_revenue)}</span>
                    </div>
                </div>

                {/* Restock Budget & Low Stock Alerts */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-zinc-900">Restock Requirements</h3>
                                <p className="text-xs text-zinc-500">Replenishment cost of consumed ingredients & safety store alerts</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                                <RotateCcw className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-1">
                            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold text-amber-900 block">Ingredients Consumed Restock</span>
                                    <span className="text-[11px] text-amber-700">Cost to replace everything cooked in period</span>
                                </div>
                                <span className="text-sm font-extrabold text-amber-900">
                                    {formatCurrency(analytics?.total_restock_cost_used ?? total_stock_consumed)}
                                </span>
                            </div>

                            {/* Low Stock Items preview */}
                            {(stocks || []).filter((s) => s.min_threshold > 0 && s.current_quantity < s.min_threshold).length > 0 ? (
                                <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <div>
                                            <span className="font-bold text-rose-900 block">
                                                {(stocks || []).filter((s) => s.min_threshold > 0 && s.current_quantity < s.min_threshold).length} Items Low on Store Stock
                                            </span>
                                            <span className="text-[11px] text-rose-700">Below minimum safety threshold</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onNavigateToStore}
                                        className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                                    >
                                        Restock Store
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                                    <span>✅ All ingredients in store are above minimum threshold levels.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 mt-3 flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-600">Store Threshold Deficit Budget:</span>
                        <span className="text-rose-700 font-bold">
                            {formatCurrency(analytics?.store_restock_budget_needed ?? (stocks || []).filter(s => s.min_threshold > 0 && s.current_quantity < s.min_threshold).reduce((sum, s) => sum + Math.max(0, s.min_threshold - s.current_quantity) * (s.unit_cost || 0), 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Consumed Items Card / Table */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900">Highest Consumed Raw Materials & Restock Cost</h3>
                        <p className="text-xs text-zinc-500">Top ingredients used in cooking with calculated replenishment cost (Qty Used × Unit Cost)</p>
                    </div>
                    <button
                        onClick={onNavigateToIssues}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline self-start sm:self-center"
                    >
                        View Daily Kitchen Issues &rarr;
                    </button>
                </div>

                {pagedItems && pagedItems.length > 0 ? (
                    <div>
                        {/* Mobile Card List (< md) */}
                        <div className="block md:hidden divide-y divide-zinc-100">
                            {pagedItems.map((item) => {
                                const pct =
                                    total_stock_consumed > 0
                                        ? Math.round((item.total_cost / total_stock_consumed) * 100)
                                        : 0;
                                const unitCost = item.total_qty > 0 ? item.total_cost / item.total_qty : 0;

                                return (
                                    <div key={item.item_name} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                                <span>{item.item_name}</span>
                                            </div>
                                            <div className="text-zinc-500 mt-0.5">
                                                Used: {item.total_qty} {item.unit} @ {formatCurrency(unitCost)}/{item.unit}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-amber-900">{formatCurrency(item.total_cost)}</div>
                                            <span className="inline-block px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 mt-0.5">
                                                {pct}% share
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold">Ingredient</th>
                                        <th className="py-2.5 px-3 font-semibold">Total Quantity Used</th>
                                        <th className="py-2.5 px-3 font-semibold">Buying Unit Cost</th>
                                        <th className="py-2.5 px-3 font-semibold text-amber-900">Restock Cost (Used)</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Cost Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {pagedItems.map((item) => {
                                        const pct =
                                            total_stock_consumed > 0
                                                ? Math.round((item.total_cost / total_stock_consumed) * 100)
                                                : 0;
                                        const unitCost = item.total_qty > 0 ? item.total_cost / item.total_qty : 0;

                                        return (
                                            <tr key={item.item_name} className="hover:bg-zinc-50/60">
                                                <td className="py-2.5 px-3 font-medium text-zinc-900 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                    {item.item_name}
                                                </td>
                                                <td className="py-2.5 px-3 text-zinc-700">
                                                    {item.total_qty} {item.unit}
                                                </td>
                                                <td className="py-2.5 px-3 text-zinc-500">
                                                    {formatCurrency(unitCost)} / {item.unit}
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-amber-900">
                                                    {formatCurrency(item.total_cost)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 font-semibold text-zinc-700">
                                                        {pct}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Top Items Pagination Footer - Always Visible */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 mt-3 w-full">
                            <span className="text-center sm:text-left">
                                Showing {items.length === 0 ? 0 : (safeItemPage - 1) * ITEM_PAGE_SIZE + 1}–{Math.min(safeItemPage * ITEM_PAGE_SIZE, items.length)} of {items.length} ingredients
                            </span>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                                    disabled={safeItemPage <= 1}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                                </button>
                                <span className="px-2 font-bold text-zinc-700 text-center shrink-0">
                                    {safeItemPage} / {totalItemPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
                                    disabled={safeItemPage >= totalItemPages}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors shadow-xs"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-zinc-400 text-sm">
                        No ingredients consumed during this period.
                    </div>
                )}
            </div>
        </div>
    );
}
