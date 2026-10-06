"use client";

import React, { useState } from "react";
import { Category } from "@/types";
import { productsService } from "@/services/products.service";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import {
  X,
  Plus,
  Layers,
  Edit2,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChange: () => void;
}

function CategoryBadge({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const code = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase() || "CT";
  return (
    <span className="w-10 h-10 rounded-xl bg-purple-100/80 border border-purple-200 text-purple-700 font-bold text-xs font-mono flex items-center justify-center shrink-0 select-none shadow-2xs">
      {code}
    </span>
  );
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
}: ManageCategoriesModalProps) {
  const { confirm, alert } = useSystemDialog();
  const { user } = useAuth();
  const isRestaurant = user?.company?.business_type === "restaurant";

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = newName.trim();
    if (!name) { setFormError("Please enter a category name."); return; }
    setIsSubmitting(true);
    try {
      await productsService.createCategory({ name, description: newDescription.trim() || undefined });
      setNewName(""); setNewDescription("");
      onCategoriesChange();
      await alert({ title: "Category Created", message: `"${name}" was successfully added!`, type: "success" });
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };

  const handleUpdate = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    const cat = categories.find((c) => c.id === id);
    const confirmed = await confirm({
      title: "Save Category Changes",
      message: `Update "${cat?.name || ""}" to "${name}"?`,
      confirmText: "Yes, Update",
      cancelText: "No, Cancel",
      type: "warning",
    });
    if (!confirmed) return;
    setIsEditingSaving(true);
    try {
      await productsService.updateCategory(id, { name });
      cancelEdit();
      onCategoriesChange();
      await alert({ title: "Category Updated", message: `"${name}" updated successfully!`, type: "success" });
    } catch (err: any) {
      await alert({ title: "Update Failed", message: err.response?.data?.message || err.message || "Failed.", type: "danger" });
    } finally {
      setIsEditingSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const count = cat.products_count || 0;
    if (count > 0) {
      await alert({ title: "Category In Use", message: `Cannot delete "${cat.name}" — it has ${count} product(s). Move or delete them first.`, type: "warning" });
      return;
    }
    const confirmed = await confirm({ title: "Delete Category", message: `Permanently delete "${cat.name}"? This cannot be undone.`, confirmText: "Delete Category", type: "danger" });
    if (!confirmed) return;
    setDeletingId(cat.id);
    try {
      await productsService.deleteCategory(cat.id);
      onCategoriesChange();
      await alert({ title: "Deleted", message: `"${cat.name}" has been removed.`, type: "success" });
    } catch (err: any) {
      await alert({ title: "Delete Failed", message: err.response?.data?.message || err.message || "Failed.", type: "danger" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — bottom-sheet on mobile, centered card on sm+ */}
      <div className="relative w-full sm:max-w-lg bg-white border border-zinc-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[95dvh] sm:max-h-[90vh]">

        {/* Drag pill — mobile only */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-zinc-300 sm:hidden" />

        {/* HEADER */}
        <div className="px-4 pt-7 pb-4 sm:pt-4 sm:px-5 sm:py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">
                {isRestaurant ? "Manage Menu Categories" : "Manage Meat Categories"}
              </h2>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                {isRestaurant ? "Organise your menu sections (Starters, Mains, Drinks…)" : "Add or organise for products & reports"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors -mr-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-5 sm:py-5 space-y-5">

          {/* ADD FORM */}
          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <Plus className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Add New Category</span>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {/* Name row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isRestaurant ? "e.g. Starters, Mains, Desserts, Beverages..." : "e.g. Beef, Lamb, Camel, Marinated..."}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 min-w-0 h-11 bg-white border border-zinc-200 rounded-xl px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 font-semibold shadow-xs"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newName.trim()}
                  className="h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add</span>
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </form>
          </div>

          {/* EXISTING CATEGORIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700 px-0.5">
              <span>Existing Categories ({categories.length})</span>
              <span className="text-[11px] font-normal text-zinc-400">Tap Edit to rename</span>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const isDeleting = deletingId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className="p-3 bg-purple-50 border-2 border-purple-500 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Category name"
                          autoFocus
                          className="flex-1 min-w-0 h-10 bg-white border border-purple-300 rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdate(cat.id)}
                            disabled={isEditingSaving || !editName.trim()}
                            className="h-10 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                          >
                            {isEditingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-10 px-3 text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat.id} className="p-3 bg-zinc-50 hover:bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryBadge name={cat.name} />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-zinc-900 truncate">{cat.name}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Package className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{cat.products_count ?? 0} {isRestaurant ? "menu items" : "cuts"} recorded</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="h-9 px-3 bg-white border border-zinc-200 hover:border-purple-300 hover:text-purple-700 text-zinc-600 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        disabled={isDeleting}
                        className="h-9 w-9 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                        aria-label="Delete category"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="py-10 text-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                  No categories yet. Add your first one above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/80 shrink-0 gap-3">
          <span className="text-[11px] text-zinc-400 font-medium hidden sm:block leading-tight">
            Changes update POS, catalog &amp; reports immediately.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
