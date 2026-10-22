/**
 * Butcher POS System - Core TypeScript API Contracts & Domain Models
 * Designed for 1-to-1 mapping with Laravel Eloquent models & API resources.
 */

export type UserRole = "superadmin" | "admin" | "cashier" | "waiter";

export interface Company {
  id: number;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_pin?: string;
  status: "active" | "suspended";
  business_type?: "butchery" | "restaurant";
  is_blocked_manually?: boolean;
  subscription_starts_at?: string;
  subscription_ends_at?: string;
  remaining_seconds?: number;
  is_active?: boolean;
  plan?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  pin?: string | null;
  avatar?: string;
  is_active?: boolean;
  must_change_password?: boolean;
  is_platform_admin?: boolean;
  company_id?: number;
  company?: Company;
  created_at?: string;
}

export interface Waiter {
  id: number;
  company_id?: number;
  name: string;
  pin: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SaasCompany extends Company {
  total_users: number;
  cashiers_count: number;
  superadmin?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    is_active: boolean;
  } | null;
  created_at?: string;
}

export interface SaasSummary {
  total: number;
  active: number;
  suspended: number;
  butcheries?: number;
  restaurants?: number;
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  products_count?: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  category_name: string;
  price_per_kg: number; // in KSh
  current_stock: number; // in KG
  min_stock: number; // in KG
  buying_cost_per_kg?: number;
  image?: string;
  is_active: boolean;
  unit: "KG" | "PACK" | "PCS" | "PLATE" | "PORTION" | "BOTTLE" | "CUP" | "BOWL" | "GLASS" | "BOX" | string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string; // unique item id in cart
  product_id: number;
  product_name: string;
  category_id?: number;
  category_name?: string;
  sku?: string;
  unit?: string;
  price_per_kg: number;
  weight: number; // in KG or pack count
  discount: number; // in KSh
  subtotal: number; // calculated safe decimal
  total?: number;
  available_stock: number;
  image?: string;
  notes?: string;
  is_saved?: boolean;
}

export type PaymentMethod = "cash" | "mpesa" | "card" | "credit" | "free";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type SaleStatus = "completed" | "partially_refunded" | "refunded" | "cancelled";

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  unit?: string;
  weight: number; // in KG or pack count
  price_per_kg: number;
  buying_cost_per_kg?: number;
  discount?: number;
  subtotal: number;
  refunded_weight?: number;
  is_refunded?: boolean;
  refundable_weight?: number;
}

export interface Sale {
  id: number;
  sale_number: string; // e.g. SL-001245
  cashier_id: number;
  cashier_name: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer?: Customer | null;
  subtotal: number;
  discount: number;
  total: number;
  refunded_amount?: number;
  payment_method: PaymentMethod;
  order_type?: "counter" | "dine_in" | "takeaway";
  table_number?: string | null;
  bill_number?: string | null;
  waiter_name?: string | null;
  guest_count?: number | null;
  payment_status: PaymentStatus;
  sale_status: SaleStatus;
  amount_received?: number;
  change_given?: number;
  mpesa_reference?: string;
  card_reference?: string;
  notes?: string;
  refund_reason?: string;
  refunded_at?: string;
  refunded_by?: string;
  settled_at?: string;
  settled_by?: string;
  items: SaleItem[];
  created_at: string;
}

export interface HeldOrder {
  id: string;
  reference: string;
  items: CartItem[];
  customer: Customer | null;
  subtotal: number;
  totalDiscount: number;
  total: number;
  totalWeight: number;
  order_type?: "counter" | "dine_in" | "takeaway";
  table_number?: string | null;
  createdAt: string;
  notes?: string;
}

export interface RestaurantBillItem {
  product_id: number;
  product_name: string;
  category_id?: number;
  category_name?: string;
  price_per_kg: number;
  weight: number;
  unit?: string;
  discount?: number;
  notes?: string;
  line_total: number;
}

export interface RestaurantBill {
  id: number;
  table_id: number;
  table_number: string;
  bill_number: string;
  waiter_id?: number | null;
  waiter_name: string;
  waiter_pin?: string | null;
  cashier_id?: number | null;
  cashier_name: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer?: Customer | null;
  guest_count: number;
  status: "open" | "printed" | "settled" | "cancelled";
  items: RestaurantBillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  kitchen_printed_at?: string | null;
  bill_printed_at?: string | null;
  bill_printed_by?: string | null;
  settled_at?: string | null;
  settled_by?: string | null;
  sale_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: number;
  company_id: number;
  name: string;
  table_number: string;
  capacity?: number;
  zone: string;
  is_active: boolean;
  sort_order: number;
  status: "grey" | "red" | "yellow";
  total_active_amount: number;
  active_bills_count: number;
  active_bills: RestaurantBill[];
  is_locked: boolean;
  locked_by_user_id?: number | null;
  locked_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id: number;
  cashier_id: number;
  cashier_name: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  cash_sales: number;
  mpesa_sales: number;
  card_sales: number;
  total_sales: number;
  expected_cash: number; // opening_cash + cash_sales
  counted_cash?: number | null;
  difference?: number | null; // (counted_cash + cash_expenses) - expected_cash
  cash_expenses?: number | null;
  mpesa_expenses?: number | null;
  expected_mpesa?: number | null;
  counted_mpesa?: number | null;
  mpesa_difference?: number | null; // (counted_mpesa + mpesa_expenses) - expected_mpesa
  mpesa_transactions_count?: number | null;
  expense_notes?: string | null;
  status: "open" | "closed";
  notes?: string;
}

export type MovementType = "sale" | "stock_in" | "adjustment" | "wastage" | "refund";

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name: string;
  type: MovementType;
  quantity: number; // +/- in KG
  previous_stock: number;
  new_stock: number;
  buying_cost?: number;
  reason?: string;
  user_name: string;
  notes?: string;
  created_at: string;
}

export type WastageReason = "Spoilage" | "Damage" | "Trimming" | "Expired" | "Other";

export interface WastageRecord {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number; // in KG
  reason: WastageReason;
  estimated_cost: number;
  notes?: string;
  reported_by: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orders_count: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
}

export interface ChartDataPoint {
  label: string; // e.g. "08:00", "Mon", "Jan 12"
  sales: number;
  transactions: number;
}

export interface DashboardSummary {
  today_sales: number;
  today_transactions: number;
  today_profit: number;
  today_pending_credit?: number;
  today_pending_count?: number;
  all_pending_credit?: number;
  all_pending_count?: number;
  current_stock_value: number;
  low_stock_count: number;
  sales_chart: {
    today: ChartDataPoint[];
    week: ChartDataPoint[];
    month: ChartDataPoint[];
  };
  recent_sales: Sale[];
  low_stock_products: Product[];
}

export interface ShopSettings {
  shop_name: string;
  phone: string;
  email: string;
  address: string;
  tax_pin?: string;
  currency: string;
  receipt_header: string;
  receipt_footer: string;
  default_min_stock: number;
  tax_rate_percent: number;
  enable_mpesa_stk: boolean;
  logo_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  summary?: {
    total_revenue: number;
    total_count: number;
    completed_count: number;
    pending_revenue?: number;
    pending_count?: number;
    refunded_count: number;
    refunded_amount: number;
    average_order_value: number;
  };
  filter_options?: {
    cashiers: Array<{ id: number; name: string; role?: string }>;
    tables?: Array<{ table_number: string; name?: string | null; zone?: string | null }>;
  };
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | string;
  status?: string;
  date_from?: string;
  date_to?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  payment_status?: string;
  cashier_id?: number | string;
  table_number?: string;
  min_amount?: number | string;
  max_amount?: number | string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status_code?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT RAW STOCK & KITCHEN TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export interface RestaurantStockItem {
  id: number;
  company_id: number;
  item_name: string;
  category: string;
  current_quantity: number;
  unit: string; // KG, LITRE, BAG, CRATE, PACK, PCS
  unit_cost: number;
  total_cost: number;
  min_threshold: number;
  supplier?: string | null;
  payment_method: string;
  invoice_number?: string | null;
  purchased_at: string;
  notes?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface KitchenIssue {
  id: number;
  company_id: number;
  stock_id: number;
  item_name: string;
  unit: string;
  issued_quantity: number;
  unit_cost: number;
  issued_cost: number;
  remaining_quantity?: number | null;
  used_quantity?: number | null;
  actual_cost_used?: number | null;
  expected_dish?: string | null;
  shift_id?: number | null;
  status: "in_kitchen" | "reconciled";
  issued_at: string;
  reconciled_at?: string | null;
  issued_by_name?: string | null;
  reconciled_by_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  stock?: RestaurantStockItem;
}

export interface StockExpenseAnalytics {
  period: string;
  start_date: string;
  end_date: string;
  total_sales_revenue: number;
  sales_transactions_count: number;
  total_stock_purchased: number;
  total_kitchen_issued: number;
  total_stock_consumed: number;
  in_kitchen_active_cost: number;
  gross_kitchen_margin: number;
  food_cost_ratio: number;
  category_breakdown: Array<{
    category: string;
    total_cost: number;
    percentage: number;
  }>;
  sales_category_breakdown?: Array<{
    category: string;
    total_sales: number;
    total_qty: number;
    subtotal_freed_qty?: number;
    subtotal_freed_amount?: number;
    subtotal_discount?: number;
    items_count: number;
    percentage: number;
    items?: Array<{
      name: string;
      unit: string;
      qty: number;
      total_price: number;
      freed_qty?: number;
      freed_amount?: number;
      discount?: number;
      price_per_unit?: number;
    }>;
  }>;
  categorized_kitchen_stock?: Array<{
    category_name: string;
    subtotal_qty: number;
    subtotal_restock_cost: number;
    items: Array<{
      item_name: string;
      unit: string;
      unit_cost: number;
      used_quantity: number;
      restock_cost: number;
      current_quantity: number;
      min_threshold: number;
      is_low_stock?: boolean;
    }>;
  }>;
  total_restock_cost_used?: number;
  store_restock_budget_needed?: number;
  top_items: Array<{
    item_name: string;
    unit: string;
    total_qty: number;
    total_cost: number;
  }>;
  trend: Array<{
    date: string;
    label: string;
    sales: number;
    expenses: number;
    net: number;
  }>;
  is_offline_preview?: boolean;
}

export interface CreateStockPayload {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  total_cost?: number;
  min_threshold?: number;
  supplier?: string;
  payment_method?: string;
  invoice_number?: string;
  purchased_at?: string;
  notes?: string;
}

export interface IssueToKitchenPayload {
  stock_id: number;
  issued_quantity: number;
  expected_dish?: string;
  notes?: string;
}

export interface ReconcileKitchenIssuePayload {
  remaining_quantity: number;
  return_to_store?: boolean;
  notes?: string;
}


