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
      setShift(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShift();

    const handleDataChange = () => {
      fetchShift();
    };

    window.addEventListener("butcher:data-change", handleDataChange);
    return () => {
      window.removeEventListener("butcher:data-change", handleDataChange);
    };
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
