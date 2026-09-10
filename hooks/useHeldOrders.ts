"use client";

import { useState, useEffect, useCallback } from "react";
import { HeldOrder, CartItem, Customer } from "@/types";

const HELD_ORDERS_KEY = "butcher_held_orders";

export function useHeldOrders() {
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HELD_ORDERS_KEY);
      if (stored) {
        setHeldOrders(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse held orders from storage:", e);
    }
    setIsLoaded(true);
  }, []);

  // Sync to localStorage
  const saveHeldOrders = useCallback((orders: HeldOrder[]) => {
    setHeldOrders(orders);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(orders));
      } catch (e) {
        console.error("Failed to save held orders to storage:", e);
      }
    }
  }, []);

  const holdCurrentOrder = useCallback(
    (data: {
      items: CartItem[];
      customer: Customer | null;
      subtotal: number;
      totalDiscount: number;
      total: number;
      totalWeight: number;
      reference?: string;
      notes?: string;
    }): HeldOrder => {
      const id = `held_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fallbackRef = data.customer?.name
        ? `Order - ${data.customer.name}`
        : `Bill #${heldOrders.length + 1} (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;

      const newHeldOrder: HeldOrder = {
        id,
        reference: data.reference?.trim() || fallbackRef,
        items: data.items,
        customer: data.customer,
        subtotal: data.subtotal,
        totalDiscount: data.totalDiscount,
        total: data.total,
        totalWeight: data.totalWeight,
        createdAt: new Date().toISOString(),
        notes: data.notes?.trim() || undefined,
      };

      const updated = [newHeldOrder, ...heldOrders];
      saveHeldOrders(updated);
      return newHeldOrder;
    },
    [heldOrders, saveHeldOrders]
  );

  const removeHeldOrder = useCallback(
    (id: string) => {
      const updated = heldOrders.filter((o) => o.id !== id);
      saveHeldOrders(updated);
    },
    [heldOrders, saveHeldOrders]
  );

  const clearAllHeldOrders = useCallback(() => {
    saveHeldOrders([]);
  }, [saveHeldOrders]);

  return {
    heldOrders,
    heldCount: heldOrders.length,
    isLoaded,
    holdCurrentOrder,
    removeHeldOrder,
    clearAllHeldOrders,
  };
}
