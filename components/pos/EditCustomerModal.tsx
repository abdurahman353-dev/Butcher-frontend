"use client";

import React, { useState, useEffect } from "react";
import { Customer } from "@/types";
import { customersService } from "@/services/customers.service";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  Pencil,
  X,
  User,
  Phone,
  MapPin,
  Mail,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
  onCustomerDeleted?: (customerId: number) => void;
}

export function EditCustomerModal({
  isOpen,
  customer,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
}: EditCustomerModalProps) {
  const { confirm, alert } = useSystemDialog();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
      setEmail(customer.email || "");
      setError(null);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }

    const confirmed = await confirm({
      title: "Update Customer Profile",
      message: `Do you want to save changes for "${name.trim()}"?`,
      confirmText: "Yes, Save Changes",
      cancelText: "No, Cancel",
      type: "info",
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await customersService.updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        email: email.trim() || undefined,
      });

      await alert({
        title: "Customer Updated",
        message: `Profile for "${updated.name}" updated successfully.`,
        type: "success",
      });

      onCustomerUpdated(updated);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update customer.";
      setError(msg);
      await alert({
        title: "Update Failed",
        message: msg,
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Customer Account",
      message: `Are you sure you want to permanently delete "${customer.name}"?\n\nPhone: ${customer.phone}\nThis action cannot be undone.`,
      confirmText: "Yes, Delete Customer",
      cancelText: "No, Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await customersService.deleteCustomer(customer.id);
      await alert({
        title: "Customer Deleted",
        message: `Customer "${customer.name}" was deleted successfully.`,
        type: "success",
      });

      if (onCustomerDeleted) {
        onCustomerDeleted(customer.id);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to delete customer.";
      await alert({
        title: "Delete Failed",
        message: msg,
        type: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">Edit Customer Profile</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Customer #{customer.id} • {customer.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Mohamed / Mama Mboga"
              className="w-full border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              Phone Number (M-Pesa) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="w-full border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              Delivery / Estate Address (Optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Kilimani, Block 4, House 12"
              className="w-full border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@example.com"
              className="w-full border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="w-1/3 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

            {/* Solid Red Delete Button with confirmation */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Customer Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
