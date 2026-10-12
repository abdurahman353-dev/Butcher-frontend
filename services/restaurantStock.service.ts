import apiClient, { ApiRequestError } from "./api";
import {
    RestaurantStockItem,
    KitchenIssue,
    StockExpenseAnalytics,
    CreateStockPayload,
    IssueToKitchenPayload,
    ReconcileKitchenIssuePayload,
    PaginatedResponse,
} from "@/types";

export interface StockListResponse {
    data: RestaurantStockItem[] | PaginatedResponse<RestaurantStockItem>;
    summary: {
        total_items_count: number;
        total_valuation: number;
        low_stock_count: number;
    };
    is_offline_preview?: boolean;
}

export interface KitchenIssuesResponse {
    data: KitchenIssue[] | PaginatedResponse<KitchenIssue>;
    summary: {
        in_kitchen_count: number;
        in_kitchen_cost: number;
        reconciled_count: number;
        total_cost_used: number;
    };
    is_offline_preview?: boolean;
}

// ─── Local Storage Keys & Default Seed Data (Offline/Fallback Mode) ───────────
const STORAGE_KEY_STOCKS = "prime_cut_restaurant_stocks_local";
const STORAGE_KEY_ISSUES = "prime_cut_restaurant_issues_local";

const DEFAULT_STOCKS: RestaurantStockItem[] = [
    {
        id: 101,
        company_id: 1,
        item_name: "Wheat Flour (Baking)",
        category: "Flour & Grains",
        current_quantity: 45,
        unit: "KG",
        unit_cost: 180,
        total_cost: 45 * 180,
        min_threshold: 10,
        supplier: "Unga Limited",
        payment_method: "cash",
        invoice_number: "INV-1092",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 102,
        company_id: 1,
        item_name: "Pishori Rice",
        category: "Flour & Grains",
        current_quantity: 60,
        unit: "KG",
        unit_cost: 240,
        total_cost: 60 * 240,
        min_threshold: 15,
        supplier: "Mwea Millers",
        payment_method: "mpesa",
        invoice_number: "INV-1093",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 103,
        company_id: 1,
        item_name: "Cooking Oil (Vegetable)",
        category: "Cooking Oil & Fats",
        current_quantity: 35,
        unit: "LITRE",
        unit_cost: 280,
        total_cost: 35 * 280,
        min_threshold: 10,
        supplier: "Salit Distributors",
        payment_method: "cash",
        invoice_number: "INV-1094",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 104,
        company_id: 1,
        item_name: "Irish Potatoes (Warua)",
        category: "Vegetables & Produce",
        current_quantity: 80,
        unit: "KG",
        unit_cost: 90,
        total_cost: 80 * 90,
        min_threshold: 20,
        supplier: "Wakulima Market",
        payment_method: "cash",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 105,
        company_id: 1,
        item_name: "Red Onions",
        category: "Vegetables & Produce",
        current_quantity: 25,
        unit: "KG",
        unit_cost: 110,
        total_cost: 25 * 110,
        min_threshold: 10,
        supplier: "City Market",
        payment_method: "cash",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 106,
        company_id: 1,
        item_name: "Kitchen Cuts Beef",
        category: "Meat & Poultry",
        current_quantity: 20,
        unit: "KG",
        unit_cost: 650,
        total_cost: 20 * 650,
        min_threshold: 10,
        supplier: "Internal Butchery Stock",
        payment_method: "credit",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 107,
        company_id: 1,
        item_name: "Fresh Milk",
        category: "Dairy & Eggs",
        current_quantity: 18,
        unit: "LITRE",
        unit_cost: 70,
        total_cost: 18 * 70,
        min_threshold: 5,
        supplier: "Brookside",
        payment_method: "mpesa",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 108,
        company_id: 1,
        item_name: "White Sugar",
        category: "Spices & Seasoning",
        current_quantity: 15,
        unit: "KG",
        unit_cost: 150,
        total_cost: 15 * 150,
        min_threshold: 5,
        supplier: "Mumias",
        payment_method: "cash",
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const DEFAULT_ISSUES: KitchenIssue[] = [
    {
        id: 201,
        company_id: 1,
        stock_id: 101,
        item_name: "Wheat Flour (Baking)",
        unit: "KG",
        unit_cost: 180,
        issued_quantity: 10,
        issued_cost: 1800,
        remaining_quantity: 0.5,
        used_quantity: 9.5,
        actual_cost_used: 1710,
        expected_dish: "Breakfast Chapatis & Mandazi",
        status: "reconciled",
        issued_by_name: "Chef / Kitchen Lead",
        reconciled_by_name: "Manager",
        issued_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        reconciled_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        notes: "50 chapatis made for morning breakfast",
        created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        stock: DEFAULT_STOCKS[0],
    },
    {
        id: 202,
        company_id: 1,
        stock_id: 102,
        item_name: "Pishori Rice",
        unit: "KG",
        unit_cost: 240,
        issued_quantity: 12,
        issued_cost: 2880,
        remaining_quantity: 0,
        used_quantity: 12,
        actual_cost_used: 2880,
        expected_dish: "Lunch Pilau / Biryani",
        status: "reconciled",
        issued_by_name: "Chef / Kitchen Lead",
        reconciled_by_name: "Manager",
        issued_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        reconciled_at: new Date(Date.now() - 1 * 3600000).toISOString(),
        notes: "Full batch cooked and sold",
        created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
        stock: DEFAULT_STOCKS[1],
    },
    {
        id: 203,
        company_id: 1,
        stock_id: 103,
        item_name: "Cooking Oil (Vegetable)",
        unit: "LITRE",
        unit_cost: 280,
        issued_quantity: 5,
        issued_cost: 1400,
        remaining_quantity: null,
        used_quantity: null,
        actual_cost_used: null,
        expected_dish: "Kitchen Cooking Oil",
        status: "in_kitchen",
        issued_by_name: "Chef / Kitchen Lead",
        issued_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        notes: "Currently in kitchen fryers and stew pots",
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        stock: DEFAULT_STOCKS[2],
    },
];

function getStoredStocks(): RestaurantStockItem[] {
    if (typeof window === "undefined") return DEFAULT_STOCKS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_STOCKS);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_STOCKS, JSON.stringify(DEFAULT_STOCKS));
            return DEFAULT_STOCKS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_STOCKS;
    }
}

function saveStoredStocks(items: RestaurantStockItem[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY_STOCKS, JSON.stringify(items));
    } catch { }
}

function getStoredIssues(): KitchenIssue[] {
    if (typeof window === "undefined") return DEFAULT_ISSUES;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ISSUES);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_ISSUES, JSON.stringify(DEFAULT_ISSUES));
            return DEFAULT_ISSUES;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_ISSUES;
    }
}

function saveStoredIssues(items: KitchenIssue[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY_ISSUES, JSON.stringify(items));
    } catch { }
}

function computeLocalAnalytics(): StockExpenseAnalytics {
    const stocks = getStoredStocks();
    const issues = getStoredIssues();

    // Mock revenue baseline for restaurant comparison
    const mockRevenue = 28500;
    const mockOrdersCount = 42;

    const totalConsumed = issues
        .filter((i) => i.status === "reconciled")
        .reduce((acc, i) => acc + (i.actual_cost_used || 0), 0);

    const activeInPots = issues
        .filter((i) => i.status === "in_kitchen")
        .reduce((acc, i) => acc + i.issued_cost, 0);

    const totalPurchased = stocks.reduce((acc, s) => acc + s.current_quantity * s.unit_cost, 0);
    const totalIssued = issues.reduce((acc, i) => acc + i.issued_cost, 0);
    const grossMargin = mockRevenue - totalConsumed;
    const foodCostRatio = mockRevenue > 0 ? parseFloat(((totalConsumed / mockRevenue) * 100).toFixed(1)) : 0;

    // Category breakdown
    const catMap: Record<string, number> = {};
    issues
        .filter((i) => i.status === "reconciled" && i.actual_cost_used)
        .forEach((i) => {
            const stockItem = stocks.find((s) => s.id === i.stock_id);
            const cat = stockItem?.category || "Kitchen Ingredients";
            catMap[cat] = (catMap[cat] || 0) + (i.actual_cost_used || 0);
        });

    const catBreakdown = Object.entries(catMap).map(([category, cost]) => ({
        category,
        total_cost: cost,
        percentage: totalConsumed > 0 ? parseFloat(((cost / totalConsumed) * 100).toFixed(1)) : 0,
    }));

    // Top items
    const itemMap: Record<string, { total_cost: number; total_qty: number; unit: string }> = {};
    issues
        .filter((i) => i.status === "reconciled" && i.actual_cost_used)
        .forEach((i) => {
            if (!itemMap[i.item_name]) {
                itemMap[i.item_name] = { total_cost: 0, total_qty: 0, unit: i.unit };
            }
            itemMap[i.item_name].total_cost += i.actual_cost_used || 0;
            itemMap[i.item_name].total_qty += i.used_quantity || 0;
        });

    const topItems = Object.entries(itemMap).map(([item_name, data]) => ({
        item_name,
        total_cost: data.total_cost,
        total_qty: data.total_qty,
        unit: data.unit,
    }));

    const trend = [
        { date: "2026-10-09", label: "Fri, Oct 9", sales: 24200, expenses: 6200, net: 18000 },
        { date: "2026-10-10", label: "Sat, Oct 10", sales: 31500, expenses: 8400, net: 23100 },
        { date: "2026-10-11", label: "Sun, Oct 11", sales: 29000, expenses: 7600, net: 21400 },
        { date: "2026-10-12", label: "Today", sales: mockRevenue, expenses: totalConsumed, net: grossMargin },
    ];

    return {
        period: "today",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        total_sales_revenue: mockRevenue,
        sales_transactions_count: mockOrdersCount,
        total_stock_consumed: totalConsumed,
        total_stock_purchased: totalPurchased,
        total_kitchen_issued: totalIssued,
        in_kitchen_active_cost: activeInPots,
        gross_kitchen_margin: grossMargin,
        food_cost_ratio: foodCostRatio,
        category_breakdown: catBreakdown.length > 0 ? catBreakdown : [
            { category: "Flour & Grains", total_cost: 4590, percentage: 68.2 },
            { category: "Meat & Poultry", total_cost: 2140, percentage: 31.8 },
        ],
        top_items: topItems.length > 0 ? topItems : [
            { item_name: "Pishori Rice", total_cost: 2880, total_qty: 12, unit: "KG" },
            { item_name: "Wheat Flour (Baking)", total_cost: 1710, total_qty: 9.5, unit: "KG" },
        ],
        trend,
        is_offline_preview: true,
    };
}

export const restaurantStockService = {
    /**
     * Get store stock list with valuation and alert stats.
     * Gracefully falls back to local data if backend route is not found (404).
     */
    async getStock(params?: {
        search?: string;
        category?: string;
        low_stock?: boolean;
        sort_by?: string;
        sort_dir?: "asc" | "desc";
        per_page?: number | string;
        page?: number;
    }): Promise<StockListResponse> {
        try {
            const res = await apiClient.get<StockListResponse>("/restaurant/stock", { params });
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                // Fallback to local storage
                let list = getStoredStocks();
                if (params?.category && params.category !== "All Categories" && params.category !== "all") {
                    list = list.filter((i) => i.category === params.category);
                }
                if (params?.search) {
                    const q = params.search.toLowerCase();
                    list = list.filter((i) => i.item_name.toLowerCase().includes(q) || i.supplier?.toLowerCase().includes(q));
                }
                if (params?.low_stock) {
                    list = list.filter((i) => i.current_quantity <= i.min_threshold);
                }

                const totalVal = list.reduce((acc, i) => acc + i.current_quantity * i.unit_cost, 0);
                const lowCount = list.filter((i) => i.current_quantity <= i.min_threshold).length;

                return {
                    data: list,
                    summary: {
                        total_items_count: list.length,
                        total_valuation: totalVal,
                        low_stock_count: lowCount,
                    },
                    is_offline_preview: true,
                };
            }
            throw err;
        }
    },

    /**
     * Record new stock purchase / replenishment into store inventory.
     */
    async recordStockPurchase(payload: CreateStockPayload): Promise<{ message: string; data: RestaurantStockItem }> {
        try {
            const res = await apiClient.post<{ message: string; data: RestaurantStockItem }>("/restaurant/stock", payload);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const stocks = getStoredStocks();
                const cost = payload.unit_cost ?? (payload.total_cost && payload.quantity ? payload.total_cost / payload.quantity : 0);
                const newItem: RestaurantStockItem = {
                    id: Date.now(),
                    company_id: 1,
                    item_name: payload.item_name,
                    category: payload.category,
                    current_quantity: payload.quantity,
                    unit: payload.unit,
                    unit_cost: cost,
                    total_cost: cost * payload.quantity,
                    min_threshold: payload.min_threshold ?? 5,
                    supplier: payload.supplier,
                    payment_method: payload.payment_method ?? "cash",
                    invoice_number: payload.invoice_number,
                    purchased_at: payload.purchased_at ?? new Date().toISOString(),
                    notes: payload.notes,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                stocks.unshift(newItem);
                saveStoredStocks(stocks);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("butcher:data-change"));
                }
                return {
                    message: "Stock item recorded successfully (Saved locally).",
                    data: newItem,
                };
            }
            throw err;
        }
    },

    /**
     * Update existing stock item.
     */
    async updateStock(
        id: number,
        payload: Partial<CreateStockPayload> & { current_quantity?: number }
    ): Promise<{ message: string; data: RestaurantStockItem }> {
        try {
            const res = await apiClient.put<{ message: string; data: RestaurantStockItem }>(`/restaurant/stock/${id}`, payload);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const stocks = getStoredStocks();
                const index = stocks.findIndex((s) => s.id === id);
                if (index !== -1) {
                    const updatedCost = payload.unit_cost ?? stocks[index].unit_cost;
                    const updatedQty = payload.current_quantity ?? stocks[index].current_quantity;
                    stocks[index] = {
                        ...stocks[index],
                        ...payload,
                        unit_cost: updatedCost,
                        current_quantity: updatedQty,
                        total_cost: updatedCost * updatedQty,
                        updated_at: new Date().toISOString(),
                    };
                    saveStoredStocks(stocks);
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("butcher:data-change"));
                    }
                    return { message: "Stock item updated successfully (Local).", data: stocks[index] };
                }
            }
            throw err;
        }
    },

    /**
     * Delete stock item from store.
     */
    async deleteStock(id: number): Promise<{ message: string }> {
        try {
            const res = await apiClient.delete<{ message: string }>(`/restaurant/stock/${id}`);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const stocks = getStoredStocks().filter((s) => s.id !== id);
                saveStoredStocks(stocks);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("butcher:data-change"));
                }
                return { message: "Stock item removed from store (Local)." };
            }
            throw err;
        }
    },

    /**
     * List daily kitchen issues (active and reconciled).
     */
    async getKitchenIssues(params?: {
        period?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
        search?: string;
        page?: number;
        per_page?: number | string;
    }): Promise<KitchenIssuesResponse> {
        try {
            const res = await apiClient.get<KitchenIssuesResponse>("/restaurant/kitchen-issues", { params });
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                let issues = getStoredIssues();
                if (params?.status && params.status !== "all") {
                    issues = issues.filter((i) => i.status === params.status);
                }
                if (params?.search) {
                    const q = params.search.toLowerCase();
                    issues = issues.filter(
                        (i) => i.item_name.toLowerCase().includes(q) || i.expected_dish?.toLowerCase().includes(q)
                    );
                }

                const inKitchen = issues.filter((i) => i.status === "in_kitchen");
                const reconciled = issues.filter((i) => i.status === "reconciled");

                return {
                    data: issues,
                    summary: {
                        in_kitchen_count: inKitchen.length,
                        in_kitchen_cost: inKitchen.reduce((acc, i) => acc + i.issued_cost, 0),
                        reconciled_count: reconciled.length,
                        total_cost_used: reconciled.reduce((acc, i) => acc + (i.actual_cost_used || 0), 0),
                    },
                    is_offline_preview: true,
                };
            }
            throw err;
        }
    },

    /**
     * Issue raw ingredients from store to kitchen.
     */
    async issueToKitchen(
        payload: IssueToKitchenPayload
    ): Promise<{ message: string; data: KitchenIssue; store_balance: number }> {
        try {
            const res = await apiClient.post<{ message: string; data: KitchenIssue; store_balance: number }>(
                "/restaurant/kitchen-issues",
                payload
            );
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const stocks = getStoredStocks();
                const stock = stocks.find((s) => s.id === payload.stock_id);
                if (!stock) throw new Error("Ingredient not found in store.");

                if (payload.issued_quantity > stock.current_quantity) {
                    throw new Error(`Insufficient store balance. Only ${stock.current_quantity} ${stock.unit} available.`);
                }

                stock.current_quantity -= payload.issued_quantity;
                saveStoredStocks(stocks);

                const issues = getStoredIssues();
                const newIssue: KitchenIssue = {
                    id: Date.now(),
                    company_id: 1,
                    stock_id: stock.id,
                    item_name: stock.item_name,
                    unit: stock.unit,
                    unit_cost: stock.unit_cost,
                    issued_quantity: payload.issued_quantity,
                    issued_cost: payload.issued_quantity * stock.unit_cost,
                    remaining_quantity: null,
                    used_quantity: null,
                    actual_cost_used: null,
                    expected_dish: payload.expected_dish,
                    status: "in_kitchen",
                    issued_by_name: "Staff",
                    issued_at: new Date().toISOString(),
                    notes: payload.notes,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    stock: stock,
                };
                issues.unshift(newIssue);
                saveStoredIssues(issues);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("butcher:data-change"));
                }

                return {
                    message: `Issued ${payload.issued_quantity} ${stock.unit} of ${stock.item_name} to kitchen (Local).`,
                    data: newIssue,
                    store_balance: stock.current_quantity,
                };
            }
            throw err;
        }
    },

    /**
     * Reconcile closing count for an in-kitchen issue batch.
     */
    async reconcileKitchenIssue(
        issueId: number,
        payload: ReconcileKitchenIssuePayload
    ): Promise<{ message: string; data: KitchenIssue }> {
        try {
            const res = await apiClient.post<{ message: string; data: KitchenIssue }>(
                `/restaurant/kitchen-issues/${issueId}/reconcile`,
                payload
            );
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const issues = getStoredIssues();
                const issue = issues.find((i) => i.id === issueId);
                if (!issue) throw new Error("Issue batch not found.");

                const remaining = payload.remaining_quantity;
                const used = Math.max(0, issue.issued_quantity - remaining);
                const actualCost = used * issue.unit_cost;

                issue.remaining_quantity = remaining;
                issue.used_quantity = used;
                issue.actual_cost_used = actualCost;
                issue.status = "reconciled";
                issue.reconciled_at = new Date().toISOString();
                issue.reconciled_by_name = "Manager";
                if (payload.notes) {
                    issue.notes = issue.notes ? `${issue.notes} | ${payload.notes}` : payload.notes;
                }

                // Return leftover to store if checked
                if (payload.return_to_store && remaining > 0) {
                    const stocks = getStoredStocks();
                    const stock = stocks.find((s) => s.id === issue.stock_id);
                    if (stock) {
                        stock.current_quantity += remaining;
                        saveStoredStocks(stocks);
                    }
                }

                saveStoredIssues(issues);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("butcher:data-change"));
                }

                return {
                    message: `Reconciled ${issue.item_name}: Net used ${used} ${issue.unit} (Cost: KSh ${actualCost.toFixed(2)})`,
                    data: issue,
                };
            }
            throw err;
        }
    },

    /**
     * Cancel an in-kitchen issue and restore store balance.
     */
    async deleteKitchenIssue(issueId: number): Promise<{ message: string }> {
        try {
            const res = await apiClient.delete<{ message: string }>(`/restaurant/kitchen-issues/${issueId}`);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("butcher:data-change"));
            }
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                const issues = getStoredIssues();
                const issue = issues.find((i) => i.id === issueId);
                if (issue && issue.status === "in_kitchen") {
                    const stocks = getStoredStocks();
                    const stock = stocks.find((s) => s.id === issue.stock_id);
                    if (stock) {
                        stock.current_quantity += issue.issued_quantity;
                        saveStoredStocks(stocks);
                    }
                }
                const filtered = issues.filter((i) => i.id !== issueId);
                saveStoredIssues(filtered);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("butcher:data-change"));
                }

                return { message: "Kitchen issue cancelled and store stock restored (Local)." };
            }
            throw err;
        }
    },

    /**
     * Fetch expense vs sales analytics.
     */
    async getAnalytics(params?: {
        period?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<StockExpenseAnalytics> {
        try {
            const res = await apiClient.get<StockExpenseAnalytics>("/restaurant/stock/analytics", { params });
            return res.data;
        } catch (err: any) {
            if (err?.status_code === 404 || err?.response?.status === 404 || err?.message?.includes("not found")) {
                return computeLocalAnalytics();
            }
            throw err;
        }
    },
};
