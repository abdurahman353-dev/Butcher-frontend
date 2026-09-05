"use client";

import React, { useState, useEffect } from "react";
import { settingsService } from "@/services/settings.service";
import { ShopSettings } from "@/types";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>({
    shop_name: "Prime Cut Artisan Butchery",
    phone: "+254 712 345 678",
    email: "orders@primecut.co.ke",
    address: "Ground Floor, Argwings Kodhek Rd, Kilimani, Nairobi",
    tax_pin: "P051283749Z",
    currency: "KSh",
    receipt_header: "Fresh Gourmet Meats • Halal Certified",
    receipt_footer: "Thank you for choosing Prime Cut! Fresh cuts daily.",
    default_min_stock: 10,
    tax_rate_percent: 0,
    enable_mpesa_stk: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await settingsService.getSettings();
      setSettings(data);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsService.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Shop & POS Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Configure butcher store branding, receipt headers/footers, and default thresholds.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-green-800 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>Settings saved successfully! Receipts and headers are updated in real time.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-5 text-xs shadow-xs">
        {/* Store Profile */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
            🏪 Store Identity
          </h2>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Butcher Shop Name</label>
            <input
              type="text"
              required
              value={settings.shop_name}
              onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Physical Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Tax PIN Number</label>
              <input
                type="text"
                value={settings.tax_pin || ""}
                onChange={(e) => setSettings({ ...settings, tax_pin: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Currency Code</label>
              <input
                type="text"
                disabled
                value={settings.currency}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Receipt Branding */}
        <div className="space-y-3 pt-3 border-t border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
            🧾 Thermal Receipt Customization
          </h2>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Receipt Top Tagline</label>
            <input
              type="text"
              value={settings.receipt_header}
              onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Receipt Bottom Footer Note</label>
            <input
              type="text"
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Thresholds */}
        <div className="space-y-3 pt-3 border-t border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
            ⚖️ Inventory Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">
                Default Minimum Stock Alert Threshold (KG)
              </label>
              <input
                type="number"
                value={settings.default_min_stock}
                onChange={(e) => setSettings({ ...settings, default_min_stock: Number(e.target.value) })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving Settings..." : "Save Shop Settings"}</span>
        </button>
      </form>
    </div>
  );
}
