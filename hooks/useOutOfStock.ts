"use client";

import { useState, useEffect, useCallback } from "react";
import { productsService } from "@/services/products.service";

let _cachedCount: number | null = null;
const _listeners: Set<(n: number) => void> = new Set();

function notifyAll(n: number) {
  _cachedCount = n;
  _listeners.forEach((fn) => fn(n));
}

export async function refreshStockAlert(): Promise<number> {
  try {
    const res = await productsService.getProducts({ per_page: 500, status: "low_stock" });
    // Filter active products where current_stock is at or below min_stock threshold
    const lowStockItems = (res.data || []).filter(
      (p) => p.is_active && Number(p.current_stock) <= Number(p.min_stock)
    );
    const count = lowStockItems.length;
    notifyAll(count);
    return count;
  } catch {
    return _cachedCount ?? 0;
  }
}

/** Shared singleton hook — only one API call shared across all consumers */
export function useOutOfStock() {
  const [outOfStockCount, setOutOfStockCount] = useState<number>(_cachedCount ?? 0);

  useEffect(() => {
    const listener = (n: number) => setOutOfStockCount(n);
    _listeners.add(listener);
    if (_cachedCount !== null) setOutOfStockCount(_cachedCount);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const poll = useCallback(() => {
    refreshStockAlert();
  }, []);

  useEffect(() => {
    poll();

    // Re-check immediately whenever data changes anywhere in the app
    const handleDataChange = () => {
      refreshStockAlert();
    };

    window.addEventListener("butcher:data-change", handleDataChange);
    window.addEventListener("focus", handleDataChange);
    const intervalId = setInterval(poll, 10000);

    return () => {
      window.removeEventListener("butcher:data-change", handleDataChange);
      window.removeEventListener("focus", handleDataChange);
      clearInterval(intervalId);
    };
  }, [poll]);

  return outOfStockCount;
}
