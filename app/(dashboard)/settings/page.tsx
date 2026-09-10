"use client";

import React, { useState, useEffect } from "react";
import { settingsService } from "@/services/settings.service";
import { usersService } from "@/services/users.service";
import { ShopSettings, User } from "@/types";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Save, CheckCircle2, UserPlus, Trash2, Shield, UserCheck, Key, RefreshCw, X } from "lucide-react";

export default function SettingsPage() {
  const { alert, confirm } = useSystemDialog();
  const { user: currentUser } = useAuth();

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

  // Staff Management State
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cashier" as "admin" | "cashier",
    password: "",
  });

  const loadData = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }

    try {
      setIsLoadingStaff(true);
      const res = await usersService.getUsers({ per_page: 50 });
      setStaffList(res.data);
    } catch (e) {
      console.error("Failed to load staff list:", e);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDataChange = () => loadData();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => window.removeEventListener("butcher:data-change", handleDataChange);
  }, []);

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsService.updateSettings(settings);
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      await alert({ title: "Validation Error", message: "Please fill in all required fields.", type: "warning" });
      return;
    }

    setIsSubmittingStaff(true);
    try {
      await usersService.createUser(newStaff);
      await alert({ title: "Success", message: `Staff member ${newStaff.name} created successfully!`, type: "success" });
      setNewStaff({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setShowAddStaffModal(false);
      loadData();
    } catch (e: any) {
      await alert({
        title: "Failed to Add Staff",
        message: e?.response?.data?.message || e.message || "Could not add staff member.",
        type: "danger",
      });
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleRevokeStaff = async (staff: User) => {
    if (currentUser?.id === staff.id) {
      await alert({ title: "Action Forbidden", message: "You cannot revoke your own account.", type: "warning" });
      return;
    }

    const confirmed = await confirm({
      title: "Revoke Staff Access",
      message: `Are you sure you want to revoke access for ${staff.name} (${staff.email})? They will be immediately logged out and unable to access the POS.`,
      confirmText: "Yes, Revoke Access",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await usersService.deleteUser(staff.id);
      await alert({ title: "Access Revoked", message: `Access for ${staff.name} has been revoked successfully.`, type: "success" });
      loadData();
    } catch (e: any) {
      await alert({
        title: "Revocation Failed",
        message: e?.response?.data?.message || e.message || "Could not revoke staff access.",
        type: "danger",
      });
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
              System Settings & Cashier Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Configure store profile, manage cashier accounts, and handle receipt branding.
          </p>
        </div>
      </div>

      {/* ── SECTION 1: STAFF & CASHIER MANAGEMENT ── */}
      <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Staff & Cashiers Audit</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Super Admin / Owner panel to onboard new cashiers or immediately revoke staff access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-98 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Cashier</span>
          </button>
        </div>

        {/* Staff Table */}
        {isLoadingStaff ? (
          <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-green-600" /> Loading staff accounts...
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">No staff members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-xs">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{staff.name}</p>
                          <p className="text-[11px] text-zinc-500">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${staff.role === "admin"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                        <UserCheck className="w-3 h-3" />
                        {staff.role === "admin" ? "Super Admin" : "Cashier"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600">{staff.phone || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      {currentUser?.id !== staff.id ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeStaff(staff)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke Access</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase italic">Current Account</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD CASHIER MODAL ── */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-zinc-900 text-base">Onboard New Cashier / Staff</h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-zinc-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Kamau"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-zinc-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john.kamau@primecut.co.ke"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-zinc-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+254 7..."
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-zinc-700 mb-1">Access Role *</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as "admin" | "cashier" })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Super Admin / Owner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-zinc-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingStaff ? "Creating Cashier..." : "Create Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SECTION 2: STORE PROFILE & RECEIPT BRANDING ── */}
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

