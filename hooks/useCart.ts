"use client";

import { useState, useEffect, useCallback } from "react";
import { CartItem, Product } from "@/types";
import { calculateSubtotal, roundTo } from "@/lib/math";

const CART_STORAGE_KEY = "butcher_active_cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addItem = useCallback((product: Product, weightKg: number = 1.0, discount: number = 0) => {
    const validWeight = roundTo(Math.max(0.005, weightKg), 3);
    setItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.product_id === product.id);
      if (existingIdx !== -1) {
        // Update existing line
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newWeight = roundTo(existing.weight + validWeight, 3);
        const sub = calculateSubtotal(newWeight, existing.price_per_kg);
        updated[existingIdx] = {
          ...existing,
          weight: newWeight,
          available_stock: product.current_stock,
          subtotal: roundTo(Math.max(0, sub - existing.discount), 2),
        };
        return updated;
      }

      // Add new item
      const sub = calculateSubtotal(validWeight, product.price_per_kg);
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        price_per_kg: product.price_per_kg,
        weight: validWeight,
        discount,
        subtotal: roundTo(Math.max(0, sub - discount), 2),
        available_stock: product.current_stock,
        image: product.image,
      };
      return [...prev, newItem];
    });
  }, []);

  const updateWeight = useCallback((cartItemId: string, weightKg: number) => {
    const validWeight = roundTo(Math.max(0.005, weightKg), 3);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const sub = calculateSubtotal(validWeight, item.price_per_kg);
          return {
            ...item,
            weight: validWeight,
            subtotal: roundTo(Math.max(0, sub - item.discount), 2),
          };
        }
        return item;
      })
    );
  }, []);

  const adjustWeightBy = useCallback((cartItemId: string, deltaKg: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newWeight = roundTo(item.weight + deltaKg, 3);
            if (newWeight <= 0) return null; // Remove if <= 0
            const sub = calculateSubtotal(newWeight, item.price_per_kg);
            return {
              ...item,
              weight: newWeight,
              subtotal: roundTo(Math.max(0, sub - item.discount), 2),
            };
          }
          return item;
        })
        .filter((it): it is CartItem => it !== null)
    );
  }, []);

  const updateDiscount = useCallback((cartItemId: string, discountAmount: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const rawSub = calculateSubtotal(item.weight, item.price_per_kg);
          const safeDiscount = Math.min(rawSub, Math.max(0, discountAmount));
          return {
            ...item,
            discount: roundTo(safeDiscount, 2),
            subtotal: roundTo(rawSub - safeDiscount, 2),
          };
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Summary computations
  const subtotal = roundTo(
    items.reduce((acc, it) => acc + calculateSubtotal(it.weight, it.price_per_kg), 0),
    2
  );
  const totalDiscount = roundTo(
    items.reduce((acc, it) => acc + it.discount, 0),
    2
  );
  const total = roundTo(Math.max(0, subtotal - totalDiscount), 2);
  const totalWeight = roundTo(
    items.reduce((acc, it) => acc + it.weight, 0),
    3
  );
  const itemsCount = items.length;

  return {
    items,
    isLoaded,
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
  };
}
