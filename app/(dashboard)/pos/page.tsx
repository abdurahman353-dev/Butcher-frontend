"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Product,
  Category,
  Customer,
  Sale,
  CartItem,
  HeldOrder,
  RestaurantTable,
  RestaurantBill,
  RestaurantBillItem,
} from "@/types";
import { productsService } from "@/services/products.service";
import { customersService } from "@/services/customers.service";
import { posService } from "@/services/pos.service";
import { salesService } from "@/services/sales.service";
import { restaurantService } from "@/services/restaurant.service";
import { useCart } from "@/hooks/useCart";
import { useShift } from "@/hooks/useShift";
import { useHeldOrders } from "@/hooks/useHeldOrders";
import { useAuth } from "@/hooks/useAuth";
import { useTableSync, triggerTableSync } from "@/hooks/useTableSync";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPane } from "@/components/pos/CartPane";
import { TableMapView } from "@/components/pos/TableMapView";
import { TableBillsModal } from "@/components/pos/TableBillsModal";
import { AddTableModal } from "@/components/pos/AddTableModal";
import { KitchenOrderSlipModal } from "@/components/pos/KitchenOrderSlipModal";
import { CustomerPreBillModal } from "@/components/pos/CustomerPreBillModal";
import { WeightInput } from "@/components/shared/WeightInput";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { HeldOrdersModal } from "@/components/pos/HeldOrdersModal";
import { SettlePaymentModal } from "@/components/pos/SettlePaymentModal";
import { UnpaidOrdersPickerModal } from "@/components/pos/UnpaidOrdersPickerModal";
import { QuickAddCustomerModal } from "@/components/pos/QuickAddCustomerModal";
import { EditCustomerModal } from "@/components/pos/EditCustomerModal";
import { PrinterSettingsModal } from "@/components/pos/PrinterSettingsModal";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import {
  ShoppingBag,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  ChefHat,
  Printer,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSystemDialog } from "@/contexts/DialogContext";

export default function PosPage() {
  const router = useRouter();
  const { confirm, alert } = useSystemDialog();
  const { user } = useAuth();
  const isRestaurant = user?.company?.business_type === "restaurant";
  const isClothing = user?.company?.business_type === "clothing";
  const isWaiter = user?.role === "waiter";
  const isSuperAdmin = user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState<"products" | "tables">(
    isRestaurant ? "tables" : "products"
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Restaurant Tables & Multi-Bill State
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([]);
  const [isTablesLoading, setIsTablesLoading] = useState(isRestaurant);
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);
  const [activeBill, setActiveBill] = useState<RestaurantBill | null>(null);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  // Refs to track active session without stale closures in SSE callback
  const activeTableRef = useRef<RestaurantTable | null>(null);
  const activeBillRef  = useRef<RestaurantBill | null>(null);
  const selectedTableForModalRef = useRef<RestaurantTable | null>(null);
  // Tracks the in-flight createBill promise so handleSaveOrder can await it instead of creating a duplicate
  const pendingBillRef = useRef<Promise<RestaurantBill> | null>(null);

  useEffect(() => { activeTableRef.current = activeTable; }, [activeTable]);
  useEffect(() => { activeBillRef.current  = activeBill;  }, [activeBill]);

  /**
   * Helper to sanitize table data: ONLY strips id=0 placeholder bills that were
   * never persisted to the database. Real bills (id > 0) from the server are
   * always kept — they must only disappear on explicit cancel or checkout.
   */
  const sanitizeTablesData = useCallback((rawTables: RestaurantTable[]): RestaurantTable[] => {
    return rawTables.map((t) => {
      // Keep real bills (id > 0) OR bills with items/total OR current active bill
      const validBills = (t.active_bills || []).filter(
        (b) =>
          b.id > 0 ||
          (b.items && b.items.length > 0) ||
          (b.total && b.total > 0) ||
          (activeBillRef.current?.id === b.id && activeTableRef.current?.id === t.id)
      );
      const hasValid =
        validBills.length > 0 ||
        (t.total_active_amount && t.total_active_amount > 0) ||
        (t.active_bills_count && t.active_bills_count > 0) ||
        t.status === "red" ||
        t.status === "yellow";
      const totalAmount =
        validBills.reduce((sum, b) => sum + (b.total || 0), 0) || t.total_active_amount || 0;
      return {
        ...t,
        active_bills: validBills,
        active_bills_count: Math.max(validBills.length, t.active_bills_count || 0),
        total_active_amount: totalAmount,
        status: hasValid ? (t.status === "yellow" ? "yellow" : "red") : ("grey" as const),
      };
    });
  }, []);

  /**
   * Live SSE update handler — merges fresh table data from the server without
   * disrupting an active ordering session.
   */
  const handleLiveTablesUpdate = useCallback((freshTables: RestaurantTable[]) => {
    const cleaned = sanitizeTablesData(freshTables);
    setRestaurantTables(cleaned);

    // If the user is actively ordering on a bill, refresh their session refs too
    const curTable = activeTableRef.current;
    const curBill  = activeBillRef.current;
    if (curTable) {
      const freshTable = cleaned.find((t) => t.id === curTable.id);
      if (freshTable) {
        setActiveTable(freshTable);
        if (curBill) {
          const freshBill = freshTable.active_bills?.find((b) => b.id === curBill.id);
          if (freshBill) setActiveBill(freshBill);
        }
      }
    }

    // Also update the open TableBillsModal if one is showing.
    // Use raw freshTables (not cleaned) so bills just posted/printed are never
    // accidentally dropped by the ghost-bill sanitizer while the modal is open.
    const modalTableId = selectedTableForModalRef.current?.id;
    if (modalTableId) {
      const freshModalTable = freshTables.find((t) => t.id === modalTableId);
      if (freshModalTable) {
        selectedTableForModalRef.current = freshModalTable;
        setSelectedTableForModal(freshModalTable);
      }
    }
  }, []);

  // Real-time sync via SSE — no polling, instant millisecond updates
  useTableSync({
    onUpdate: handleLiveTablesUpdate,
    enabled: isRestaurant,
    companyId: user?.company_id ?? null,
  });


  // In restaurant mode, cashier starts on Floor Tables and only goes to Menu & Dishes when an active bill is opened
  useEffect(() => {
    if (isRestaurant && !activeBill) {
      setActiveTab("tables");
    }
  }, [isRestaurant, activeBill]);

  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isFloorHeaderHidden, setIsFloorHeaderHidden] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pos_hide_floor_header") === "true";
    }
    return false;
  });

  const handleToggleHideFloorHeader = useCallback(() => {
    setIsFloorHeaderHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_hide_floor_header", String(next));
      }
      return next;
    });
  }, []);

  const [selectedTableForModal, setSelectedTableForModal] = useState<RestaurantTable | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [printingKitchenBill, setPrintingKitchenBill] = useState<RestaurantBill | null>(null);
  const [reprintProductId, setReprintProductId] = useState<number | undefined>(undefined);
  const [isSlipReprint, setIsSlipReprint] = useState(false);
  const [printingCustomerBill, setPrintingCustomerBill] = useState<RestaurantBill | null>(null);

  // Modals state
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"cash" | "mpesa" | "credit" | "free">("cash");
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Held Orders State
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);

  // Pay Later / Settle Modal State
  const [unpaidSales, setUnpaidSales] = useState<Sale[]>([]);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [saleToSettle, setSaleToSettle] = useState<Sale | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const {
    items,
    subtotal,
    totalDiscount,
    total,
    totalWeight,
    itemsCount,
    addItem,
    updateWeight,
    adjustWeightBy,
    updateDiscount,
    removeItem,
    clearCart,
    restoreItems,
  } = useCart();

  const {
    heldOrders,
    heldCount,
    holdCurrentOrder,
    removeHeldOrder,
    clearAllHeldOrders,
  } = useHeldOrders();

  const { isShiftOpen, isLoading: isShiftLoading } = useShift();

  // Load tables — silent=true skips the loading spinner for background refreshes
  const fetchRestaurantTables = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsTablesLoading(true);
      const data = await restaurantService.getTables();
      const cleaned = sanitizeTablesData(data);
      setRestaurantTables(cleaned);

      // ONLY update activeTable/activeBill if user currently has an active table session.
      // Uses refs to avoid stale closures from resurrecting previously opened tables.
      const currentActiveTable = activeTableRef.current;
      const currentActiveBill = activeBillRef.current;
      if (currentActiveTable) {
        const found = cleaned.find((t) => t.id === currentActiveTable.id);
        if (found) {
          setActiveTable(found);
          activeTableRef.current = found;
          if (currentActiveBill) {
            const foundBill = found.active_bills?.find((b) => b.id === currentActiveBill.id);
            if (foundBill) {
              setActiveBill(foundBill);
              activeBillRef.current = foundBill;
            }
          }
        }
      }

      // If the TableBillsModal is open, refresh it with the raw (unstripped) server data
      // so that bills the user just posted/printed are never accidentally removed by sanitization.
      const modalTableId = selectedTableForModalRef.current?.id;
      if (modalTableId) {
        const freshModalTable = data.find((t) => t.id === modalTableId);
        if (freshModalTable) {
          selectedTableForModalRef.current = freshModalTable;
          setSelectedTableForModal(freshModalTable);
        }
      }
    } catch (e) {
      console.error("Failed to load tables:", e);
    } finally {
      if (!silent) setIsTablesLoading(false);
    }
  }, [sanitizeTablesData]);

  // Load unpaid / pay-later sales
  const fetchUnpaidSales = useCallback(async () => {
    try {
      const res = await salesService.getSales({ payment_status: "pending", per_page: 50 });
      if (res && Array.isArray(res.data)) {
        // Strictly exclude refunded or cancelled sales
        const validUnpaid = res.data.filter(
          (s) =>
            s.sale_status !== "refunded" &&
            s.sale_status !== "cancelled" &&
            Number(s.refunded_amount || 0) < Number(s.total || 0)
        );
        setUnpaidSales(validUnpaid);
        setUnpaidCount(validUnpaid.length);
      }
    } catch (e) {
      console.error("Failed to load unpaid sales:", e);
    }
  }, []);

  // Fetch POS data — parallelize restaurant tables fetch so Floor Tables loads immediately
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    // If restaurant, start table fetching immediately in parallel
    const tablesPromise = isRestaurant ? fetchRestaurantTables() : Promise.resolve();

    try {
      const [cats, prodsRes, custsRes] = await Promise.all([
        productsService.getCategories(),
        productsService.getProducts({ per_page: 200, status: "active" }),
        customersService.getCustomers({ per_page: 50 }),
        fetchUnpaidSales(),
        tablesPromise,
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prodsRes?.data) ? prodsRes.data : []);
      setCustomers(Array.isArray(custsRes?.data) ? custsRes.data : []);
    } catch (e: any) {
      const msg = e?.message || "Failed to load POS catalog.";
      console.error("Failed to load POS data:", msg, e);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchUnpaidSales, fetchRestaurantTables, isRestaurant]);

  // Load once on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectProduct = (product: Product) => {
    if (isRestaurant) {
      // In restaurant mode only: clicking the item directly adds it or increments quantity by 1 each click (no modal popup)
      addItem(product, 1.0);
      if (activeBill) {
        setHasUnsavedOrder(true);
      }
      return;
    }

    // In butcher/retail mode: show the weight/quantity numpad modal (Image 1)
    setSelectedProductForWeight(product);
  };

  const handleConfirmWeight = (weightKg: number) => {
    if (selectedProductForWeight) {
      addItem(selectedProductForWeight, weightKg);
      setSelectedProductForWeight(null);
      if (activeBill) {
        setHasUnsavedOrder(true);
      }
    }
  };

  const handleConfirmEditWeight = (weightKg: number) => {
    if (editingCartItem) {
      updateWeight(editingCartItem.id, weightKg);
      setEditingCartItem(null);
      if (activeBill) {
        setHasUnsavedOrder(true);
      }
    }
  };

  const handleAdjustWeight = (id: string, deltaKg: number) => {
    adjustWeightBy(id, deltaKg);
    if (activeBill) {
      setHasUnsavedOrder(true);
    }
  };

  const handleUpdateDiscount = (id: string, discount: number) => {
    if (user?.role === "waiter") return;
    updateDiscount(id, discount);
    if (activeBill) {
      setHasUnsavedOrder(true);
    }
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
    if (activeBill) {
      const remaining = items.filter((it) => it.id !== id);
      const hasUnsavedRemaining = remaining.some((it) => !it.is_saved);
      setHasUnsavedOrder(hasUnsavedRemaining);
    }
  };

  // Hold current order
  const handleHoldOrder = () => {
    if (items.length === 0) return;
    const defaultRef = selectedCustomer?.name
      ? `Order - ${selectedCustomer.name}`
      : `Bill #${heldCount + 1}`;

    holdCurrentOrder({
      items,
      customer: selectedCustomer,
      subtotal,
      totalDiscount,
      total,
      totalWeight,
      reference: defaultRef,
    });

    clearCart();
    setSelectedCustomer(null);
  };

  // Resume a held order into the active cart
  const handleResumeHeldOrder = (order: HeldOrder) => {
    restoreItems(order.items);
    setSelectedCustomer(order.customer);
    removeHeldOrder(order.id);
  };

  // Start a new blank bill / exit active table
  const handleNewBill = async () => {
    if (items.length > 0) {
      const shouldHold = await confirm({
        title: "Hold Current Bill?",
        message:
          "You have active cuts in your cart. Would you like to hold/save this order first before creating a fresh new bill?",
        confirmText: "Hold & Start New Bill",
        cancelText: "Discard & Start New Bill",
        type: "info",
      });

      if (shouldHold) {
        handleHoldOrder();
        return;
      }
    }
    // Unlock the table so other users can access it
    if (activeTable) {
      try { await restaurantService.unlockTable(activeTable.id); } catch (e) { console.error("Unlock table error:", e); }
    }
    // Clear refs synchronously
    activeBillRef.current = null;
    activeTableRef.current = null;
    selectedTableForModalRef.current = null;
    clearCart();
    setSelectedCustomer(null);
    setActiveBill(null);
    setActiveTable(null);
    setSelectedTableForModal(null);
    setHasUnsavedOrder(false);
  };

  // Restaurant: Open Bill for Ordering (instant & clean, no flash)
  const handleOpenBillForOrdering = (table: RestaurantTable, bill: RestaurantBill) => {
    // 1. FIRST: synchronously update refs so in-flight requests or SSE never use previous table
    activeTableRef.current = table;
    activeBillRef.current = bill;
    selectedTableForModalRef.current = null;

    // 2. Clear old cart & customer
    clearCart();
    setSelectedCustomer(null);

    // 3. Build the new cart items from this bill's saved items
    const cartItems: CartItem[] = (bill.items && bill.items.length > 0)
      ? bill.items.map((it, idx) => {
          const matchingProduct = products.find((p) => p.id === it.product_id);
          const sub = it.price_per_kg * it.weight;
          const disc = it.discount || 0;
          return {
            id: `bill_${bill.id}_${it.product_id}_${idx}`,
            product_id: it.product_id,
            product_name: it.product_name,
            sku: matchingProduct?.sku || `SKU-${it.product_id}`,
            price_per_kg: it.price_per_kg,
            weight: it.weight,
            unit: it.unit || matchingProduct?.unit || "KG",
            discount: disc,
            subtotal: sub,
            total: Math.max(0, sub - disc),
            available_stock: matchingProduct?.current_stock ?? 999,
            notes: it.notes || "",
            is_saved: true,
          };
        })
      : [];

    // 4. NOW set all new state together — single render, no intermediate flash
    setActiveTable(table);
    setActiveBill(bill);
    setHasUnsavedOrder(false);
    setIsTableModalOpen(false);
    setSelectedTableForModal(null);
    setActiveTab("products");

    if (cartItems.length > 0) {
      restoreItems(cartItems);
    }

    if (bill.customer_name) {
      setSelectedCustomer({
        id: bill.customer_id || 0,
        name: bill.customer_name,
        phone: bill.customer_phone || "",
        orders_count: 1,
        total_spent: 0,
        created_at: new Date().toISOString(),
      });
    }

    // Lock table in background (non-blocking)
    restaurantService.lockTable(table.id).catch((err) => {
      if (err?.response?.status === 409) {
        console.warn("Table lock warning:", err);
      }
    });
  };

  // Restaurant: Create a new bill on a table (instant 0ms transition, background creation)
  const handleCreateNewBill = async (
    table: RestaurantTable,
    payload: {
      waiter_name?: string;
      waiter_pin?: string;
      guest_count?: number;
      customer_name?: string;
      customer_phone?: string;
      customer_address?: string;
      customer_id?: number;
      notes?: string;
    }
  ) => {
    const waiterNameToUse = payload.waiter_name || user?.name || "Staff";

    const tempBill: RestaurantBill = {
      id: 0,
      table_id: table.id,
      table_number: table.table_number,
      bill_number: `B-${table.table_number}-...`,
      waiter_name: waiterNameToUse,
      waiter_pin: payload.waiter_pin,
      cashier_name: user?.name || "Staff",
      guest_count: payload.guest_count || 1,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_address: payload.customer_address,
      notes: payload.notes,
      status: "open",
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. 0ms INSTANT SWITCH TO MENU & DISHES
    setIsTableModalOpen(false);
    setSelectedTableForModal(null);
    clearCart();
    setSelectedCustomer(
      payload.customer_name
        ? {
            id: payload.customer_id || 0,
            name: payload.customer_name,
            phone: payload.customer_phone || "",
            address: payload.customer_address || "",
            orders_count: 1,
            total_spent: 0,
            created_at: new Date().toISOString(),
          }
        : null
    );
    setHasUnsavedOrder(false);
    handleOpenBillForOrdering(table, tempBill);

    // 2. CREATE REAL BILL IN BACKGROUND
    const billPromise = restaurantService.createBill(table.id, {
      waiter_name: waiterNameToUse,
      waiter_pin: payload.waiter_pin,
      guest_count: payload.guest_count || 1,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_address: payload.customer_address,
      notes: payload.notes,
    });

    pendingBillRef.current = billPromise;

    billPromise
      .then((createdBill) => {
        const stillOnThisSession = activeTableRef.current?.id === table.id;

        // User exited before API responded — cancel the empty ghost bill silently, don't add to UI
        if (!stillOnThisSession) {
          restaurantService.cancelBill(createdBill.id).catch(() => {});
          return;
        }

        // If user is currently on this table session, assign official bill ID and number seamlessly
        if (!activeBillRef.current || activeBillRef.current.id === 0) {
          activeBillRef.current = createdBill;
          setActiveBill((curr) => {
            if (!curr || curr.id === 0) {
              return { ...createdBill, items: curr?.items || [] };
            }
            return curr;
          });
        }

        // Optimistically add the real bill to the floor map immediately (no fetch needed)
        setRestaurantTables((prev) =>
          prev.map((t) => {
            if (t.id !== table.id) return t;
            // Replace any id=0 placeholder + deduplicate the real bill
            const remaining = (t.active_bills || []).filter(
              (b) => b.id !== createdBill.id && b.id !== 0
            );
            const nextBills = [createdBill, ...remaining];
            return {
              ...t,
              status: "red" as const,
              active_bills: nextBills,
              active_bills_count: nextBills.length,
            };
          })
        );
        // Trigger SSE sync so other connected clients see the new bill instantly
        triggerTableSync();
      })
      .catch((e: any) => {
        console.error("Create bill error:", e);
        alert({
          title: "Could Not Create Bill",
          message: e?.response?.data?.message || e?.message || "Failed to create a new bill on this table.",
          type: "danger",
        });
      })
      .finally(() => {
        if (pendingBillRef.current === billPromise) {
          pendingBillRef.current = null;
        }
      });
  };

  // Restaurant: Update active bill when customer or bill details change
  const handleBillUpdated = (updatedBill: RestaurantBill) => {
    // If the bill was cancelled or settled, remove it from active_bills everywhere immediately!
    if (updatedBill.status === "cancelled" || updatedBill.status === "settled") {
      setRestaurantTables((prev) =>
        prev.map((t) => ({
          ...t,
          active_bills: (t.active_bills || []).filter((b) => b.id !== updatedBill.id),
        }))
      );
      setSelectedTableForModal((prev) =>
        prev
          ? {
              ...prev,
              active_bills: (prev.active_bills || []).filter((b) => b.id !== updatedBill.id),
            }
          : prev
      );
      if (selectedTableForModalRef.current) {
        selectedTableForModalRef.current = {
          ...selectedTableForModalRef.current,
          active_bills: (selectedTableForModalRef.current.active_bills || []).filter(
            (b) => b.id !== updatedBill.id
          ),
        };
      }
      return;
    }

    setRestaurantTables((prev) =>
      prev.map((t) => {
        if (t.id === updatedBill.table_id) {
          const exists = (t.active_bills || []).some((b) => b.id === updatedBill.id);
          const bills = exists
            ? (t.active_bills || []).map((b) => (b.id === updatedBill.id ? updatedBill : b))
            : [...(t.active_bills || []), updatedBill];
          return { ...t, active_bills: bills };
        } else {
          // If bill was transferred from another table, remove it from that table
          return {
            ...t,
            active_bills: (t.active_bills || []).filter((b) => b.id !== updatedBill.id),
          };
        }
      })
    );
    setSelectedTableForModal((prev) => {
      if (!prev) return prev;
      if (prev.id === updatedBill.table_id) {
        const exists = (prev.active_bills || []).some((b) => b.id === updatedBill.id);
        const bills = exists
          ? (prev.active_bills || []).map((b) => (b.id === updatedBill.id ? updatedBill : b))
          : [...(prev.active_bills || []), updatedBill];
        return { ...prev, active_bills: bills };
      } else {
        // If it was moved away or doesn't belong to this modal table, remove it
        return {
          ...prev,
          active_bills: (prev.active_bills || []).filter((b) => b.id !== updatedBill.id),
        };
      }
    });
    if (activeBill && activeBill.id === updatedBill.id) {
      setActiveBill(updatedBill);
      if (updatedBill.customer_name) {
        setSelectedCustomer({
          id: updatedBill.customer_id || 0,
          name: updatedBill.customer_name,
          phone: updatedBill.customer_phone || "",
          address: updatedBill.customer_address || updatedBill.customer?.address || "",
          orders_count: 1,
          total_spent: 0,
          created_at: new Date().toISOString(),
        });
      } else {
        setSelectedCustomer(null);
      }
    }
    setPrintingCustomerBill((prev) => (prev && prev.id === updatedBill.id ? updatedBill : prev));
  };

  // Restaurant: Save Order & Print KOT Kitchen Receipt (Ultra-Fast Optimistic Execution)
  const handleSaveOrder = async (): Promise<boolean> => {
    if (!activeBill) return false;
    if (items.length === 0) {
      alert({
        title: "Cart is Empty",
        message: "Please post products to the bill before saving.",
        type: "warning",
      });
      return false;
    }

    // 1. Identify newly added / unsaved items for KOT slip
    const newItems = items.filter((it) => !it.is_saved);

    const formattedItems: RestaurantBillItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.product_id);
      return {
        product_id: it.product_id,
        product_name: it.product_name,
        category_id: it.category_id || prod?.category_id,
        category_name: it.category_name || prod?.category_name || "Kitchen",
        price_per_kg: it.price_per_kg,
        weight: it.weight,
        unit: it.unit,
        discount: it.discount || 0,
        notes: it.notes || "",
        line_total: it.subtotal,
      };
    });

    // 2. INSTANT OPTIMISTIC UI (0ms network delay!)
    const allSavedCartItems: CartItem[] = items.map((it) => ({
      ...it,
      is_saved: true,
    }));
    restoreItems(allSavedCartItems);
    setHasUnsavedOrder(false);

    // Prepare KOT slip immediately
    const itemsForSlip: RestaurantBillItem[] = (newItems.length > 0 ? newItems : items).map((it) => {
      const prod = products.find((p) => p.id === it.product_id);
      return {
        product_id: it.product_id,
        product_name: it.product_name,
        category_id: it.category_id || prod?.category_id,
        category_name: it.category_name || prod?.category_name || "Kitchen",
        price_per_kg: it.price_per_kg,
        weight: it.weight,
        unit: it.unit,
        discount: it.discount || 0,
        notes: it.notes || "",
        line_total: it.subtotal,
      };
    });

    const billForKitchenSlip: RestaurantBill = {
      ...activeBill,
      items: itemsForSlip,
      subtotal,
      discount: totalDiscount,
      total,
      status: "open",
    };

    setIsSlipReprint(false);
    setReprintProductId(undefined);
    setPrintingKitchenBill(billForKitchenSlip);

    // Optimistically update table on floor map to RED immediately
    const tableIdForClean = activeBill.table_id || activeTable?.id;
    if (tableIdForClean) {
      setRestaurantTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableIdForClean) return t;
          const otherBills = (t.active_bills || []).filter((b) => b.id !== activeBill.id);
          const updatedActiveBill: RestaurantBill = {
            ...activeBill,
            items: formattedItems,
            subtotal,
            discount: totalDiscount,
            total,
            status: "open",
          };
          const nextBills = [updatedActiveBill, ...otherBills];
          return {
            ...t,
            status: "red" as const,
            active_bills: nextBills,
            active_bills_count: nextBills.length,
            total_active_amount: nextBills.reduce((sum, b) => sum + (b.total || 0), 0),
          };
        })
      );
    }

    // 3. PERSIST TO BACKEND
    setIsSavingOrder(true);
    try {
      let targetBill = activeBill;

      // If bill is temp (id === 0), await or create
      if (!targetBill || targetBill.id === 0) {
        if (pendingBillRef.current) {
          try {
            const resolvedBill = await pendingBillRef.current;
            targetBill = resolvedBill;
            setActiveBill(resolvedBill);
            activeBillRef.current = resolvedBill;
          } catch {
            // fallback below
          }
        }
        if (!targetBill || targetBill.id === 0) {
          const tableId = targetBill?.table_id || activeTable?.id;
          if (!tableId) return true;
          const createdBill = await restaurantService.createBill(tableId, {
            waiter_name: targetBill?.waiter_name || user?.name || "Server",
            waiter_pin: targetBill?.waiter_pin || undefined,
            guest_count: targetBill?.guest_count || 1,
            customer_id: selectedCustomer?.id || (targetBill?.customer_id ?? undefined),
            customer_name: selectedCustomer?.name || (targetBill?.customer_name ?? undefined),
            customer_phone: selectedCustomer?.phone || (targetBill?.customer_phone ?? undefined),
            customer_address: selectedCustomer?.address || (targetBill?.customer_address ?? undefined),
            notes: targetBill?.notes || undefined,
          });
          targetBill = createdBill;
          setActiveBill(createdBill);
          activeBillRef.current = createdBill;
        }
      }

      const res = await restaurantService.saveOrder(targetBill.id, {
        items: formattedItems,
        customer_id: selectedCustomer?.id || undefined,
        customer_name: selectedCustomer?.name || targetBill.customer_name || undefined,
        customer_phone: selectedCustomer?.phone || targetBill.customer_phone || undefined,
        customer_address: selectedCustomer?.address || targetBill.customer_address || undefined,
        waiter_name: targetBill.waiter_name,
        guest_count: targetBill.guest_count,
        notes: targetBill.notes || undefined,
      });

      setActiveBill(res.data);
      activeBillRef.current = res.data;

      // Ensure confirmed bill with real id is updated in floor map state
      if (tableIdForClean) {
        setRestaurantTables((prev) =>
          prev.map((t) => {
            if (t.id !== tableIdForClean) return t;
            const otherBills = (t.active_bills || []).filter(
              (b) => b.id !== res.data.id && b.id !== 0 && b.id !== targetBill.id
            );
            const nextBills = [res.data, ...otherBills];
            return {
              ...t,
              status: "red" as const,
              active_bills: nextBills,
              active_bills_count: nextBills.length,
              total_active_amount: nextBills.reduce((sum, b) => sum + (b.total || 0), 0),
            };
          })
        );
      }

      triggerTableSync();
      return true;
    } catch (err: any) {
      console.error("Save order error:", err);
      setHasUnsavedOrder(true);
      alert({
        title: "Save Notice",
        message: err?.response?.data?.message || err?.message || "Order shown locally, but could not sync to database.",
        type: "danger",
      });
      return false;
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Restaurant: Print Pre-Settlement Customer Bill (Yellow status) — opens modal instantly, syncs API in background
  const handlePrintCustomerBill = async (bill?: RestaurantBill) => {
    const targetBill = bill || activeBill;
    if (!targetBill) return;

    if (targetBill.id === 0 || !targetBill.items || targetBill.items.length === 0) {
      alert({
        title: "Empty or Unsaved Bill",
        message: "Cannot print an empty or unsaved bill. Please post products and save the order first.",
        type: "warning",
      });
      return;
    }

    // Optimistically open the print modal immediately — don't wait for API
    setPrintingCustomerBill(targetBill);

    try {
      const res = await restaurantService.printBill(targetBill.id);
      // Update bill in modal and active state with confirmed server data
      if (activeBill && activeBill.id === targetBill.id) {
        setActiveBill(res.data);
      }
      setPrintingCustomerBill(res.data);
      // Silently refresh tables in background
      fetchRestaurantTables(true);
      triggerTableSync();
    } catch (e: any) {
      console.error("Print bill error:", e);
      setPrintingCustomerBill(null);
      alert({
        title: "Print Bill Error",
        message: e?.response?.data?.message || e?.message || "Failed to mark bill as printed.",
        type: "danger",
      });
    }
  };

  // Restaurant: Cancel Bill
  const handleCancelBill = async (bill: RestaurantBill) => {
    if (bill.id === 0) {
      clearCart();
      setActiveBill(null);
      setActiveTable(null);
      setHasUnsavedOrder(false);
      setIsTableModalOpen(false);
      setActiveTab("tables");
      return;
    }

    const shouldCancel = await confirm({
      title: `Cancel Bill ${bill.bill_number}?`,
      message: `Are you sure you want to cancel this bill on Table ${bill.table_number}? This action cannot be undone.`,
      confirmText: "Cancel Bill",
      cancelText: "Keep Bill",
      type: "danger",
    });

    if (!shouldCancel) return;

    try {
      await restaurantService.cancelBill(bill.id);
      if (activeBill?.id === bill.id) {
        clearCart();
        setActiveBill(null);
        setActiveTable(null);
        setHasUnsavedOrder(false);
        setActiveTab("tables");
      }
      setIsTableModalOpen(false);
      // Silently refresh — no spinner
      fetchRestaurantTables(true);
    } catch (e: any) {
      console.error("Cancel bill error:", e);
      alert({
        title: "Error Cancelling Bill",
        message: e?.response?.data?.message || e?.message || "Could not cancel this bill.",
        type: "danger",
      });
    }
  };

  // Restaurant: Exit the active table session and return to Floor Tables (ultra-fast)
  const handleCloseActiveBillSession = useCallback(() => {
    if (isSavingOrder) return;
    const tableToUnlock = activeTableRef.current || activeTable;

    // 1. Instantly reset refs synchronously so in-flight requests ignore closed session
    activeBillRef.current = null;
    activeTableRef.current = null;
    selectedTableForModalRef.current = null;

    // 2. Instantly exit to tables tab with zero delay
    setActiveBill(null);
    setActiveTable(null);
    setSelectedTableForModal(null);
    clearCart();
    setSelectedCustomer(null);
    setHasUnsavedOrder(false);
    setIsMobileCartOpen(false);
    setActiveTab("tables");

    // 3. Background unlock (non-blocking)
    if (tableToUnlock) {
      restaurantService.unlockTable(tableToUnlock.id).catch(() => {});
    }
  }, [activeTable, clearCart, isSavingOrder]);

  const handlePromptExitActiveTable = async () => {
    if (isSavingOrder) {
      alert({
        title: "Order Saving in Progress",
        message: "Please wait until the order has finished saving before exiting the table.",
        type: "info",
      });
      return;
    }

    if (!activeBill) {
      setActiveTab("tables");
      return;
    }

    // Block exiting if there are actually unsaved items in the cart
    const unsavedItemsExist = items.length > 0 && (hasUnsavedOrder || items.some((it) => !it.is_saved));
    if (unsavedItemsExist) {
      const confirmed = await confirm({
        title: "Unsaved Order Items",
        message: `You have unsaved items on Table ${activeBill.table_number}. Please save the order before exiting.`,
        confirmText: "Save Order & Exit",
        cancelText: "Stay on Bill",
        type: "warning",
      });
      if (!confirmed) return;

      const saveSuccess = await handleSaveOrder();
      if (!saveSuccess) {
        // Saving failed or could not be completed; keep the user safely on the bill
        return;
      }
    }

    handleCloseActiveBillSession();
  };

  // Restaurant: Open the Table Bills modal for the currently active table to add a new bill or switch bills
  const handleOpenCurrentTableBillsModal = async () => {
    if (isSavingOrder) {
      alert({
        title: "Order Saving in Progress",
        message: "Please wait until the order has finished saving before adding or switching bills.",
        type: "info",
      });
      return;
    }

    if (!activeTable) return;

    const unsavedItemsExist = items.length > 0 && (hasUnsavedOrder || items.some((it) => !it.is_saved));
    if (unsavedItemsExist) {
      const proceed = await confirm({
        title: "Unsaved Order on Current Bill",
        message: "You have unsaved items on this bill. Please save the order before managing or adding bills.",
        confirmText: "Save Order & Continue",
        cancelText: "Stay on Current Bill",
        type: "warning",
      });
      if (!proceed) return;

      const saveSuccess = await handleSaveOrder();
      if (!saveSuccess) {
        // Blocked until saving is successful!
        return;
      }
    }

    const freshTable = restaurantTables.find((t) => t.id === activeTable.id) || activeTable;
    setSelectedTableForModal(freshTable);
    setIsTableModalOpen(true);
  };

  // Restaurant: Settle Bill directly from Table Pop-up Modal
  const handleSettleFromTableModal = (bill: RestaurantBill) => {
    handleOpenBillForOrdering(selectedTableForModal!, bill);
    setInitialPaymentMethod("cash");
    setIsCheckoutOpen(true);
  };

  // Restaurant: Add New Table
  const handleAddTable = async (payload: { name: string; table_number: string; capacity?: number; zone: string }) => {
    try {
      await restaurantService.createTable(payload);
      fetchRestaurantTables(true);
    } catch (e: any) {
      console.error("Add table error:", e);
      alert({
        title: "Error Adding Table",
        message: e?.response?.data?.message || e?.message || "Failed to create table container.",
        type: "danger",
      });
    }
  };

  // Restaurant: Delete Table (only if no orders)
  const handleDeleteTable = async (table: RestaurantTable) => {
    if (table.active_bills_count > 0 || (table.active_bills && table.active_bills.length > 0)) {
      alert({
        title: "Cannot Delete Table",
        message: `Table ${table.table_number} has active orders. Please cancel or settle them before deleting.`,
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: `Delete Table ${table.table_number}?`,
      message: `Are you sure you want to delete table "${table.name}" (${table.table_number})? This action cannot be undone.`,
      confirmText: "Delete Table",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await restaurantService.deleteTable(table.id);
      fetchRestaurantTables(true);
    } catch (e: any) {
      console.error("Delete table error:", e);
      alert({
        title: "Delete Failed",
        message: e?.response?.data?.message || e?.message || "Could not delete table.",
        type: "danger",
      });
    }
  };

  // Proceed to Checkout
  const handleProceedCheckout = async (preferredMethod: "cash" | "mpesa" | "credit" = "cash") => {
    if (isWaiter) {
      await alert({
        title: "Checkout Restricted",
        message: "Waiters and servers cannot checkout bills or collect payments. Please ask a cashier or admin to settle this bill.",
        type: "info",
      });
      return;
    }

    if (items.length === 0) {
      alert({
        title: "Cart is Empty",
        message: "Please add products before checking out.",
        type: "warning",
      });
      return;
    }

    if (activeBill && (hasUnsavedOrder || activeBill.id === 0)) {
      alert({
        title: "Save Order Required",
        message: "Please click 'Save Order & Send to Kitchen' first before proceeding to checkout.",
        type: "warning",
      });
      return;
    }

    if (!isShiftOpen) {
      const shouldOpen = await confirm({
        title: "Cashier Shift Closed",
        message:
          "Your cashier shift is currently closed. We strongly recommend opening a shift to track drawer cash and payment reconciliation.\n\nProceed to checkout anyway?",
        confirmText: "Proceed Anyway",
        cancelText: "Open Shift First",
        type: "warning",
      });

      if (!shouldOpen) {
        router.push("/shift");
        return;
      }
    }

    setInitialPaymentMethod(preferredMethod);
    setIsCheckoutOpen(true);
  };

  // Complete Sale (Counter or Restaurant Bill Settlement)
  const handleCompleteSale = async (payload: {
    payment_method: "cash" | "mpesa" | "credit" | "free";
    amount_received?: number;
    mpesa_reference?: string;
    card_reference?: string;
    notes?: string;
    customer_name?: string;
    customer_phone?: string;
  }): Promise<Sale> => {
    if (activeBill) {
      let targetBillId = activeBill.id;

      // Handle in-flight or temp bill creation seamlessly
      if (targetBillId === 0) {
        if (pendingBillRef.current) {
          try {
            const resolvedBill = await pendingBillRef.current;
            targetBillId = resolvedBill.id;
          } catch {
            // Fallback below
          }
        }
        if (targetBillId === 0) {
          const tableId = activeBill.table_id || activeTable?.id;
          if (!tableId) throw new Error("No table selected for this bill.");
          const createdBill = await restaurantService.createBill(tableId, {
            waiter_name: activeBill.waiter_name || user?.name || "Server",
            guest_count: activeBill.guest_count || 1,
            customer_id: selectedCustomer?.id || (activeBill.customer_id ?? undefined),
            customer_name: selectedCustomer?.name || (activeBill.customer_name ?? undefined),
            customer_phone: selectedCustomer?.phone || (activeBill.customer_phone ?? undefined),
            customer_address: selectedCustomer?.address || (activeBill.customer_address ?? undefined),
            notes: activeBill.notes || undefined,
          });
          targetBillId = createdBill.id;
        }
      }

      // Format current cart items so settleBill can settle all items in one call
      const formattedItems: RestaurantBillItem[] = items.map((it) => {
        const prod = products.find((p) => p.id === it.product_id);
        return {
          product_id: it.product_id,
          product_name: it.product_name,
          category_id: it.category_id || prod?.category_id,
          category_name: it.category_name || prod?.category_name || "Kitchen",
          price_per_kg: it.price_per_kg,
          weight: it.weight,
          unit: it.unit,
          discount: it.discount || 0,
          notes: it.notes || "",
          line_total: it.subtotal,
        };
      });

      const res = await restaurantService.settleBill(targetBillId, {
        payment_method: payload.payment_method,
        amount_received: payload.amount_received,
        mpesa_reference: payload.mpesa_reference,
        customer_id: selectedCustomer?.id || activeBill.customer_id || undefined,
        customer_name: (payload.customer_name && payload.customer_name !== "Complimentary Guest")
          ? payload.customer_name
          : (activeBill.customer_name || selectedCustomer?.name || undefined),
        customer_phone: payload.customer_phone || activeBill.customer_phone || selectedCustomer?.phone || undefined,
        notes: payload.notes,
        items: formattedItems.length > 0 ? formattedItems : undefined,
      });

      // Optimistic floor map table update — immediately free table with zero delay
      const currentTableId = activeTable?.id || activeBill.table_id;
      if (currentTableId) {
        setRestaurantTables((prev) =>
          prev.map((t) => {
            if (t.id !== currentTableId) return t;
            const remainingBills = (t.active_bills || []).filter((b) => b.id !== targetBillId);
            return {
              ...t,
              status: remainingBills.length === 0 ? ("grey" as const) : t.status,
              active_bills: remainingBills,
              active_bills_count: remainingBills.length,
              total_active_amount: remainingBills.reduce((sum, b) => sum + (b.total || 0), 0),
            };
          })
        );
      }

      // Non-blocking cleanup — don't delay the success screen
      clearCart();
      setSelectedCustomer(null);
      const tableToUnlock = activeTable;
      setActiveBill(null);
      setActiveTable(null);
      setHasUnsavedOrder(false);
      setActiveTab("tables");
      if (tableToUnlock) {
        restaurantService.unlockTable(tableToUnlock.id).catch(() => {});
      }
      triggerTableSync();
      // Silently refresh in background — no spinner
      fetchRestaurantTables(true);
      fetchUnpaidSales();
      productsService
        .getProducts({ per_page: 200, status: "active" })
        .then((r) => setProducts(r.data))
        .catch(() => {});

      const settledSale = {
        ...res.data,
        bill_number: res.data?.bill_number || activeBill.bill_number,
        waiter_name: res.data?.waiter_name || activeBill.waiter_name,
        table_number: res.data?.table_number || activeBill.table_number,
      };

      return settledSale;
    }

    const sale = await posService.completeCheckout({
      items,
      payment_method: payload.payment_method,
      amount_received: payload.amount_received,
      customer_id: selectedCustomer?.id || null,
      customer_name: payload.customer_name || selectedCustomer?.name || null,
      customer_phone: payload.customer_phone || selectedCustomer?.phone || null,
      mpesa_reference: payload.mpesa_reference,
      card_reference: payload.card_reference,
      notes: payload.notes,
    });

    clearCart();
    setSelectedCustomer(null);

    // Refresh unpaid sales and catalog stock
    fetchUnpaidSales();
    productsService
      .getProducts({ per_page: 200, status: "active" })
      .then((r) => setProducts(r.data))
      .catch(() => {});

    return sale;
  };

  const handleNewSale = () => {
    setIsCheckoutOpen(false);
    clearCart();
    setSelectedCustomer(null);
    setActiveBill(null);
    setActiveTable(null);
    setHasUnsavedOrder(false);
  };

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);

  const handleSelectCustomer = async (cust: Customer | null) => {
    setSelectedCustomer(cust);

    // If an active bill is open on a restaurant table, sync customer to backend immediately
    if (activeBill) {
      if (activeBill.id > 0) {
        try {
          const payload = {
            customer_id: cust?.id || null,
            customer_name: cust?.name || null,
            customer_phone: cust?.phone || null,
            customer_address: cust?.address || null,
          };
          const res = await restaurantService.updateBillCustomer(activeBill.id, payload);
          if (res.data) {
            handleBillUpdated(res.data);
            triggerTableSync();
          }
        } catch (e: any) {
          console.error("Failed to update bill customer:", e);
        }
      } else {
        // Draft bill: update in-memory bill object directly
        setActiveBill((prev) =>
          prev
            ? {
                ...prev,
                customer_id: cust?.id || undefined,
                customer_name: cust?.name || undefined,
                customer_phone: cust?.phone || undefined,
                customer_address: cust?.address || undefined,
              }
            : null
        );
      }
    }
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditCustomerOpen(true);
  };

  const handleCustomerUpdated = async (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (selectedCustomer?.id === updated.id) {
      setSelectedCustomer(updated);
    }

    if (activeBill && (activeBill.customer_id === updated.id || selectedCustomer?.id === updated.id)) {
      if (activeBill.id > 0) {
        try {
          const res = await restaurantService.updateBillCustomer(activeBill.id, {
            customer_id: updated.id,
            customer_name: updated.name,
            customer_phone: updated.phone || null,
            customer_address: updated.address || null,
          });
          if (res.data) {
            handleBillUpdated(res.data);
            triggerTableSync();
          }
        } catch (e) {
          console.error("Failed to sync updated customer to bill:", e);
        }
      } else {
        setActiveBill((prev) =>
          prev
            ? {
                ...prev,
                customer_id: updated.id,
                customer_name: updated.name,
                customer_phone: updated.phone || undefined,
                customer_address: updated.address || undefined,
              }
            : null
        );
      }
    }
  };

  const handleCustomerDeleted = (customerId: number) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
  };

  const handleCustomerCreated = async (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev.filter((c) => c.id !== newCustomer.id)]);
    setSelectedCustomer(newCustomer);
    setIsAddCustomerOpen(false);

    if (activeBill) {
      if (activeBill.id > 0) {
        try {
          const res = await restaurantService.updateBillCustomer(activeBill.id, {
            customer_id: newCustomer.id,
            customer_name: newCustomer.name,
            customer_phone: newCustomer.phone || null,
            customer_address: newCustomer.address || null,
          });
          if (res.data) {
            handleBillUpdated(res.data);
            triggerTableSync();
          }
        } catch (e) {
          console.error("Failed to assign new customer to bill:", e);
        }
      } else {
        setActiveBill((prev) =>
          prev
            ? {
                ...prev,
                customer_id: newCustomer.id,
                customer_name: newCustomer.name,
                customer_phone: newCustomer.phone || undefined,
                customer_address: newCustomer.address || undefined,
              }
            : null
        );
      }
    }
  };

  const handleOpenSettle = (sale?: Sale) => {
    if (sale) {
      setSaleToSettle(sale);
      setIsSettleModalOpen(true);
    } else if (unpaidSales.length === 1) {
      setSaleToSettle(unpaidSales[0]);
      setIsSettleModalOpen(true);
    } else if (unpaidSales.length > 1) {
      setIsPickerOpen(true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden select-none relative bg-[#f8fafc]">
      {/* Left Column: Product Selection Grid or Floor Tables */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        {/* Top Tab Bar: Products/Menu vs Floor Tables (restaurant only) */}
        {!(activeTab === "tables" && isFloorHeaderHidden) && (
          <div className="px-4 py-2.5 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  if (isRestaurant && !activeBill) {
                    alert({
                      title: "Open a Table Bill First",
                      message: "Please select a table and open or create a bill from Floor Tables to view the menu and order dishes.",
                      type: "warning",
                    });
                    return;
                  }
                  setActiveTab("products");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isRestaurant && !activeBill
                    ? "opacity-60 cursor-not-allowed text-zinc-400"
                    : activeTab === "products"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                title={isRestaurant && !activeBill ? "Select a table and open a bill first to order dishes" : "Menu & Dishes"}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRestaurant ? "Menu & Dishes" : isClothing ? "Products & Items" : "Products & Cuts"}</span>
                {isRestaurant && !activeBill && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-500">
                    Open bill first
                  </span>
                )}
              </button>

              {/* Floor Tables tab — restaurant owners only */}
              {isRestaurant && (
                <button
                  type="button"
                  onClick={async () => {
                    if (activeBill) {
                      await handlePromptExitActiveTable();
                      return;
                    }
                    setActiveTab("tables");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeTab === "tables"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                  title={activeBill ? "Exit table to return to Floor Tables" : "Floor Tables"}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Floor Tables</span>
                  {restaurantTables.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-zinc-200 text-zinc-700">
                      {restaurantTables.length}
                    </span>
                  )}
                  {restaurantTables.some((t) => t.status === "red") && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Active unprinted orders" />
                  )}
                  {restaurantTables.some((t) => t.status === "yellow") && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Bills printed awaiting payment" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeBill && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-950">
                    Table {activeBill.table_number} ({activeBill.bill_number})
                  </span>
                  {hasUnsavedOrder && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                      Unsaved
                    </span>
                  )}
                </div>
              )}

              {/* Receipt printer setup button */}
              <button
                type="button"
                onClick={() => setIsPrinterSettingsOpen(true)}
                className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Receipt Printer Settings (QZ Tray)"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Receipt Printer</span>
              </button>
            </div>
          </div>
        )}

        {/* View Selection: Products vs Tables (tables only for restaurant) */}
        {activeTab === "tables" && isRestaurant ? (
          <div className="flex-1 overflow-hidden">
            <TableMapView
              tables={restaurantTables}
              activeTableId={activeTable?.id}
              onSelectTable={(table) => {
                selectedTableForModalRef.current = table;
                setSelectedTableForModal(table);
                setIsTableModalOpen(true);
              }}
              onRefresh={fetchRestaurantTables}
              onOpenAddTableModal={() => setIsAddTableModalOpen(true)}
              onDeleteTable={handleDeleteTable}
              isLoading={isTablesLoading}
              isHeaderHidden={isFloorHeaderHidden}
              onToggleHideHeader={handleToggleHideFloorHeader}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {/* Shift Closed Warning Banner */}
            {!isShiftLoading && !isShiftOpen && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-800 shadow-2xs shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Shift Closed:</strong> Open your cashier shift to track cash drawer balances.
                  </span>
                </div>
                <Link
                  href="/shift"
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors shrink-0"
                >
                  Open Shift
                </Link>
              </div>
            )}

            {/* Catalog Load Failure Banner */}
            {loadError && products.length === 0 && !isLoading && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between text-xs text-red-800 shadow-2xs shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{loadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg transition-colors shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <ProductGrid
              products={products}
              categories={categories}
              onSelectProduct={handleSelectProduct}
              isLoading={isLoading}
              isRestaurant={isRestaurant}
              isClothing={isClothing}
              canDrag={isSuperAdmin}
              onUpdateProduct={(productId, patch) => {
                setProducts((prev) =>
                  prev.map((p) => (p.id === productId ? { ...p, ...patch } : p))
                );
              }}
            />
          </div>
        )}
      </div>

      {/* Right Column: Desktop Cart — hidden when Floor Tables tab is active */}
      {activeTab !== "tables" && (
      <div className="hidden lg:flex w-96 xl:w-[400px] h-full shrink-0">
        <CartPane
          key={activeBill ? `bill_${activeBill.id}_${activeBill.table_id}` : "no_bill"}
          items={items}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          total={total}
          totalWeight={totalWeight}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleSelectCustomer}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onEditCustomer={handleOpenEditCustomer}
          onAdjustWeight={handleAdjustWeight}
          onOpenWeightEdit={(item) => setEditingCartItem(item)}
          onUpdateDiscount={handleUpdateDiscount}
          onRemoveItem={handleRemoveItem}
          onClearCart={clearCart}
          onProceedCheckout={handleProceedCheckout}
          isShiftOpen={isShiftOpen}
          isRestaurant={isRestaurant}
          isClothing={isClothing}
          heldCount={heldCount}
          onOpenHeldOrders={() => setIsHeldOrdersOpen(true)}
          onHoldOrder={handleHoldOrder}
          onNewBill={handleNewBill}
          unpaidCount={unpaidCount}
          onOpenUnpaidOrders={() => handleOpenSettle()}
          activeTable={activeTable}
          activeBill={isRestaurant ? activeBill : null}
          hasUnsavedOrder={isRestaurant ? hasUnsavedOrder : false}
          isSavingOrder={isSavingOrder}
          onSaveOrder={isRestaurant ? async () => { await handleSaveOrder(); } : undefined}
          onPrintCustomerBill={isRestaurant ? () => handlePrintCustomerBill() : undefined}
          onCloseActiveBillSession={isRestaurant ? handlePromptExitActiveTable : undefined}
          onManageTableBills={isRestaurant ? handleOpenCurrentTableBillsModal : undefined}
        />
      </div>
      )}

      {/* Mobile Floating Cart Bar — hidden when Floor Tables tab is active */}
      {activeTab !== "tables" && (
      <div className="lg:hidden p-3 bg-white border-t border-slate-200 shadow-lg sticky bottom-0 z-20 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white relative shadow-xs">
            <ShoppingBag className="w-5 h-5" />
            {itemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
                {itemsCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900 tabular-nums">
              {formatCurrency(total)}
            </div>
            <div className="text-[10px] text-zinc-500">
              {itemsCount} {isRestaurant || activeBill ? (itemsCount !== 1 ? "items" : "item") : (itemsCount !== 1 ? "cuts" : "cut")}
              {!isRestaurant && ` • ${formatWeight(totalWeight)}`}
              {activeBill && ` • Table ${activeBill.table_number}`}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {activeBill && hasUnsavedOrder ? (
            <button
              type="button"
              disabled={itemsCount === 0 || isSavingOrder}
              onClick={handleSaveOrder}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{isSavingOrder ? "Saving..." : "Save Order"}</span>
            </button>
          ) : isWaiter ? (
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Order</span>
            </button>
          ) : (
            <>
              {heldCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsHeldOrdersOpen(true)}
                  className="px-2.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{heldCount}</span>
                </button>
              )}

              <button
                type="button"
                disabled={itemsCount === 0}
                onClick={() => handleProceedCheckout()}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all"
              >
                Checkout
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white select-none w-full max-w-full overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 w-full min-w-0">
            <span className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0 mr-2">
              {activeBill ? `Table ${activeBill.table_number} Bill` : "Current Order"} ({itemsCount} items)
            </span>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0">
            <CartPane
              key={activeBill ? `mobile_bill_${activeBill.id}_${activeBill.table_id}` : "mobile_no_bill"}
              items={items}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              total={total}
              totalWeight={totalWeight}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={handleSelectCustomer}
              onOpenAddCustomer={() => {
                setIsMobileCartOpen(false);
                setIsAddCustomerOpen(true);
              }}
              onEditCustomer={(customer) => {
                setIsMobileCartOpen(false);
                handleOpenEditCustomer(customer);
              }}
              onAdjustWeight={handleAdjustWeight}
              onOpenWeightEdit={(item) => {
                setIsMobileCartOpen(false);
                setEditingCartItem(item);
              }}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={clearCart}
              onProceedCheckout={(method) => {
                setIsMobileCartOpen(false);
                handleProceedCheckout(method);
              }}
              isShiftOpen={isShiftOpen}
              isRestaurant={isRestaurant}
              isClothing={isClothing}
              heldCount={heldCount}
              onOpenHeldOrders={() => {
                setIsMobileCartOpen(false);
                setIsHeldOrdersOpen(true);
              }}
              onHoldOrder={() => {
                setIsMobileCartOpen(false);
                handleHoldOrder();
              }}
              onNewBill={() => {
                setIsMobileCartOpen(false);
                handleNewBill();
              }}
              unpaidCount={unpaidCount}
              onOpenUnpaidOrders={() => {
                setIsMobileCartOpen(false);
                handleOpenSettle();
              }}
              activeTable={activeTable}
              activeBill={isRestaurant ? activeBill : null}
              hasUnsavedOrder={isRestaurant ? hasUnsavedOrder : false}
              isSavingOrder={isSavingOrder}
              onSaveOrder={isRestaurant ? async () => {
                await handleSaveOrder();
                setIsMobileCartOpen(false);
              } : undefined}
              onPrintCustomerBill={isRestaurant ? () => {
                handlePrintCustomerBill();
                setIsMobileCartOpen(false);
              } : undefined}
              onCloseActiveBillSession={isRestaurant ? () => {
                setIsMobileCartOpen(false);
                handlePromptExitActiveTable();
              } : undefined}
              onManageTableBills={isRestaurant ? () => {
                setIsMobileCartOpen(false);
                handleOpenCurrentTableBillsModal();
              } : undefined}
            />
          </div>
        </div>
      )}

      {/* Weight Modal for Product Selection */}
      {selectedProductForWeight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setSelectedProductForWeight(null)}
          />
          <div className="relative z-10">
            <WeightInput
              productName={selectedProductForWeight.name}
              pricePerKg={selectedProductForWeight.price_per_kg}
              availableStock={selectedProductForWeight.current_stock}
              initialWeight={1.0}
              unit={selectedProductForWeight.unit}
              onConfirm={handleConfirmWeight}
              onCancel={() => setSelectedProductForWeight(null)}
            />
          </div>
        </div>
      )}

      {/* Weight Modal for Editing Cart Item */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setEditingCartItem(null)}
          />
          <div className="relative z-10">
            <WeightInput
              productName={editingCartItem.product_name}
              pricePerKg={editingCartItem.price_per_kg}
              availableStock={editingCartItem.available_stock}
              initialWeight={editingCartItem.weight}
              unit={editingCartItem.unit}
              onConfirm={handleConfirmEditWeight}
              onCancel={() => setEditingCartItem(null)}
            />
          </div>
        </div>
      )}

      {/* Table Bills Pop-up Modal */}
      {isTableModalOpen && selectedTableForModal && (
        <TableBillsModal
          key={selectedTableForModal.id}
          table={selectedTableForModal}
          isOpen={isTableModalOpen}
          onClose={() => {
            selectedTableForModalRef.current = null;
            setIsTableModalOpen(false);
            setSelectedTableForModal(null);
          }}
          onOpenBillForOrdering={handleOpenBillForOrdering}
          onCreateNewBill={handleCreateNewBill}
          onPrintCustomerBill={handlePrintCustomerBill}
          onSettleBill={handleSettleFromTableModal}
          onCancelBill={handleCancelBill}
          onPrintKitchenSlip={(b, productId) => {
            setIsSlipReprint(true);
            setReprintProductId(productId);
            setPrintingKitchenBill(b);
          }}
          customers={customers}
          onBillUpdated={handleBillUpdated}
          allTables={restaurantTables}
        />
      )}

      {/* Add New Table Modal */}
      <AddTableModal
        isOpen={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        onAddTable={handleAddTable}
      />

      {/* Kitchen Order Ticket (KOT) Slip Print */}
      <KitchenOrderSlipModal
        bill={printingKitchenBill}
        isOpen={!!printingKitchenBill}
        onClose={() => {
          setPrintingKitchenBill(null);
          setReprintProductId(undefined);
          setIsSlipReprint(false);
        }}
        autoPrint={true}
        isReprint={isSlipReprint}
        initialProductId={reprintProductId}
        products={products}
      />

      {/* Customer Pre-Settlement Bill Slip Print */}
      <CustomerPreBillModal
        bill={printingCustomerBill}
        isOpen={!!printingCustomerBill}
        onClose={() => setPrintingCustomerBill(null)}
        autoPrint={true}
        isReprint={printingCustomerBill?.status === "printed" || Boolean(printingCustomerBill?.bill_printed_at)}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={items}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          total={total}
          customer={selectedCustomer}
          defaultCustomerName={activeBill?.customer_name || undefined}
          defaultCustomerPhone={activeBill?.customer_phone || undefined}
          isRestaurant={isRestaurant}
          tableNumber={activeBill?.table_number ? String(activeBill.table_number) : (activeTable ? String(activeTable.table_number) : undefined)}
          initialMethod={initialPaymentMethod}
          onCompleteSale={handleCompleteSale}
          onViewReceipt={(sale) => {
            setAutoPrintReceipt(false);
            setViewingReceiptSale(sale);
          }}
          onPrintReceipt={(sale) => {
            setAutoPrintReceipt(true);
            setViewingReceiptSale(sale);
          }}
          onNewSale={handleNewSale}
        />
      )}

      {/* Held Orders Modal */}
      <HeldOrdersModal
        isOpen={isHeldOrdersOpen}
        onClose={() => setIsHeldOrdersOpen(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeHeldOrder}
        onRemoveOrder={removeHeldOrder}
        onNewBill={handleNewBill}
        hasActiveCartItems={items.length > 0}
      />

      {/* Unpaid Orders Picker */}
      <UnpaidOrdersPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        unpaidSales={unpaidSales}
        onSelectSale={(sale) => {
          setSaleToSettle(sale);
          setIsSettleModalOpen(true);
        }}
      />

      {/* Settle Payment Modal */}
      <SettlePaymentModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSaleToSettle(null);
        }}
        sale={saleToSettle}
        onPaymentSettled={(updatedSale) => {
          fetchUnpaidSales();
          fetchRestaurantTables(true);
        }}
        onViewReceipt={(sale) => {
          setAutoPrintReceipt(false);
          setViewingReceiptSale(sale);
        }}
        onPrintReceipt={(sale) => {
          setAutoPrintReceipt(true);
          setViewingReceiptSale(sale);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingReceiptSale}
        sale={viewingReceiptSale}
        onClose={() => {
          setViewingReceiptSale(null);
          setAutoPrintReceipt(false);
        }}
        autoPrint={autoPrintReceipt}
        isReprint={!autoPrintReceipt}
      />

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditCustomerOpen}
        customer={editingCustomer}
        onClose={() => {
          setIsEditCustomerOpen(false);
          setEditingCustomer(null);
        }}
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerDeleted}
      />

      {/* Receipt Printer Setup Modal (QZ Tray) */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </div>
  );
}
