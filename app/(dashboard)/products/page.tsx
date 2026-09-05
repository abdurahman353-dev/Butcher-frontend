"use client";

import React, { useState, useEffect, useCallback } from "react";
import { productsService } from "@/services/products.service";
import { Product, Category, PaginatedResponse } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { MeatImage } from "@/components/shared/MeatImage";
import { Pagination } from "@/components/shared/Pagination";
import {
  Package,
  Plus,
  Search,
  Edit2,
  X,
} from "lucide-react";

export default function ProductsPage() {
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Add or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
      const [cats, prods] = await Promise.all([
        productsService.getCategories(),
        productsService.getProducts({
          page: currentPage,
          per_page: 20,
          search,
          category_id: categoryFilter,
          status: statusFilter,
        }),
      ]);
      setCategories(cats);
      setPaginated(prods);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  }, [currentPage, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();

    const handleDataChange = () => fetchProducts();
    window.addEventListener("butcher:data-change", handleDataChange);
    return () => window.removeEventListener("butcher:data-change", handleDataChange);
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      category_id: categories[0]?.id || 1,
      price_per_kg: "",
      buying_cost_per_kg: "",
      current_stock: "0",
      min_stock: "10",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
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
    if (!formData.name.trim() || !formData.price_per_kg) {
      alert("Please fill in the product name and price per KG.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Product> = {
        name: formData.name,
        sku: formData.sku || undefined,
        category_id: Number(formData.category_id),
        price_per_kg: parseFloat(formData.price_per_kg),
        buying_cost_per_kg: formData.buying_cost_per_kg ? parseFloat(formData.buying_cost_per_kg) : undefined,
        current_stock: parseFloat(formData.current_stock) || 0,
        min_stock: parseFloat(formData.min_stock) || 10,
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
      alert(err.message || "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await productsService.toggleStatus(id);
      fetchProducts();
    } catch (e: any) {
      alert(e.message || "Failed to update status.");
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

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search cut name or SKU..."
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by category"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by stock status"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="low_stock">Low Stock Only</option>
          </select>
        </div>
      </div>

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
                <th className="py-3.5 px-3 text-right">Current Stock</th>
                <th className="py-3.5 px-3 text-right">Min Stock</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
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
                          onClick={() => handleToggleStatus(product.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                            product.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.is_active ? "bg-green-600" : "bg-zinc-400"
                            }`}
                          />
                          <span>{product.is_active ? "Active" : "Inactive"}</span>
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors shadow-2xs"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
                  placeholder="e.g. Prime Beef Ribeye"
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
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="42.5"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Minimum Alert Stock (KG)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    placeholder="10"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
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
