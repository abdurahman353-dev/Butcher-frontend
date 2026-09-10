"use client";

import React, { useState, useEffect } from "react";
import { ShopSettings } from "@/types";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { alert } = useSystemDialog();

  const { settings: globalSettings, saveSettings } = useShopSettings();

  // Local copy of settings for editing in the form
  const [settings, setSettings] = useState<ShopSettings>(globalSettings);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync local form when global settings load or change
  useEffect(() => {
    setSettings(globalSettings);
  }, [globalSettings]);

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // saveSettings updates the global context AND persists to backend
      await saveSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      await alert({
        title: "Settings Save Failed",
        message: e.message || "Failed to save settings.",
        type: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Store & System Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Configure store profile, contact details, and thermal receipt branding.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-green-800 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>Settings saved successfully! Receipts and headers are updated in real time.</span>
        </div>
      )}

      <form onSubmit={handleSubmitSettings} className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-5 text-xs shadow-xs">
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
              value={settings.shop_name ?? ""}
              onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone ?? ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email ?? ""}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Physical Address</label>
              <input
                type="text"
                placeholder="e.g. Ground Floor, Nairobi"
                value={settings.address ?? ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Tax / Business PIN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. P051283749Z"
                value={settings.tax_pin ?? ""}
                onChange={(e) => setSettings({ ...settings, tax_pin: e.target.value })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
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
            <textarea
              rows={2}
              placeholder="e.g. Fresh Gourmet Meats • Halal Certified"
              value={settings.receipt_header ?? ""}
              onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs resize-y"
            />
            <p className="text-[11px] text-zinc-400 mt-0.5">Appears right below store contact info on all receipts in real time.</p>
          </div>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Receipt Bottom Footer Note</label>
            <textarea
              rows={2}
              placeholder="e.g. Thank you for shopping with us! Fresh cuts daily."
              value={settings.receipt_footer ?? ""}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs resize-y"
            />
            <p className="text-[11px] text-zinc-400 mt-0.5">Custom thank you, return policy, or note printed at the bottom of all receipts.</p>
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


