"use client";

import { useState, useEffect, useCallback } from "react";
import { Shift } from "@/types";
import { shiftsService } from "@/services/shifts.service";

const SHIFT_STORAGE_KEY = "prime_cut_current_shift";

// Module-level cache to share state across components and prevent flash on navigation
let cachedShift: Shift | null = null;
let cachedLoading = true;
const listeners = new Set<(shift: Shift | null) => void>();

function getInitialShift(): Shift | null {
  if (cachedShift) return cachedShift;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.status === "open") {
          cachedShift = parsed;
          return parsed;
        }
      }
    } catch { }
  }
  return null;
}

function updateShiftState(newShift: Shift | null) {
  cachedShift = newShift;
  cachedLoading = false;
  if (typeof window !== "undefined") {
    try {
      if (newShift && newShift.status === "open") {
        localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(newShift));
      } else {
        localStorage.removeItem(SHIFT_STORAGE_KEY);
      }
    } catch { }
  }
  listeners.forEach((listener) => listener(newShift));
}

export function useShift() {
  const [shift, setShift] = useState<Shift | null>(getInitialShift);
  const [isLoading, setIsLoading] = useState<boolean>(cachedShift ? false : cachedLoading);

  useEffect(() => {
    const handler = (s: Shift | null) => {
      setShift(s);
      setIsLoading(false);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const fetchShift = useCallback(async () => {
    try {
      const active = await shiftsService.getCurrentShift();
      updateShiftState(active);
    } catch {
      // Silently fail — don't wipe state on transient network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShift();

    const handleDataChange = () => {
      fetchShift();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("butcher:data-change", handleDataChange);
      return () => {
        window.removeEventListener("butcher:data-change", handleDataChange);
      };
    }
  }, [fetchShift]);

  const openShift = async (openingCash: number, notes?: string) => {
    const newShift = await shiftsService.openShift(openingCash, notes);
    updateShiftState(newShift);
    return newShift;
  };

  const closeShift = async (countedCash: number, notes?: string) => {
    const closed = await shiftsService.closeShift(countedCash, notes);
    updateShiftState(null);
    return closed;
  };

  return {
    shift,
    isLoading,
    refreshShift: fetchShift,
    openShift,
    closeShift,
    isShiftOpen: shift?.status === "open",
  };
}

