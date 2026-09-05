"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Product, Category, Customer, Sale, CartItem } from "@/types";
import { productsService } from "@/services/products.service";
import { customersService } from "@/services/customers.service";
import { posService } from "@/services/pos.service";
import { useCart } from "@/hooks/useCart";
import { useShift } from "@/hooks/useShift";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPane } from "@/components/pos/CartPane";
import { WeightInput } from "@/components/shared/WeightInput";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { ShoppingBag, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals state
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"cash" | "mpesa" | "card">("cash");
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Hooks
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
  } = useCart();

  const { isShiftOpen } = useShift();

  const loadData = useCallback(async () => {
    try {
      const [cats, prodsRes, custsRes] = await Promise.all([
        productsService.getCategories(),
        productsService.getProducts({ per_page: 100, status: "active" }),
        customersService.getCustomers({ per_page: 50 }),
      ]);
      setCategories(cats);
      setProducts(prodsRes.data);
      setCustomers(custsRes.data);
    } catch (e) {
      console.error("Failed to load POS data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleDataChange = () => loadData();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => window.removeEventListener("butcher:data-change", handleDataChange);
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

  const handleProceedCheckout = (preferredMethod: "cash" | "mpesa" | "card" = "cash") => {
    setInitialPaymentMethod(preferredMethod);
    setIsCheckoutOpen(true);
    setIsMobileCartOpen(false);
  };

  const handleCompleteSale = async (payload: {
    payment_method: "cash" | "mpesa" | "card";
    amount_received?: number;
    mpesa_reference?: string;
    card_reference?: string;
  }) => {
    const sale = await posService.completeCheckout({
      items,
      payment_method: payload.payment_method,
      amount_received: payload.amount_received,
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || null,
      customer_phone: selectedCustomer?.phone || null,
      mpesa_reference: payload.mpesa_reference,
    });

    clearCart();
    setSelectedCustomer(null);
    return sale;
  };

  const handleNewSale = () => {
    setIsCheckoutOpen(false);
    clearCart();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden select-none relative bg-[#f8fafc]">
      {/* Shift Closed Warning Banner */}
      {!isShiftOpen && (
        <div className="absolute top-0 inset-x-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-800 shadow-2xs">
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

      {/* Left Column: Product Selection Grid */}
      <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <ProductGrid
          products={products}
          categories={categories}
          onSelectProduct={handleSelectProduct}
        />
      </div>

      {/* Right Column: Desktop Current Sale Cart */}
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

        <button
          type="button"
          disabled={itemsCount === 0}
          onClick={() => handleProceedCheckout()}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all"
        >
          Checkout
        </button>
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

      {/* Weight Modal for Editing Existing Cart Item */}
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
        onViewReceipt={(sale) => setViewingReceiptSale(sale)}
        onPrintReceipt={(sale) => {
          setViewingReceiptSale(sale);
          setTimeout(() => window.print(), 300);
        }}
        onNewSale={handleNewSale}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingReceiptSale}
        sale={viewingReceiptSale}
        onClose={() => setViewingReceiptSale(null)}
      />
    </div>
  );
}
