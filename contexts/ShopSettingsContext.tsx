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
const FULL_SETTINGS_CACHE_KEY = "butcher_shop_settings_cache";

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

/** Read the cached settings from localStorage after mount (client-only) */
function getCachedSettings(): ShopSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FULL_SETTINGS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    }
  } catch { }
  return null;
}

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
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const cached = getCachedSettings();
    if (cached) return cached;
    const legacyName = getCachedShopName();
    if (legacyName) return { ...DEFAULT_SETTINGS, shop_name: legacyName };
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Update from cache on client mount
  useEffect(() => {
    const cached = getCachedSettings();
    if (cached) {
      setSettings(cached);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await settingsService.getSettings();
      if (data) {
        const full: ShopSettings = {
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
        };
        setSettings(full);
        try {
          localStorage.setItem(CACHE_KEY, full.shop_name);
          localStorage.setItem(FULL_SETTINGS_CACHE_KEY, JSON.stringify(full));
        } catch { }
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

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FULL_SETTINGS_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setSettings(parsed);
        } catch { }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("butcher:data-change", handleChange);
      window.removeEventListener("butcher:auth-success", handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [reload]);

  const saveSettings = useCallback(
    async (updated: Partial<ShopSettings>) => {
      const merged: ShopSettings = { ...settings, ...updated };
      // Optimistically update state and cache so receipts reflect changes instantly
      setSettings(merged);
      try {
        localStorage.setItem(CACHE_KEY, merged.shop_name);
        localStorage.setItem(FULL_SETTINGS_CACHE_KEY, JSON.stringify(merged));
      } catch { }

      try {
        const saved = await settingsService.updateSettings(merged);
        // Reconcile with what the server actually stored
        if (saved) {
          const reconciled: ShopSettings = {
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
          };
          setSettings(reconciled);
          try {
            localStorage.setItem(CACHE_KEY, reconciled.shop_name);
            localStorage.setItem(FULL_SETTINGS_CACHE_KEY, JSON.stringify(reconciled));
          } catch { }
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
