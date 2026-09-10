"use client";

import { useEffect } from "react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

/**
 * Updates the browser tab title dynamically to use the shop name from settings.
 * Runs immediately on mount (with cached localStorage value) then again when
 * the API response confirms the real shop name — no visible flash.
 * Must be placed inside ShopSettingsProvider.
 */
export function DynamicTitle() {
  const { settings } = useShopSettings();

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_shop_name");
      if (cached && cached.trim()) {
        document.title = `${cached.trim()} — POS`;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (settings.shop_name) {
      document.title = `${settings.shop_name} — POS`;
    }
  }, [settings.shop_name]);

  return null;
}
