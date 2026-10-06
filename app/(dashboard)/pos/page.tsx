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

  // In restaurant mode, cashier starts on Floor Tables and only goes to Menu & Dishes when an active bill is opened
  useEffect(() => {
    if (isRestaurant && !activeBill) {
      setActiveTab("tables");
    }
  }, [isRestaurant, activeBill]);

  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
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

  // Load tables
  const fetchRestaurantTables = useCallback(async () => {
    try {
      setIsTablesLoading(true);
      const data = await restaurantService.getTables();
      setRestaurantTables(data);
      // If we have an active table, update its reference
      if (activeTable) {
        const found = data.find((t) => t.id === activeTable.id);
        if (found) {
          setActiveTable(found);
          if (activeBill) {
            const foundBill = found.active_bills?.find((b) => b.id === activeBill.id);
            if (foundBill) setActiveBill(foundBill);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load tables:", e);
    } finally {
      setIsTablesLoading(false);
    }
  }, [activeTable, activeBill]);

  // Load unpaid / pay-later sales
  const fetchUnpaidSales = useCallback(async () => {
    try {
      const res = await salesService.getSales({ payment_status: "pending", per_page: 50 });
      if (res && Array.isArray(res.data)) {
        setUnpaidSales(res.data);
        setUnpaidCount(res.total || res.data.length);
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
    updateDiscount(id, discount);
    if (activeBill) {
      setHasUnsavedOrder(true);
    }
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
    if (activeBill) {
      setHasUnsavedOrder(true);
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

  // Start a new blank bill
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
    if (activeBill && (!activeBill.items || activeBill.items.length === 0 || activeBill.total === 0)) {
      try {
        await restaurantService.cancelBill(activeBill.id, "Empty bill discarded");
      } catch (e) {
        console.error("Clean up empty bill error:", e);
      }
    }
    clearCart();
    setSelectedCustomer(null);
    setActiveBill(null);
    setActiveTable(null);
    setHasUnsavedOrder(false);
    fetchRestaurantTables();
  };

  // Restaurant: Open Bill for Ordering
  const handleOpenBillForOrdering = (table: RestaurantTable, bill: RestaurantBill) => {
    setActiveTable(table);
    setActiveBill(bill);

    // Map existing bill items to CartItem format
    if (bill.items && bill.items.length > 0) {
      const cartItems: CartItem[] = bill.items.map((it, idx) => {
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
      });
      restoreItems(cartItems);
    } else {
      clearCart();
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
    } else {
      setSelectedCustomer(null);
    }

    setHasUnsavedOrder(false);
    setActiveTab("products");
  };

  // Restaurant: Create a new bill on a table
  const handleCreateNewBill = async (
    table: RestaurantTable,
    payload: {
      waiter_name?: string;
      waiter_pin?: string;
      guest_count?: number;
      customer_name?: string;
      customer_phone?: string;
      notes?: string;
    }
  ) => {
    try {
      const newBill = await restaurantService.createBill(table.id, payload);
      await fetchRestaurantTables();
      handleOpenBillForOrdering(table, newBill);
      setIsTableModalOpen(false);
    } catch (e: any) {
      console.error("Create bill error:", e);
      alert({
        title: "Failed to Open Bill",
        message: e?.response?.data?.message || e?.message || "Could not create bill on this table.",
        type: "danger",
      });
    }
  };

  // Restaurant: Save Order & Print KOT Kitchen Receipt
  const handleSaveOrder = async () => {
    if (!activeBill) return;
    if (items.length === 0) {
      alert({
        title: "Cart is Empty",
        message: "Please post products to the bill before saving.",
        type: "warning",
      });
      return;
    }

    try {
      setIsSavingOrder(true);
      // Identify only the newly added / unsaved items for this KOT print round
      const newItems = items.filter((it) => !it.is_saved);

      const formattedItems: RestaurantBillItem[] = items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        price_per_kg: it.price_per_kg,
        weight: it.weight,
        unit: it.unit,
        discount: it.discount || 0,
        notes: it.notes || "",
        line_total: it.subtotal,
      }));

      const res = await restaurantService.saveOrder(activeBill.id, {
        items: formattedItems,
        customer_id: selectedCustomer?.id || undefined,
        customer_name: selectedCustomer?.name || activeBill.customer_name || undefined,
        customer_phone: selectedCustomer?.phone || activeBill.customer_phone || undefined,
        waiter_name: activeBill.waiter_name,
        guest_count: activeBill.guest_count,
        notes: activeBill.notes || undefined,
      });

      // Mark all items in the cart as saved/read-only now
      const allSavedCartItems: CartItem[] = items.map((it) => ({
        ...it,
        is_saved: true,
      }));
      restoreItems(allSavedCartItems);

      setActiveBill(res.data);
      setHasUnsavedOrder(false);

      // Only print newly posted items on this round's KOT slip
      const itemsForSlip: RestaurantBillItem[] = (newItems.length > 0 ? newItems : items).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        price_per_kg: it.price_per_kg,
        weight: it.weight,
        unit: it.unit,
        discount: it.discount || 0,
        notes: it.notes || "",
        line_total: it.subtotal,
      }));

      const billForKitchenSlip: RestaurantBill = {
        ...res.data,
        items: itemsForSlip,
      };

      // Show & auto-print the Kitchen Order Ticket for the newly posted items
      setIsSlipReprint(false);
      setReprintProductId(undefined);
      setPrintingKitchenBill(billForKitchenSlip);
      fetchRestaurantTables();
    } catch (e: any) {
      console.error("Save order error:", e);
      alert({
        title: "Failed to Save Order",
        message: e?.response?.data?.message || e?.message || "An error occurred while saving the order.",
        type: "danger",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Restaurant: Print Pre-Settlement Customer Bill (Yellow status)
  const handlePrintCustomerBill = async (bill?: RestaurantBill) => {
    const targetBill = bill || activeBill;
    if (!targetBill) return;

    if (!targetBill.items || targetBill.items.length === 0) {
      alert({
        title: "Empty Bill",
        message: "Cannot print an empty bill. Please post products and save the order first.",
        type: "warning",
      });
      return;
    }

    try {
      const res = await restaurantService.printBill(targetBill.id);
      if (activeBill && activeBill.id === targetBill.id) {
        setActiveBill(res.data);
      }
      // Pop up and auto-print Guest Bill
      setPrintingCustomerBill(res.data);
      fetchRestaurantTables();
    } catch (e: any) {
      console.error("Print bill error:", e);
      alert({
        title: "Print Bill Error",
        message: e?.response?.data?.message || e?.message || "Failed to mark bill as printed.",
        type: "danger",
      });
    }
  };

  // Restaurant: Cancel Bill
  const handleCancelBill = async (bill: RestaurantBill) => {
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
      fetchRestaurantTables();
    } catch (e: any) {
      console.error("Cancel bill error:", e);
      alert({
        title: "Error Cancelling Bill",
        message: e?.response?.data?.message || e?.message || "Could not cancel this bill.",
        type: "danger",
      });
    }
  };

  // Restaurant: Exit the active table session and return to Floor Tables
  const handleCloseActiveBillSession = useCallback(async () => {
    if (activeBill && (!activeBill.items || activeBill.items.length === 0 || activeBill.total === 0)) {
      try {
        await restaurantService.cancelBill(activeBill.id, "Empty bill exited without saving");
      } catch (e) {
        console.error("Clean up empty bill error:", e);
      }
    }
    setActiveBill(null);
    setActiveTable(null);
    clearCart();
    setHasUnsavedOrder(false);
    setIsMobileCartOpen(false);
    setActiveTab("tables");
    fetchRestaurantTables();
  }, [activeBill, clearCart, fetchRestaurantTables]);

  const handlePromptExitActiveTable = async () => {
    if (!activeBill) {
      setActiveTab("tables");
      return;
    }
    const confirmed = await confirm({
      title: "Exit Table Session?",
      message: `You are currently ordering on Table ${activeBill.table_number} (${activeBill.bill_number}). You must exit this table before returning to the Floor Tables view. Exit now?`,
      confirmText: "Yes, Exit Table",
      cancelText: "No, Stay on Order",
      type: "warning",
    });
    if (confirmed) {
      handleCloseActiveBillSession();
    }
  };

  // Restaurant: Open the Table Bills modal for the currently active table to add a new bill or switch bills
  const handleOpenCurrentTableBillsModal = async () => {
    if (!activeTable) return;
    if (hasUnsavedOrder) {
      const proceed = await confirm({
        title: "Unsaved Order on Current Bill",
        message: "You have unsaved items on the current bill. Would you like to manage bills or add a new bill on this table?",
        confirmText: "Manage Bills",
        cancelText: "Stay on Current Bill",
        type: "warning",
      });
      if (!proceed) return;
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
      fetchRestaurantTables();
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
      fetchRestaurantTables();
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
    if (activeBill && hasUnsavedOrder) {
      const proceed = await confirm({
        title: "Unsaved Order",
        message:
          "You have added products that haven't been saved. Would you like to save the order and print the kitchen receipt now before checkout?",
        confirmText: "Save Order & Checkout",
        cancelText: "Cancel",
        type: "warning",
      });
      if (proceed) {
        await handleSaveOrder();
      } else {
        return;
      }
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
      const res = await restaurantService.settleBill(activeBill.id, {
        payment_method: payload.payment_method,
        amount_received: payload.amount_received,
        mpesa_reference: payload.mpesa_reference,
        customer_id: selectedCustomer?.id || activeBill.customer_id || undefined,
        customer_name: payload.customer_name || selectedCustomer?.name || activeBill.customer_name || undefined,
        customer_phone: payload.customer_phone || selectedCustomer?.phone || activeBill.customer_phone || undefined,
        notes: payload.notes,
      });

      clearCart();
      setSelectedCustomer(null);
      setActiveBill(null);
      setActiveTable(null);
      setHasUnsavedOrder(false);
      setActiveTab("tables");
      fetchRestaurantTables();
      fetchUnpaidSales();
      productsService
        .getProducts({ per_page: 200, status: "active" })
        .then((r) => setProducts(r.data))
        .catch(() => {});

      return res.data;
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

  const handleOpenEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditCustomerOpen(true);
  };

  const handleCustomerUpdated = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (selectedCustomer?.id === updated.id) {
      setSelectedCustomer(updated);
    }
  };

  const handleCustomerDeleted = (customerId: number) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev.filter((c) => c.id !== newCustomer.id)]);
    setSelectedCustomer(newCustomer);
    setIsAddCustomerOpen(false);
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
              <span>{isRestaurant ? "Menu & Dishes" : "Products & Cuts"}</span>
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

        {/* View Selection: Products vs Tables (tables only for restaurant) */}
        {activeTab === "tables" && isRestaurant ? (
          <div className="flex-1 overflow-hidden">
            <TableMapView
              tables={restaurantTables}
              activeTableId={activeTable?.id}
              onSelectTable={(table) => {
                setSelectedTableForModal(table);
                setIsTableModalOpen(true);
              }}
              onRefresh={fetchRestaurantTables}
              onOpenAddTableModal={() => setIsAddTableModalOpen(true)}
              onDeleteTable={handleDeleteTable}
              isLoading={isTablesLoading}
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
            />
          </div>
        )}
      </div>

      {/* Right Column: Desktop Cart — hidden when Floor Tables tab is active */}
      {activeTab !== "tables" && (
      <div className="hidden lg:flex w-96 xl:w-[400px] h-full shrink-0">
        <CartPane
          items={items}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          total={total}
          totalWeight={totalWeight}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
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
          onSaveOrder={isRestaurant ? handleSaveOrder : undefined}
          onPrintCustomerBill={isRestaurant ? () => handlePrintCustomerBill() : undefined}
          onCloseActiveBillSession={isRestaurant ? handleCloseActiveBillSession : undefined}
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
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{isSavingOrder ? "Saving..." : "Save Order"}</span>
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
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white select-none">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-bold text-slate-900">
              {activeBill ? `Table ${activeBill.table_number} Bill` : "Current Order"} ({itemsCount} items)
            </span>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CartPane
              items={items}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              total={total}
              totalWeight={totalWeight}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
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
              onCloseActiveBillSession={isRestaurant ? handleCloseActiveBillSession : undefined}
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
      <TableBillsModal
        table={selectedTableForModal}
        isOpen={isTableModalOpen}
        onClose={() => {
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
      />

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
      />

      {/* Customer Pre-Settlement Bill Slip Print */}
      <CustomerPreBillModal
        bill={printingCustomerBill}
        isOpen={!!printingCustomerBill}
        onClose={() => setPrintingCustomerBill(null)}
        autoPrint={true}
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
          fetchRestaurantTables();
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
