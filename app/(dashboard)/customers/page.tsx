"use client";

import React, { useState, useEffect, useCallback } from "react";
import { customersService } from "@/services/customers.service";
import { Customer, PaginatedResponse } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";
import { usePolling } from "@/hooks/usePolling";
import { useSystemDialog } from "@/contexts/DialogContext";
import { Users, Plus, Search, Phone, ShoppingBag, X, Trash2, RefreshCw, Pencil, Mail, MapPin } from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function CustomersPage() {
  const { confirm, alert } = useSystemDialog();
  const [paginated, setPaginated] = useState<PaginatedResponse<Customer>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditFormData({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editFormData.name.trim() || !editFormData.phone.trim()) {
      await alert({
        title: "Validation Error",
        message: "Customer name and contact phone number are required.",
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Update Customer Details",
      message: `Do you want to save changes for customer "${editFormData.name.trim()}"?`,
      confirmText: "Yes, Save Changes",
      cancelText: "No, Cancel",
      type: "info",
    });

    if (!confirmed) return;

    setIsUpdating(true);
    try {
      await customersService.updateCustomer(editingCustomer.id, {
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() || undefined,
        address: editFormData.address.trim() || undefined,
      });
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
      await alert({
        title: "Customer Updated",
        message: `Customer "${editFormData.name.trim()}" has been updated successfully.`,
        type: "success",
      });
    } catch (err: any) {
      await alert({
        title: "Update Failed",
        message: err.message || "Failed to update customer.",
        type: "danger",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_cached_customers");
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          setPaginated({
            data: list,
            current_page: 1,
            last_page: 1,
            per_page: 20,
            total: list.length,
            from: 1,
            to: list.length,
          });
        } else if (list.data) {
          setPaginated(list);
        }
      }
    } catch {}
  }, []);

  const fetchCustomers = useCallback(async (manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
      const res = await customersService.getCustomers({
        page: currentPage,
        per_page: 20,
        search,
      });
      setPaginated(res);
      if (typeof window !== "undefined" && currentPage === 1 && !search) {
        localStorage.setItem("butcher_cached_customers", JSON.stringify(res.data));
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, search]);

  // Real-time polling every 10s
  usePolling(fetchCustomers, 10000);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      await alert({
        title: "Validation Error",
        message: "Customer name and contact phone number are required.",
        type: "warning",
      });
      return;
    }

    setIsSaving(true);
    try {
      await customersService.createCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setFormData({ name: "", phone: "", email: "", address: "" });
      fetchCustomers();
      await alert({
        title: "Customer Added",
        message: `Customer "${formData.name.trim()}" has been registered successfully.`,
        type: "success",
      });
    } catch (err: any) {
      await alert({
        title: "Registration Failed",
        message: err.message || "Failed to add customer.",
        type: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    const confirmed = await confirm({
      title: "Delete Customer Account",
      message: `Are you sure you want to permanently delete customer account for "${c.name}"?\n\nPhone: ${c.phone}\nThis action cannot be undone.`,
      confirmText: "Yes, Delete Customer",
      cancelText: "No, Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await customersService.deleteCustomer(c.id);
      fetchCustomers();
      await alert({
        title: "Customer Deleted",
        message: `Customer "${c.name}" was deleted successfully.`,
        type: "success",
      });
    } catch (err: any) {
      await alert({
        title: "Delete Failed",
        message: err.message || "Failed to delete customer.",
        type: "danger",
      });
    }
  };

  if (isLoading && paginated.data.length === 0) {
    return <PageSkeleton variant="customers" title="Customer Directory" />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Customer Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage butcher customer accounts, order counts, and loyalty spend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by customer name or phone (e.g. Ahmed, 0712...)..."
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginated.data.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 transition-colors shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">{c.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    {c.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-transform"
                    title="Edit customer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(c)}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-transform"
                    title="Delete customer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {c.address && (
                <p className="text-[11px] text-zinc-500 mt-2">📍 {c.address}</p>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Orders</span>
                <span className="text-sm font-bold text-zinc-900 tabular-nums flex items-center gap-1 mt-0.5">
                  <ShoppingBag className="w-3 h-3 text-green-600" />
                  {c.orders_count}
                </span>
              </div>

              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Spent</span>
                <span className="text-sm font-bold text-green-700 tabular-nums mt-0.5 block">
                  {formatCurrency(c.total_spent)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-xs">
        <Pagination
          currentPage={paginated.current_page}
          lastPage={paginated.last_page}
          total={paginated.total}
          from={paginated.from}
          to={paginated.to}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !isSaving && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ahmed Mohamed"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Phone Number (M-Pesa) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0712 345 678"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-mono placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ahmed@example.com"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Delivery / Estate Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Kilimani, Nairobi"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl font-semibold transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors shadow-xs"
                >
                  {isSaving ? "Saving..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Customer Modal ── */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">Edit Customer Profile</h3>
                  <p className="text-[11px] text-zinc-500">ID #{editingCustomer.id} • {editingCustomer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isUpdating) {
                    setIsEditModalOpen(false);
                    setEditingCustomer(null);
                  }
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Ahmed Mohamed"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-2xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Phone Number (M-Pesa) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="0712 345 678"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 font-mono font-semibold placeholder:text-zinc-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="ahmed@example.com"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Delivery / Estate Address (Optional)</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="e.g. Kilimani, Nairobi"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  disabled={isUpdating}
                  className="w-1/2 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isUpdating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
