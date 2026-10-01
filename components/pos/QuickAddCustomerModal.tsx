"use client";

import React, { useState } from "react";
import { Customer } from "@/types";
import { customersService } from "@/services/customers.service";
import {
  UserPlus,
  X,
  User,
  Phone,
  MapPin,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function QuickAddCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
}: QuickAddCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Customer name is required.";
    }
    if (!phone.trim()) {
      errors.phone = "Phone number is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const created = await customersService.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        email: email.trim() || undefined,
      });

      // Reset form
      setName("");
      setPhone("");
      setAddress("");
      setEmail("");
      setFieldErrors({});
      setError(null);

      onCustomerCreated(created);
    } catch (err: any) {
      const msg =
        err?.errors
          ? Object.values(err.errors as Record<string, string[]>).flat().join(" ")
          : err?.response?.data?.message || err?.message || "Failed to create customer.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setFieldErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={handleClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center text-green-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">Add New Customer</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Create customer directly on POS and select for current order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="e.g. Mama Brian / John Mwangi"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
                }}
                className={`w-full pl-9 pr-3 py-2 text-xs font-semibold text-zinc-900 border rounded-xl focus:outline-none transition-all ${
                  fieldErrors.name
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-zinc-300 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                }`}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="e.g. 0712345678 / 0796700644"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
                }}
                className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold text-zinc-900 border rounded-xl focus:outline-none transition-all ${
                  fieldErrors.phone
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-zinc-300 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                }`}
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                {fieldErrors.phone}
              </p>
            )}
          </div>

          {/* Physical Address / Delivery Location */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Physical Address / Location <span className="text-zinc-400 font-normal">(Printed on Receipt)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Majengo / Mombasa, Plot 14, Shop 2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-zinc-900 border border-zinc-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              This address will appear automatically on customer receipts and Pay Later bills.
            </p>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Email Address <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="e.g. customer@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 border border-zinc-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Select</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
