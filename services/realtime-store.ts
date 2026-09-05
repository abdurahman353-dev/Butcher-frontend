/**
 * Butcher POS Real-time Local Data Engine & Event Bus
 * 
 * Provides instantaneous real-time persistence, state reactivity, and offline-resilient operations.
 * Emits "butcher:data-change" events whenever products, inventory, shifts, sales, or settings update,
 * allowing every page, table, and widget to re-render in true real-time.
 */

import {
  Product,
  Category,
  Sale,
  Shift,
  InventoryMovement,
  WastageRecord,
  Customer,
  ShopSettings,
  User,
  SaleItem,
} from "@/types";
import { calculateSubtotal, roundTo } from "@/lib/math";

const STORAGE_KEYS = {
  PRODUCTS: "butcher_realtime_products",
  CATEGORIES: "butcher_realtime_categories",
  SALES: "butcher_realtime_sales",
  SHIFTS: "butcher_realtime_shifts",
  MOVEMENTS: "butcher_realtime_movements",
  WASTAGE: "butcher_realtime_wastage",
  CUSTOMERS: "butcher_realtime_customers",
  SETTINGS: "butcher_realtime_settings",
  CURRENT_USER: "butcher_user",
  ACTIVE_SHIFT_ID: "butcher_active_shift_id",
};

// Initial Seed Data: Realistic Kenyan Butcher Shop
const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: "Beef", slug: "beef", icon: "🥩", description: "Fresh prime cuts of beef" },
  { id: 2, name: "Goat", slug: "goat", icon: "🐐", description: "Tender goat meat (Nyama ya Mbuzi)" },
  { id: 3, name: "Chicken", slug: "chicken", icon: "🍗", description: "Farm fresh whole chicken & cuts" },
  { id: 4, name: "Mince & Patties", slug: "mince", icon: "🍔", description: "Freshly ground beef & burgers" },
  { id: 5, name: "Sausages & Deli", slug: "sausage", icon: "🌭", description: "House sausages and boerewors" },
  { id: 6, name: "Offal & Special", slug: "offal", icon: "🍲", description: "Liver, matumbo, kidneys" },
  { id: 7, name: "Pork & Lamb", slug: "pork-lamb", icon: "🍖", description: "Chops, ribs & legs" },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Prime Beef Ribeye",
    sku: "BF-RIB-01",
    category_id: 1,
    category_name: "Beef",
    price_per_kg: 950,
    buying_cost_per_kg: 720,
    current_stock: 42.5,
    min_stock: 10.0,
    unit: "KG",
    is_active: true,
    image: "/images/beef-ribeye.jpg",
  },
  {
    id: 2,
    name: "Bone-in Beef (Nyama ya Ng'ombe)",
    sku: "BF-BON-02",
    category_id: 1,
    category_name: "Beef",
    price_per_kg: 750,
    buying_cost_per_kg: 580,
    current_stock: 85.0,
    min_stock: 15.0,
    unit: "KG",
    is_active: true,
    image: "/images/beef-bone-in.jpg",
  },
  {
    id: 3,
    name: "Prime T-Bone Steak",
    sku: "BF-TBN-03",
    category_id: 1,
    category_name: "Beef",
    price_per_kg: 1100,
    buying_cost_per_kg: 820,
    current_stock: 18.0,
    min_stock: 5.0,
    unit: "KG",
    is_active: true,
    image: "/images/tbone.jpg",
  },
  {
    id: 4,
    name: "Fresh Goat Meat (Nyama ya Mbuzi)",
    sku: "GT-FRE-01",
    category_id: 2,
    category_name: "Goat",
    price_per_kg: 1000,
    buying_cost_per_kg: 800,
    current_stock: 36.0,
    min_stock: 8.0,
    unit: "KG",
    is_active: true,
    image: "/images/goat-meat.jpg",
  },
  {
    id: 5,
    name: "Goat Ribs (Mbavu za Mbuzi)",
    sku: "GT-RIB-02",
    category_id: 2,
    category_name: "Goat",
    price_per_kg: 1150,
    buying_cost_per_kg: 880,
    current_stock: 9.5,
    min_stock: 5.0,
    unit: "KG",
    is_active: true,
    image: "/images/goat-ribs.jpg",
  },
  {
    id: 6,
    name: "Lean Minced Beef",
    sku: "MN-LEN-01",
    category_id: 4,
    category_name: "Mince & Patties",
    price_per_kg: 850,
    buying_cost_per_kg: 650,
    current_stock: 24.0,
    min_stock: 8.0,
    unit: "KG",
    is_active: true,
    image: "/images/beef-mince.jpg",
  },
  {
    id: 7,
    name: "Gourmet Beef Sausages",
    sku: "SG-GRM-01",
    category_id: 5,
    category_name: "Sausages & Deli",
    price_per_kg: 800,
    buying_cost_per_kg: 560,
    current_stock: 14.0,
    min_stock: 6.0,
    unit: "KG",
    is_active: true,
    image: "/images/sausages.jpg",
  },
  {
    id: 8,
    name: "Traditional Boerewors",
    sku: "SG-BOE-02",
    category_id: 5,
    category_name: "Sausages & Deli",
    price_per_kg: 920,
    buying_cost_per_kg: 680,
    current_stock: 4.5, // Low stock on purpose
    min_stock: 8.0,
    unit: "KG",
    is_active: true,
    image: "/images/boerewors.jpg",
  },
  {
    id: 9,
    name: "Fresh Whole Broiler Chicken",
    sku: "CK-WHL-01",
    category_id: 3,
    category_name: "Chicken",
    price_per_kg: 650,
    buying_cost_per_kg: 480,
    current_stock: 55.0,
    min_stock: 12.0,
    unit: "KG",
    is_active: true,
    image: "/images/chicken-whole.jpg",
  },
  {
    id: 10,
    name: "Boneless Chicken Breast",
    sku: "CK-BST-02",
    category_id: 3,
    category_name: "Chicken",
    price_per_kg: 900,
    buying_cost_per_kg: 680,
    current_stock: 28.5,
    min_stock: 10.0,
    unit: "KG",
    is_active: true,
    image: "/images/chicken-breast.jpg",
  },
  {
    id: 11,
    name: "Fresh Beef Liver (Maini)",
    sku: "OF-LIV-01",
    category_id: 6,
    category_name: "Offal & Special",
    price_per_kg: 700,
    buying_cost_per_kg: 500,
    current_stock: 12.0,
    min_stock: 5.0,
    unit: "KG",
    is_active: true,
    image: "/images/beef-liver.jpg",
  },
  {
    id: 12,
    name: "Cleaned Matumbo (Tripe)",
    sku: "OF-TRP-02",
    category_id: 6,
    category_name: "Offal & Special",
    price_per_kg: 450,
    buying_cost_per_kg: 320,
    current_stock: 3.0, // Low stock on purpose
    min_stock: 10.0,
    unit: "KG",
    is_active: true,
    image: "/images/matumbo.jpg",
  },
  {
    id: 13,
    name: "Pork Chops",
    sku: "PK-CHP-01",
    category_id: 7,
    category_name: "Pork & Lamb",
    price_per_kg: 850,
    buying_cost_per_kg: 620,
    current_stock: 22.0,
    min_stock: 8.0,
    unit: "KG",
    is_active: true,
    image: "/images/pork-chops.jpg",
  },
  {
    id: 14,
    name: "Lamb Chops",
    sku: "LM-CHP-01",
    category_id: 7,
    category_name: "Pork & Lamb",
    price_per_kg: 1350,
    buying_cost_per_kg: 1050,
    current_stock: 15.0,
    min_stock: 6.0,
    unit: "KG",
    is_active: true,
    image: "/images/lamb-chops.jpg",
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 1,
    name: "Ahmed Mohamed",
    phone: "0712345678",
    email: "ahmed@example.com",
    address: "Nairobi West",
    orders_count: 28,
    total_spent: 46800,
    last_visit: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: 2,
    name: "Grace Wanjiku",
    phone: "0722987654",
    email: "grace@example.com",
    address: "Kilimani",
    orders_count: 14,
    total_spent: 23450,
    last_visit: new Date(Date.now() - 3600000 * 24).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 3,
    name: "Brian Ochieng",
    phone: "0733112233",
    email: "brian@example.com",
    address: "South C",
    orders_count: 9,
    total_spent: 15800,
    last_visit: new Date(Date.now() - 3600000 * 48).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 4,
    name: "Chef Pierre (Bistro Grill)",
    phone: "0700554433",
    email: "pierre@bistro.co.ke",
    address: "Westlands",
    orders_count: 42,
    total_spent: 185000,
    last_visit: new Date(Date.now() - 3600000 * 12).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
];

const INITIAL_SETTINGS: ShopSettings = {
  shop_name: "Prime Cut Artisan Butchery",
  phone: "+254 712 345 678",
  email: "orders@primecut.co.ke",
  address: "Ground Floor, Argwings Kodhek Rd, Kilimani, Nairobi",
  tax_pin: "P051283749Z",
  currency: "KSh",
  receipt_header: "Fresh Gourmet Meats • Halal Certified",
  receipt_footer: "Thank you for choosing Prime Cut! Fresh cuts daily.",
  default_min_stock: 10,
  tax_rate_percent: 0,
  enable_mpesa_stk: true,
};

const DEFAULT_USERS: User[] = [
  {
    id: 1,
    name: "John Kamau",
    email: "john@butcher.pos",
    phone: "0711223344",
    role: "cashier",
  },
  {
    id: 2,
    name: "Sarah Kimani",
    email: "sarah@butcher.pos",
    phone: "0722334455",
    role: "admin",
  },
];

function notifyStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("butcher:data-change"));
  }
}

class RealtimeStore {
  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(stored);
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      notifyStoreChange();
    } catch (e) {
      console.error(`Failed to write to localStorage for key ${key}:`, e);
    }
  }

  // --- Auth / User ---
  getCurrentUser(): User {
    return this.getItem<User>(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  }

  setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // --- Categories ---
  getCategories(): Category[] {
    return this.getItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  // --- Products ---
  getProducts(): Product[] {
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  getProductById(id: number): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  saveProduct(product: Partial<Product>): Product {
    const products = this.getProducts();
    if (product.id) {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...product, updated_at: new Date().toISOString() };
        this.setItem(STORAGE_KEYS.PRODUCTS, products);
        return products[idx];
      }
    }
    // New product
    const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const cat = this.getCategories().find((c) => c.id === product.category_id);
    const newProduct: Product = {
      id: newId,
      name: product.name || "Unnamed Cut",
      sku: product.sku || `CUT-${String(newId).padStart(3, "0")}`,
      category_id: product.category_id || 1,
      category_name: cat?.name || "Beef",
      price_per_kg: product.price_per_kg || 0,
      buying_cost_per_kg: product.buying_cost_per_kg || 0,
      current_stock: product.current_stock || 0,
      min_stock: product.min_stock || 10,
      unit: "KG",
      is_active: product.is_active !== undefined ? product.is_active : true,
      image: product.image,
      created_at: new Date().toISOString(),
    };
    products.unshift(newProduct);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  }

  toggleProductStatus(id: number): Product | undefined {
    const products = this.getProducts();
    const p = products.find((x) => x.id === id);
    if (p) {
      p.is_active = !p.is_active;
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
      return p;
    }
    return undefined;
  }

  // --- Shifts ---
  getShifts(): Shift[] {
    return this.getItem<Shift[]>(STORAGE_KEYS.SHIFTS, []);
  }

  getActiveShift(): Shift | null {
    const shifts = this.getShifts();
    const openShift = shifts.find((s) => s.status === "open");
    if (openShift) return openShift;

    // Automatically initialize a realistic active shift if none exists yet
    const user = this.getCurrentUser();
    const defaultShift: Shift = {
      id: 101,
      cashier_id: user.id,
      cashier_name: user.name,
      opened_at: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
      opening_cash: 5000,
      cash_sales: 0,
      mpesa_sales: 0,
      card_sales: 0,
      total_sales: 0,
      expected_cash: 5000,
      status: "open",
    };
    shifts.unshift(defaultShift);
    this.setItem(STORAGE_KEYS.SHIFTS, shifts);
    return defaultShift;
  }

  openShift(openingCash: number, notes?: string): Shift {
    const shifts = this.getShifts();
    // Close any previous open shift safely
    shifts.forEach((s) => {
      if (s.status === "open") s.status = "closed";
    });

    const user = this.getCurrentUser();
    const newId = shifts.length > 0 ? Math.max(...shifts.map((s) => s.id)) + 1 : 101;
    const newShift: Shift = {
      id: newId,
      cashier_id: user.id,
      cashier_name: user.name,
      opened_at: new Date().toISOString(),
      opening_cash: openingCash,
      cash_sales: 0,
      mpesa_sales: 0,
      card_sales: 0,
      total_sales: 0,
      expected_cash: openingCash,
      status: "open",
      notes,
    };
    shifts.unshift(newShift);
    this.setItem(STORAGE_KEYS.SHIFTS, shifts);
    return newShift;
  }

  closeShift(countedCash: number, notes?: string): Shift {
    const shifts = this.getShifts();
    const active = shifts.find((s) => s.status === "open");
    if (!active) throw new Error("No active shift is currently open.");

    active.closed_at = new Date().toISOString();
    active.counted_cash = countedCash;
    active.difference = roundTo(countedCash - active.expected_cash, 2);
    active.status = "closed";
    if (notes) active.notes = (active.notes ? active.notes + " | " : "") + notes;

    this.setItem(STORAGE_KEYS.SHIFTS, shifts);
    return active;
  }

  // --- Sales & Checkout Engine ---
  getSales(): Sale[] {
    return this.getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  getSaleById(id: number): Sale | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  completeSale(payload: {
    items: Array<{
      product_id: number;
      weight: number;
      price_per_kg: number;
      discount?: number;
    }>;
    payment_method: "cash" | "mpesa" | "card";
    amount_received?: number;
    customer_id?: number | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    mpesa_reference?: string;
    card_reference?: string;
    notes?: string;
  }): Sale {
    const products = this.getProducts();
    const user = this.getCurrentUser();
    const activeShift = this.getActiveShift();

    // 1. Validate and calculate items
    const saleItems: SaleItem[] = [];
    let subtotal = 0;
    let totalDiscount = 0;

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      const prod = products.find((p) => p.id === item.product_id);
      if (!prod) {
        throw new Error(`Product ID ${item.product_id} not found.`);
      }
      if (item.weight <= 0) {
        throw new Error(`Invalid weight for ${prod.name}. Must be greater than 0.`);
      }
      if (prod.current_stock < item.weight) {
        throw new Error(
          `Insufficient stock for ${prod.name}. Requested: ${item.weight.toFixed(3)} KG, Available: ${prod.current_stock.toFixed(3)} KG.`
        );
      }

      const lineSubtotal = calculateSubtotal(item.weight, item.price_per_kg);
      const lineDiscount = item.discount || 0;
      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;

      saleItems.push({
        id: i + 1,
        sale_id: 0,
        product_id: prod.id,
        product_name: prod.name,
        weight: roundTo(item.weight, 3),
        price_per_kg: item.price_per_kg,
        subtotal: roundTo(lineSubtotal - lineDiscount, 2),
      });

      // Automatically deduct inventory in real time!
      const prevStock = prod.current_stock;
      prod.current_stock = roundTo(prod.current_stock - item.weight, 3);

      // Record movement
      this.recordMovement({
        product_id: prod.id,
        product_name: prod.name,
        type: "sale",
        quantity: -item.weight,
        previous_stock: prevStock,
        new_stock: prod.current_stock,
        user_name: user.name,
        notes: `Sold via POS`,
      });
    }

    // Save updated products immediately
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    const grandTotal = roundTo(subtotal - totalDiscount, 2);

    // Validate cash payment
    let changeGiven = 0;
    if (payload.payment_method === "cash") {
      const received = payload.amount_received || grandTotal;
      if (received < grandTotal) {
        throw new Error(
          `Insufficient cash received. Total is KSh ${grandTotal.toFixed(2)}, received KSh ${received.toFixed(2)}.`
        );
      }
      changeGiven = roundTo(received - grandTotal, 2);
    }

    // 2. Generate Sale Record
    const sales = this.getSales();
    const newId = sales.length > 0 ? Math.max(...sales.map((s) => s.id)) + 1 : 1;
    const saleNumber = `SL-${String(newId).padStart(6, "0")}`;

    saleItems.forEach((si) => (si.sale_id = newId));

    const newSale: Sale = {
      id: newId,
      sale_number: saleNumber,
      cashier_id: user.id,
      cashier_name: user.name,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name || (payload.customer_id ? "Customer" : "Walk-in Customer"),
      customer_phone: payload.customer_phone,
      subtotal: roundTo(subtotal, 2),
      discount: roundTo(totalDiscount, 2),
      total: grandTotal,
      payment_method: payload.payment_method,
      payment_status: "completed",
      sale_status: "completed",
      amount_received: payload.amount_received || grandTotal,
      change_given: changeGiven,
      mpesa_reference: payload.mpesa_reference,
      card_reference: payload.card_reference,
      notes: payload.notes,
      items: saleItems,
      created_at: new Date().toISOString(),
    };

    sales.unshift(newSale);
    this.setItem(STORAGE_KEYS.SALES, sales);

    // 3. Update Shift in real time
    if (activeShift) {
      const shifts = this.getShifts();
      const currentShift = shifts.find((s) => s.id === activeShift.id);
      if (currentShift) {
        if (payload.payment_method === "cash") {
          currentShift.cash_sales = roundTo(currentShift.cash_sales + grandTotal, 2);
          currentShift.expected_cash = roundTo(currentShift.opening_cash + currentShift.cash_sales, 2);
        } else if (payload.payment_method === "mpesa") {
          currentShift.mpesa_sales = roundTo(currentShift.mpesa_sales + grandTotal, 2);
        } else if (payload.payment_method === "card") {
          currentShift.card_sales = roundTo(currentShift.card_sales + grandTotal, 2);
        }
        currentShift.total_sales = roundTo(
          currentShift.cash_sales + currentShift.mpesa_sales + currentShift.card_sales,
          2
        );
        this.setItem(STORAGE_KEYS.SHIFTS, shifts);
      }
    }

    // 4. Update Customer stats in real time if attached
    if (payload.customer_id) {
      const customers = this.getCustomers();
      const cust = customers.find((c) => c.id === payload.customer_id);
      if (cust) {
        cust.orders_count += 1;
        cust.total_spent = roundTo(cust.total_spent + grandTotal, 2);
        cust.last_visit = new Date().toISOString();
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return newSale;
  }

  // --- Refunds ---
  refundSale(saleId: number, reason: string): Sale {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) throw new Error(`Sale #${saleId} not found.`);
    if (sale.sale_status === "refunded") throw new Error(`Sale #${sale.sale_number} is already refunded.`);

    const user = this.getCurrentUser();
    const products = this.getProducts();

    // Revert inventory
    for (const item of sale.items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        const prev = prod.current_stock;
        prod.current_stock = roundTo(prod.current_stock + item.weight, 3);
        this.recordMovement({
          product_id: prod.id,
          product_name: prod.name,
          type: "refund",
          quantity: item.weight,
          previous_stock: prev,
          new_stock: prod.current_stock,
          user_name: user.name,
          notes: `Refund for sale ${sale.sale_number}: ${reason}`,
        });
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    sale.sale_status = "refunded";
    sale.refund_reason = reason;
    sale.refunded_at = new Date().toISOString();
    sale.refunded_by = user.name;
    this.setItem(STORAGE_KEYS.SALES, sales);

    return sale;
  }

  // --- Inventory Movements ---
  getMovements(): InventoryMovement[] {
    return this.getItem<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  }

  recordMovement(movement: Omit<InventoryMovement, "id" | "created_at">): InventoryMovement {
    const movements = this.getMovements();
    const newId = movements.length > 0 ? Math.max(...movements.map((m) => m.id)) + 1 : 1;
    const entry: InventoryMovement = {
      ...movement,
      id: newId,
      created_at: new Date().toISOString(),
    };
    movements.unshift(entry);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);
    return entry;
  }

  // Stock In (Adding meat inventory)
  stockIn(payload: {
    product_id: number;
    quantity: number; // in KG
    buying_cost: number;
    notes?: string;
  }): Product {
    if (payload.quantity <= 0) throw new Error("Quantity must be greater than 0.");
    const products = this.getProducts();
    const prod = products.find((p) => p.id === payload.product_id);
    if (!prod) throw new Error("Product not found.");

    const user = this.getCurrentUser();
    const prev = prod.current_stock;
    prod.current_stock = roundTo(prod.current_stock + payload.quantity, 3);
    prod.buying_cost_per_kg = payload.buying_cost;

    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    this.recordMovement({
      product_id: prod.id,
      product_name: prod.name,
      type: "stock_in",
      quantity: payload.quantity,
      previous_stock: prev,
      new_stock: prod.current_stock,
      buying_cost: payload.buying_cost,
      user_name: user.name,
      notes: payload.notes || "Stock replenishment",
    });

    return prod;
  }

  // Stock Adjustment (Correct discrepancy)
  adjustStock(payload: {
    product_id: number;
    adjustment_kg: number; // e.g. -1.5 or +2.0
    reason: string;
    notes?: string;
  }): Product {
    if (!payload.reason) throw new Error("A reason for stock adjustment is required.");
    const products = this.getProducts();
    const prod = products.find((p) => p.id === payload.product_id);
    if (!prod) throw new Error("Product not found.");

    const user = this.getCurrentUser();
    const prev = prod.current_stock;
    const newStock = roundTo(prod.current_stock + payload.adjustment_kg, 3);
    if (newStock < 0) throw new Error("Adjustment cannot result in negative stock.");

    prod.current_stock = newStock;
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    this.recordMovement({
      product_id: prod.id,
      product_name: prod.name,
      type: "adjustment",
      quantity: payload.adjustment_kg,
      previous_stock: prev,
      new_stock: prod.current_stock,
      reason: payload.reason,
      user_name: user.name,
      notes: payload.notes,
    });

    return prod;
  }

  // Wastage (Spoilage, Trimming, Damage)
  getWastage(): WastageRecord[] {
    return this.getItem<WastageRecord[]>(STORAGE_KEYS.WASTAGE, []);
  }

  recordWastage(payload: {
    product_id: number;
    quantity: number; // in KG
    reason: "Spoilage" | "Damage" | "Trimming" | "Expired" | "Other";
    notes?: string;
  }): WastageRecord {
    if (payload.quantity <= 0) throw new Error("Wastage quantity must be greater than 0.");
    const products = this.getProducts();
    const prod = products.find((p) => p.id === payload.product_id);
    if (!prod) throw new Error("Product not found.");

    if (prod.current_stock < payload.quantity) {
      throw new Error(`Cannot waste more than available stock (${prod.current_stock.toFixed(3)} KG).`);
    }

    const user = this.getCurrentUser();
    const prev = prod.current_stock;
    prod.current_stock = roundTo(prod.current_stock - payload.quantity, 3);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    const cost = roundTo(payload.quantity * (prod.buying_cost_per_kg || prod.price_per_kg * 0.7), 2);

    const wastageList = this.getWastage();
    const newId = wastageList.length > 0 ? Math.max(...wastageList.map((w) => w.id)) + 1 : 1;
    const entry: WastageRecord = {
      id: newId,
      product_id: prod.id,
      product_name: prod.name,
      quantity: payload.quantity,
      reason: payload.reason,
      estimated_cost: cost,
      notes: payload.notes,
      reported_by: user.name,
      created_at: new Date().toISOString(),
    };
    wastageList.unshift(entry);
    this.setItem(STORAGE_KEYS.WASTAGE, wastageList);

    this.recordMovement({
      product_id: prod.id,
      product_name: prod.name,
      type: "wastage",
      quantity: -payload.quantity,
      previous_stock: prev,
      new_stock: prod.current_stock,
      reason: payload.reason,
      user_name: user.name,
      notes: payload.notes,
    });

    return entry;
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  saveCustomer(customer: Partial<Customer>): Customer {
    const list = this.getCustomers();
    if (customer.id) {
      const idx = list.findIndex((c) => c.id === customer.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...customer };
        this.setItem(STORAGE_KEYS.CUSTOMERS, list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((c) => c.id)) + 1 : 1;
    const newCust: Customer = {
      id: newId,
      name: customer.name || "Customer",
      phone: customer.phone || "",
      email: customer.email,
      address: customer.address,
      orders_count: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };
    list.unshift(newCust);
    this.setItem(STORAGE_KEYS.CUSTOMERS, list);
    return newCust;
  }

  // --- Settings ---
  getSettings(): ShopSettings {
    return this.getItem<ShopSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  saveSettings(settings: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }
}

export const realtimeStore = new RealtimeStore();
