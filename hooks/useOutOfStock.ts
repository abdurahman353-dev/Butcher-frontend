"use client";

import { useState, useEffect, useCallback } from "react";
import { productsService } from "@/services/products.service";

let _cachedCount: number | null = null;
const _listeners: Set<(n: number) => void> = new Set();

function notifyAll(n: number) {
  _cachedCount = n;
  _listeners.forEach((fn) => fn(n));
}

/** Shared singleton hook — only one API call shared across all consumers */
export function useOutOfStock() {
  const [outOfStockCount, setOutOfStockCount] = useState<number>(_cachedCount ?? 0);

  useEffect(() => {
    const listener = (n: number) => setOutOfStockCount(n);
    _listeners.add(listener);
    if (_cachedCount !== null) setOutOfStockCount(_cachedCount);
    return () => { _listeners.delete(listener); };
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await productsService.getProducts({ per_page: 500, status: "out_of_stock" });
      const count = res.total ?? res.data.length;
      notifyAll(count);
    } catch {}
  }, []);

  // Poll every 15s
  useEffect(() => {
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [poll]);

  return outOfStockCount;
}
