"use client";

import React, { useState } from "react";
import { X, Plus, UtensilsCrossed } from "lucide-react";

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTable: (payload: { name: string; table_number: string; capacity?: number; zone: string }) => Promise<void>;
}

export function AddTableModal({ isOpen, onClose, onAddTable }: AddTableModalProps) {
  const [name, setName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [zone, setZone] = useState("Main Floor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tableNumber.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddTable({
        name: name.trim(),
        table_number: tableNumber.trim(),
        capacity: 4,
        zone: zone.trim() || "Main Floor",
      });
      setName("");
      setTableNumber("");
      setZone("Main Floor");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 tracking-tight">Add New Table</h3>
              <p className="text-xs text-zinc-500">Create a new dining table container</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Table Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 13 or T13"
                value={tableNumber}
                onChange={(e) => {
                  setTableNumber(e.target.value);
                  if (!name || name.startsWith("Table ")) {
                    setName(`Table ${e.target.value}`);
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Table 13"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 mb-1">
              Zone / Section
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="Main Floor">Main Floor</option>
              <option value="Terrace">Terrace</option>
              <option value="Garden">Garden</option>
              <option value="VIP Lounge">VIP Lounge</option>
              <option value="Outdoor Section">Outdoor Section</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tableNumber.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Save Table"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
