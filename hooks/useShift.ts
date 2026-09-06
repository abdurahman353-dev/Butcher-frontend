"use client";

import { useState, useEffect, useCallback } from "react";
import { Shift } from "@/types";
import { shiftsService } from "@/services/shifts.service";

export function useShift() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShift = useCallback(async () => {
    try {
      const active = await shiftsService.getCurrentShift();
      setShift(active);
      if (typeof window !== "undefined") {
        if (active) {
          localStorage.setItem("butcher_cached_shift", JSON.stringify(active));
        } else {
          localStorage.removeItem("butcher_cached_shift");
        }
      }
    } catch {
      // In case of network error, do not aggressively wipe cache unless it's a 401
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_shift");
      if (cached) {
        setShift(JSON.parse(cached));
      }
    } catch {}

    fetchShift();

    const intervalId = setInterval(fetchShift, 10000);

    const handleDataChange = () => {
      fetchShift();
    };

    window.addEventListener("butcher:data-change", handleDataChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("butcher:data-change", handleDataChange);
    };
  }, [fetchShift]);

  const openShift = async (openingCash: number, notes?: string) => {
    const newShift = await shiftsService.openShift(openingCash, notes);
    setShift(newShift);
    if (typeof window !== "undefined") {
      localStorage.setItem("butcher_cached_shift", JSON.stringify(newShift));
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return newShift;
  };

  const closeShift = async (countedCash: number, notes?: string) => {
    const closed = await shiftsService.closeShift(countedCash, notes);
    setShift(closed);
    if (typeof window !== "undefined") {
      localStorage.removeItem("butcher_cached_shift");
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
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
