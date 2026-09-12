"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Product, Category, Customer, Sale, CartItem, HeldOrder } from "@/types";
import { productsService } from "@/services/products.service";
import { customersService } from "@/services/customers.service";
import { posService } from "@/services/pos.service";
import { salesService } from "@/services/sales.service";
import { useCart } from "@/hooks/useCart";
import { useShift } from "@/hooks/useShift";
import { useHeldOrders } from "@/hooks/useHeldOrders";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPane } from "@/components/pos/CartPane";
import { WeightInput } from "@/components/shared/WeightInput";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { HeldOrdersModal } from "@/components/pos/HeldOrdersModal";
import { SettlePaymentModal } from "@/components/pos/SettlePaymentModal";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { ShoppingBag, AlertTriangle, Clock, Bookmark } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSystemDialog } from "@/contexts/DialogContext";

export default function PosPage() {
  const router = useRouter();
  const { confirm, alert } = useSystemDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Modals state
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"cash" | "mpesa" | "card" | "credit">("cash");
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Held Orders State
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);

  // Pay Later / Settle Modal State
  const [unpaidSales, setUnpaidSales] = useState<Sale[]>([]);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [saleToSettle, setSaleToSettle] = useState<Sale | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

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

  // Fetch all POS data once — sequential to avoid overwhelming the PHP dev server
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    try {
      const cats = await productsService.getCategories();
      setCategories(Array.isArray(cats) ? cats : []);

      const prodsRes = await productsService.getProducts({ per_page: 200, status: "active" });
      setProducts(Array.isArray(prodsRes?.data) ? prodsRes.data : []);

      const custsRes = await customersService.getCustomers({ per_page: 50 });
      setCustomers(Array.isArray(custsRes?.data) ? custsRes.data : []);

      await fetchUnpaidSales();
    } catch (e: any) {
      const msg = e?.message || "Failed to load POS catalog.";
      console.error("Failed to load POS data:", msg, e);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchUnpaidSales]);

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
    }
  };

  const handleConfirmEditWeight = (weightKg: number) => {
    if (editingCartItem) {
      updateWeight(editingCartItem.id, weightKg);
      setEditingCartItem(null);
    }
  };

  // Hold current order so cashier can attend to other waiting customers
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
    clearCart();
    setSelectedCustomer(null);
  };

  const handleProceedCheckout = async (preferredMethod: "cash" | "mpesa" | "card" | "credit" = "cash") => {
    if (!isShiftOpen) {
      const shouldOpen = await confirm({
        title: "Cashier Shift Closed",
        message:
          "You must open your register shift and enter your opening cash float before making any orders so your drawer is balanced.\n\nWould you like to open your shift now?",
        confirmText: "Open Shift Now",
        cancelText: "Stay on POS",
        type: "warning",
      });
      if (shouldOpen) {
        router.push("/shift");
      }
      return;
    }

    setInitialPaymentMethod(preferredMethod);
    setIsCheckoutOpen(true);
    setIsMobileCartOpen(false);
  };

  const handleCompleteSale = async (payload: {
    payment_method: "cash" | "mpesa" | "card" | "credit";
    amount_received?: number;
    mpesa_reference?: string;
    card_reference?: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
  }) => {
    if (!isShiftOpen) {
      await alert({
        title: "Shift Required",
        message: "You must open your cashier shift before completing sales.",
        type: "danger",
      });
      throw new Error("Shift is closed. Please open your shift first.");
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
      .catch(() => { });

    return sale;
  };

  const handleNewSale = () => {
    setIsCheckoutOpen(false);
    clearCart();
    setSelectedCustomer(null);
  };

  const handleOpenSettle = (sale?: Sale) => {
    if (sale) {
      setSaleToSettle(sale);
      setIsSettleModalOpen(true);
    } else if (unpaidSales.length > 0) {
      setSaleToSettle(unpaidSales[0]);
      setIsSettleModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden select-none relative bg-[#f8fafc]">
      {/* Left Column: Product Selection Grid */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
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

      {/* Right Column: Desktop Cart */}
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
          onAdjustWeight={adjustWeightBy}
          onOpenWeightEdit={(item) => setEditingCartItem(item)}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onProceedCheckout={handleProceedCheckout}
          isShiftOpen={isShiftOpen}
          heldCount={heldCount}
          onOpenHeldOrders={() => setIsHeldOrdersOpen(true)}
          onHoldOrder={handleHoldOrder}
          onNewBill={handleNewBill}
          unpaidCount={unpaidCount}
          onOpenUnpaidOrders={() => handleOpenSettle()}
        />
      </div>

      {/* Mobile Floating Cart Bar */}
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
              {itemsCount} cuts • {formatWeight(totalWeight)}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white select-none">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-bold text-slate-900">Current Sale ({itemsCount} items)</span>
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
              onAdjustWeight={adjustWeightBy}
              onOpenWeightEdit={(item) => {
                setIsMobileCartOpen(false);
                setEditingCartItem(item);
              }}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onProceedCheckout={(method) => {
                setIsMobileCartOpen(false);
                handleProceedCheckout(method);
              }}
              isShiftOpen={isShiftOpen}
              heldCount={heldCount}
              onOpenHeldOrders={() => {
                setIsMobileCartOpen(false);
                setIsHeldOrdersOpen(true);
              }}
              onHoldOrder={() => {
                handleHoldOrder();
                setIsMobileCartOpen(false);
              }}
              onNewBill={() => {
                handleNewBill();
                setIsMobileCartOpen(false);
              }}
              unpaidCount={unpaidCount}
              onOpenUnpaidOrders={() => {
                setIsMobileCartOpen(false);
                handleOpenSettle();
              }}
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
              onConfirm={handleConfirmEditWeight}
              onCancel={() => setEditingCartItem(null)}
            />
          </div>
        </div>
      )}

      {/* Checkout Modal */}
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
    </div>
  );
}
