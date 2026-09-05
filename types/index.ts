/**
 * Butcher POS System - Core TypeScript API Contracts & Domain Models
 * Designed for 1-to-1 mapping with Laravel Eloquent models & API resources.
 */

export type UserRole = "admin" | "cashier";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
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
  unit: "KG";
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string; // unique item id in cart
  product_id: number;
  product_name: string;
  price_per_kg: number;
  weight: number; // in KG
  discount: number; // in KSh
  subtotal: number; // calculated safe decimal
  available_stock: number;
  image?: string;
  notes?: string;
}

export type PaymentMethod = "cash" | "mpesa" | "card";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type SaleStatus = "completed" | "refunded" | "cancelled";

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  weight: number; // in KG
  price_per_kg: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  sale_number: string; // e.g. SL-001245
  cashier_id: number;
  cashier_name: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
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
  items: SaleItem[];
  created_at: string;
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
  difference?: number | null; // counted - expected
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
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | string;
  status?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: string;
  cashier_id?: number | string;
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
