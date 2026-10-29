"use client";

import React, { useState, useEffect } from "react";
import { ShopSettings } from "@/types";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Save, CheckCircle2, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PresetNotesManager } from "@/components/pos/PresetNotesManager";

export default function SettingsPage() {
  const { alert } = useSystemDialog();
  const { user } = useAuth();
  const isRestaurant = user?.company?.business_type === "restaurant";

  const { settings: globalSettings, saveSettings, isLoading } = useShopSettings();

  // Local copy of settings for editing in the form
  const [settings, setSettings] = useState<ShopSettings>(globalSettings);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [printingState, setPrintingState] = useState({ status: 'unknown', printer: null, isChecking: false, isPrinting: false } as any);

  // Sync local form when global settings load, but NEVER overwrite if user is actively editing
  useEffect(() => {
    if (!isDirty && !isLoading) {
      setSettings(globalSettings);
      setIsFormInitialized(true);
    }
  }, [globalSettings, isDirty, isLoading]);

  if (isLoading && !isFormInitialized) {
    return <PageSkeleton variant="settings" title="Store & System Settings" />;
  }

  const updateField = (field: keyof ShopSettings, value: any) => {
    setIsDirty(true);
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert({
        title: "Invalid File",
        message: "Please select an image file (PNG, JPG, SVG, WebP).",
        type: "warning",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result as string;
      if (!rawData) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        const size = Math.min(Math.min(img.width, img.height), 256);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const compressedDataUrl = canvas.toDataURL("image/png", 0.9);
          updateField("logo_url", compressedDataUrl);
        } else {
          updateField("logo_url", rawData);
        }
      };
      img.onerror = () => {
        updateField("logo_url", rawData);
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // saveSettings updates the global context AND persists to backend
      await saveSettings(settings);
      setIsDirty(false);
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
            {isRestaurant ? "🍽️ Restaurant & Venue Identity" : "🏪 Store Identity"}
          </h2>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">
              {isRestaurant ? "Restaurant / Business Name" : "Butcher Shop Name"}
            </label>
            <input
              type="text"
              required
              value={settings.shop_name ?? ""}
              onChange={(e) => updateField("shop_name", e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            />
          </div>

          {/* Store Logo Upload */}
          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">
              Store / Restaurant Logo (Optional)
            </label>
            <div className="flex items-center gap-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              {settings.logo_url ? (
                <div className="relative group shrink-0">
                  <img
                    src={settings.logo_url}
                    alt="Logo Preview"
                    className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-200 p-1 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("logo_url", "")}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-xs hover:bg-rose-700"
                    title="Remove logo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-zinc-300 bg-white flex items-center justify-center text-zinc-400 shrink-0">
                  <ImageIcon className="w-5 h-5 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{settings.logo_url ? "Change Logo" : "Upload Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {settings.logo_url && (
                    <button
                      type="button"
                      onClick={() => updateField("logo_url", "")}
                      className="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Logo will only appear in navigation and sidebar once uploaded here.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone ?? ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email ?? ""}
                onChange={(e) => updateField("email", e.target.value)}
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
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-zinc-700 mb-1">Tax / Business PIN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. P051283749Z"
                value={settings.tax_pin ?? ""}
                onChange={(e) => updateField("tax_pin", e.target.value)}
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
              placeholder={isRestaurant ? "e.g. Fine Dining & Grill • Table Service & Takeaway" : "e.g. Fresh Gourmet Meats • Halal Certified"}
              value={settings.receipt_header ?? ""}
              onChange={(e) => updateField("receipt_header", e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs resize-y"
            />
            <p className="text-[11px] text-zinc-400 mt-0.5">Appears right below store contact info on all receipts in real time.</p>
          </div>

          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1">Receipt Bottom Footer Note</label>
            <textarea
              rows={2}
              placeholder={isRestaurant ? "e.g. Thank you for dining with us! Come back soon." : "e.g. Thank you for shopping with us! Fresh cuts daily."}
              value={settings.receipt_footer ?? ""}
              onChange={(e) => updateField("receipt_footer", e.target.value)}
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

      {/* Preset KOT Notes — Restaurant Only */}
      {isRestaurant && (
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <PresetNotesManager />
        </div>
      )}
    </div>
  );
}


