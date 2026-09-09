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
    } catch {
      // Silently fail — don't wipe state on transient network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once on mount only — no repeated polling, no localStorage
  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  const openShift = async (openingCash: number, notes?: string) => {
    const newShift = await shiftsService.openShift(openingCash, notes);
    setShift(newShift);
    return newShift;
  };

  const closeShift = async (countedCash: number, notes?: string) => {
    const closed = await shiftsService.closeShift(countedCash, notes);
    setShift(closed);
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
