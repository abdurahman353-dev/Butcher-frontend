"use client";

import { useState, useEffect, useCallback } from "react";
import { restaurantStockService } from "@/services/restaurantStock.service";

let _cachedCount: number | null = null;
const _listeners: Set<(n: number) => void> = new Set();

function notifyAll(n: number) {
  _cachedCount = n;
  _listeners.forEach((fn) => fn(n));
}

export async function refreshRestaurantStockAlert(): Promise<number> {
  try {
    const res = await restaurantStockService.getStock({ per_page: "all" });
    const items = Array.isArray(res.data) ? res.data : [];
    const count = items.filter(
      (s) => Number(s.min_threshold) > 0 && Number(s.current_quantity) <= Number(s.min_threshold)
    ).length;
    notifyAll(count);
    return count;
  } catch {
    return _cachedCount ?? 0;
  }
}

export function useRestaurantLowStock() {
  const [count, setCount] = useState<number>(_cachedCount ?? 0);

  useEffect(() => {
    const listener = (n: number) => setCount(n);
    _listeners.add(listener);
    if (_cachedCount !== null) setCount(_cachedCount);
    return () => { _listeners.delete(listener); };
  }, []);

  const poll = useCallback(() => { refreshRestaurantStockAlert(); }, []);

  useEffect(() => {
    poll();
    const handler = () => refreshRestaurantStockAlert();
    window.addEventListener("butcher:data-change", handler);
    window.addEventListener("focus", handler);
    const id = setInterval(poll, 30000);
    return () => {
      window.removeEventListener("butcher:data-change", handler);
      window.removeEventListener("focus", handler);
      clearInterval(id);
    };
  }, [poll]);

  return count;
}
