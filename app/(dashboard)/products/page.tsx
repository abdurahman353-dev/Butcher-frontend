"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { productsService } from "@/services/products.service";
import { Product, Category, PaginatedResponse } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { MeatImage } from "@/components/shared/MeatImage";
import { Pagination } from "@/components/shared/Pagination";
import { usePolling } from "@/hooks/usePolling";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function ProductsPage() {
  const { confirm, alert } = useSystemDialog();
  const [paginated, setPaginated] = useState<PaginatedResponse<Product>>({
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const cachedProds = localStorage.getItem("butcher_cached_products");
      const cachedCats = localStorage.getItem("butcher_cached_categories");
      if (cachedProds) {
        const list = JSON.parse(cachedProds);
        setPaginated({
          data: list,
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: list.length,
          from: 1,
          to: list.length,
        });
      }
      if (cachedCats) setCategories(JSON.parse(cachedCats));
    } catch { }
  }, []);

  // Modal State (Add or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: 1,
    price_per_kg: "",
    buying_cost_per_kg: "",
    current_stock: "",
    min_stock: "10",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const [prodsRes, cats] = await Promise.all([
        productsService.getProducts({
          page: currentPage,
          per_page: 20,
          search,
          category_id: categoryFilter,
          status: statusFilter,
        }),
        productsService.getCategories(),
      ]);
      setPaginated(prodsRes);
      setCategories(cats);
      if (typeof window !== "undefined") {
        localStorage.setItem("butcher_cached_products", JSON.stringify(prodsRes.data));
        localStorage.setItem("butcher_cached_categories", JSON.stringify(cats));
      }
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  }, [currentPage, search, categoryFilter, statusFilter]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactive debounced fetch — fires instantly on any filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchProducts]);

  // Real-time: poll every 10s
  usePolling(fetchProducts, 10000);

  const openAddModal = () => {
    setEditingProduct(null);
    setModalError(null);
    setFormData({
      name: "",
      sku: "",
      category_id: categories[0]?.id || 1,
      price_per_kg: "",
      buying_cost_per_kg: "",
      current_stock: "",
      min_stock: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setModalError(null);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id,
      price_per_kg: product.price_per_kg.toString(),
      buying_cost_per_kg: product.buying_cost_per_kg ? product.buying_cost_per_kg.toString() : "",
      current_stock: product.current_stock.toString(),
      min_stock: product.min_stock.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim() || !formData.price_per_kg) {
      const errMsg = "Please fill in the product name and selling price per KG.";
      setModalError(errMsg);
      await alert({
        title: "Validation Error",
        message: errMsg,
        type: "warning",
      });
      return;
    }

    if (!editingProduct && formData.current_stock === "") {
      const errMsg = "Please enter the initial stock quantity in KG.";
      setModalError(errMsg);
      await alert({
        title: "Initial Stock Required",
        message: errMsg,
        type: "warning",
      });
      return;
    }

    if (formData.min_stock === "") {
      const errMsg = "Please enter the minimum alert stock level in KG.";
      setModalError(errMsg);
      await alert({
        title: "Minimum Stock Required",
        message: errMsg,
        type: "warning",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category_id: Number(formData.category_id),
        price_per_kg: parseFloat(formData.price_per_kg),
        buying_cost_per_kg: formData.buying_cost_per_kg ? parseFloat(formData.buying_cost_per_kg) : undefined,
        current_stock: parseFloat(formData.current_stock),
        min_stock: parseFloat(formData.min_stock),
        unit: "KG",
      };

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, payload);
      } else {
        await productsService.createProduct(payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.message || "Failed to save product.";
      setModalError(msg);
      await alert({
        title: "Error Saving Product",
        message: msg,
        type: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const isActivating = !product.is_active;
    const confirmed = await confirm({
      title: isActivating ? "Activate Meat Cut" : "Deactivate Meat Cut",
      message: isActivating
        ? `Make "${product.name}" active and visible on the POS terminal?`
        : `Deactivate "${product.name}"? It will no longer be sellable on the POS terminal until re-activated.`,
      confirmText: isActivating ? "Yes, Activate" : "Yes, Deactivate",
      cancelText: "Cancel",
      type: isActivating ? "success" : "warning",
    });

    if (!confirmed) return;

    try {
      await productsService.toggleStatus(product.id);
      fetchProducts();
    } catch (e: any) {
      await alert({
        title: "Status Update Failed",
        message: e.message || "Failed to update product status.",
        type: "danger",
      });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = await confirm({
      title: "Delete Meat Cut",
      message: `Are you sure you want to delete "${product.name}" (${product.sku})?\n\nThis will permanently remove this meat cut from inventory and POS terminal. This action cannot be undone.`,
      confirmText: "Yes, Delete Product",
      cancelText: "No, Keep Product",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await productsService.deleteProduct(product.id);
      fetchProducts();
    } catch (e: any) {
      await alert({
        title: "Delete Failed",
        message: e.message || "Failed to delete product.",
        type: "danger",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Products & Meat Cuts
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage your butcher inventory cuts, pricing per KG, minimum thresholds, and availability.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Cut</span>
        </button>
      </div>

      {/* ── FILTER CONSOLE (collapsed by default) ── */}
      {(() => {
        const activeFiltersCount = [search.trim(), categoryFilter !== "all", statusFilter !== "all"].filter(Boolean).length;
        return (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Header / Toggle */}
            <div className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 transition-colors ${isFilterOpen || activeFiltersCount > 0 ? "border-b border-zinc-200" : ""}`}>
              <div
                onClick={() => setIsFilterOpen((v) => !v)}
                className="flex items-center gap-2.5 cursor-pointer select-none group flex-1"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${isFilterOpen || activeFiltersCount > 0 ? "bg-green-500/10 border-green-600/20" : "bg-zinc-100 border-zinc-200"}`}>
                  <Filter className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider group-hover:text-green-700 transition-colors">Filter Products</span>
                    {activeFiltersCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white">{activeFiltersCount} Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {isFilterOpen ? "Click to collapse" : activeFiltersCount > 0 ? `${activeFiltersCount} filter(s) applied. Click to expand.` : "Filter cuts by name, category, or status."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setCurrentPage(1); }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all active:scale-95"
                  >
                    <X className="w-3 h-3" /> Reset ({activeFiltersCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${isFilterOpen ? "bg-zinc-900 text-white border-zinc-900" : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{isFilterOpen ? "Close" : "Open Filters"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Collapsible body */}
            {isFilterOpen && (
              <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white">
                {/* Search */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-3 h-3 text-zinc-400" /> Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      placeholder="Cut name or SKU..."
                      className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                    />
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {search && (
                      <button type="button" onClick={() => { setSearch(""); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-zinc-400" /> Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-zinc-400" /> Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="low_stock">Low Stock Only</option>
                  </select>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {activeFiltersCount > 0 && (
              <div className="px-3 sm:px-4 py-2 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active:</span>
                {search.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-medium">
                    🔍 &quot;{search}&quot;
                    <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {categoryFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                    🥩 {categories.find((c) => String(c.id) === categoryFilter)?.name || categoryFilter}
                    <button onClick={() => setCategoryFilter("all")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                    🏷️ {statusFilter.replace("_", " ").toUpperCase()}
                    <button onClick={() => setStatusFilter("all")}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Products Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 pl-4">Cut Name</th>
                <th className="py-3.5 px-3">SKU</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3 text-right">Selling Price / KG</th>
                <th className="py-3.5 px-3 text-right">Cost Price / KG</th>
                <th className="py-3.5 px-3 text-right">Current Stock</th>
                <th className="py-3.5 px-3 text-right">Min Stock</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No meat products found matching your search.
                  </td>
                </tr>
              ) : (
                paginated.data.map((product) => {
                  const isLow = product.current_stock <= product.min_stock;
                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-100">
                            <MeatImage category={product.category_name} name={product.name} />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 block">{product.name}</span>
                            <span className="text-[10px] text-zinc-500">{product.unit} Unit</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-500">{product.sku}</td>
                      <td className="py-3 px-3 text-zinc-700">{product.category_name}</td>
                      <td className="py-3 px-3 text-right font-bold text-green-700 tabular-nums text-sm">
                        {formatCurrency(product.price_per_kg)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-zinc-600 font-semibold">
                        {product.buying_cost_per_kg ? formatCurrency(product.buying_cost_per_kg) : <span className="text-zinc-300 font-normal">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold tabular-nums">
                        <span className={isLow ? "text-amber-700" : "text-zinc-800"}>
                          {formatWeight(product.current_stock)}
                        </span>
                        {isLow && (
                          <span className="block text-[9px] font-semibold text-amber-600">
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                        {formatWeight(product.min_stock)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${product.is_active
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                            }`}
                          title={`Click to ${product.is_active ? "deactivate" : "activate"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-green-600" : "bg-zinc-400"
                              }`}
                          />
                          <span>{product.is_active ? "Active" : "Inactive"}</span>
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors shadow-2xs"
                            title="Edit meat cut"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors shadow-2xs"
                            title="Delete meat cut"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-zinc-50/60 border-t border-zinc-100">
          <Pagination
            currentPage={paginated.current_page}
            lastPage={paginated.last_page}
            total={paginated.total}
            from={paginated.from}
            to={paginated.to}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">
                {editingProduct ? "Edit Meat Cut" : "Add New Meat Cut"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Beef Ribeye"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="BF-RIB-01"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-mono placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Selling Price / KG (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price_per_kg}
                    onChange={(e) => setFormData({ ...formData, price_per_kg: e.target.value })}
                    placeholder="950"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-green-700 font-bold focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Buying Cost / KG (KSh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.buying_cost_per_kg}
                    onChange={(e) => setFormData({ ...formData, buying_cost_per_kg: e.target.value })}
                    placeholder="720"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    {editingProduct ? "Current Stock (KG)" : "Initial Stock (KG)"}
                    {!editingProduct && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required={!editingProduct}
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="e.g. 42.5"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-bold placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Minimum Alert Stock (KG) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isSaving ? "Saving..." : editingProduct ? "Update Cut" : "Create Cut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
