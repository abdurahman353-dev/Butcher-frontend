"use client";

import React, { useState, useEffect, useCallback } from "react";
import { customersService } from "@/services/customers.service";
import { Customer, PaginatedResponse } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { Pagination } from "@/components/shared/Pagination";
import { Users, Plus, Search, Phone, ShoppingBag, X } from "lucide-react";

export default function CustomersPage() {
  const [paginated, setPaginated] = useState<PaginatedResponse<Customer>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

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

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customersService.getCustomers({
        page: currentPage,
        per_page: 20,
        search,
      });
      setPaginated(res);
    } catch (e) {
      console.error("Failed to load customers:", e);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchCustomers();

    const handleDataChange = () => fetchCustomers();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => window.removeEventListener("butcher:data-change", handleDataChange);
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Name and phone number are required.");
      return;
    }

    setIsSaving(true);
    try {
      await customersService.createCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
      });
      setIsAddModalOpen(false);
      setFormData({ name: "", phone: "", email: "", address: "" });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || "Failed to add customer.");
    } finally {
      setIsSaving(false);
    }
  };

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
                <div className="w-9 h-9 rounded-full bg-green-50 border border-green-200 flex items-center justify-center font-bold text-green-700 text-xs">
                  {c.name.charAt(0)}
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
    </div>
  );
}
