"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ShopSettings } from "@/types";
import { settingsService } from "@/services/settings.service";

/** Key used to persist the shop name between sessions */
const CACHE_KEY = "butcher_shop_name";

/** SSR-safe base defaults (no window access) */
const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: "Butchery POS",
  phone: "",
  email: "",
  address: "",
  tax_pin: "",
  currency: "KSh",
  receipt_header: "",
  receipt_footer: "",
  default_min_stock: 10,
  tax_rate_percent: 0,
  enable_mpesa_stk: true,
};

/** Read the cached shop name from localStorage after mount (client-only) */
function getCachedShopName(): string {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return (cached && cached.trim()) ? cached.trim() : "";
  } catch {
    return "";
  }
}

interface ShopSettingsContextType {
  settings: ShopSettings;
  isLoading: boolean;
  /** Persist new settings to the backend and update global state immediately */
  saveSettings: (updated: Partial<ShopSettings>) => Promise<void>;
  /** Force a re-fetch from the API */
  reload: () => Promise<void>;
}

const ShopSettingsContext = createContext<ShopSettingsContextType | null>(null);

export function useShopSettings(): ShopSettingsContextType {
  const ctx = useContext(ShopSettingsContext);
  if (!ctx) {
    throw new Error(
      "useShopSettings must be used within a ShopSettingsProvider"
    );
  }
  return ctx;
}

export function ShopSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR-safe: start with DEFAULT_SETTINGS (matches server render), then
  // immediately update shop_name from localStorage after mount to avoid flash
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Update shop_name from localStorage on first client render (before API responds)
  useEffect(() => {
    const cached = getCachedShopName();
    if (cached) {
      setSettings((prev) => ({ ...prev, shop_name: cached }));
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await settingsService.getSettings();
      if (data) {
        setSettings({
          shop_name: data.shop_name ?? DEFAULT_SETTINGS.shop_name,
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          tax_pin: data.tax_pin ?? "",
          currency: data.currency ?? "KSh",
          receipt_header: data.receipt_header ?? "",
          receipt_footer: data.receipt_footer ?? "",
          default_min_stock: data.default_min_stock ?? 10,
          tax_rate_percent: data.tax_rate_percent ?? 0,
          enable_mpesa_stk: data.enable_mpesa_stk ?? true,
        });
        // Cache shop_name so login page + browser tab can use it
        try { localStorage.setItem(CACHE_KEY, data.shop_name ?? ""); } catch {}
      }
    } catch (e: any) {
      // 401 is expected on the login page (not yet authenticated) — don't warn
      if (e?.status_code !== 401) {
        console.warn("[ShopSettingsContext] Failed to load settings:", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on first mount
  useEffect(() => {
    reload();
  }, [reload]);

  // Also reload when any data-change event is fired
  useEffect(() => {
    const handleChange = () => reload();
    window.addEventListener("butcher:data-change", handleChange);
    window.addEventListener("butcher:auth-success", handleChange);
    return () => {
      window.removeEventListener("butcher:data-change", handleChange);
      window.removeEventListener("butcher:auth-success", handleChange);
    };
  }, [reload]);

  const saveSettings = useCallback(
    async (updated: Partial<ShopSettings>) => {
      const merged = { ...settings, ...updated };
      // Optimistically update state so the UI reflects the change immediately
      setSettings(merged);
      try {
        const saved = await settingsService.updateSettings(merged);
        // Reconcile with what the server actually stored
        if (saved) {
          setSettings({
            shop_name: saved.shop_name ?? DEFAULT_SETTINGS.shop_name,
            phone: saved.phone ?? "",
            email: saved.email ?? "",
            address: saved.address ?? "",
            tax_pin: saved.tax_pin ?? "",
            currency: saved.currency ?? "KSh",
            receipt_header: saved.receipt_header ?? "",
            receipt_footer: saved.receipt_footer ?? "",
            default_min_stock: saved.default_min_stock ?? 10,
            tax_rate_percent: saved.tax_rate_percent ?? 0,
            enable_mpesa_stk: saved.enable_mpesa_stk ?? true,
          });
        }
      } catch (e) {
        // Roll back optimistic update on failure
        await reload();
        throw e;
      }
    },
    [settings, reload]
  );

  return (
    <ShopSettingsContext.Provider value={{ settings, isLoading, saveSettings, reload }}>
      {children}
    </ShopSettingsContext.Provider>
  );
}
