"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { productsService, BulkProductInput } from "@/services/products.service";
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
  Upload,
  Download,
  Rows3,
  FileSpreadsheet,
  Loader2,
  Trash,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    unit: "KG",
    price_per_kg: "",
    buying_cost_per_kg: "",
    current_stock: "",
    min_stock: "10",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Add Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<"grid" | "csv">("grid");
  const [bulkRows, setBulkRows] = useState<Array<{
    name: string; sku: string; category_id: number; unit: string;
    price_per_kg: string; buying_cost_per_kg: string;
    current_stock: string; min_stock: string;
  }>>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkValidated, setBulkValidated] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ count: number; errors?: string[] } | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const blankRow = () => ({
    name: "", sku: "",
    category_id: 0,
    unit: "KG",
    price_per_kg: "", buying_cost_per_kg: "",
    current_stock: "", min_stock: "",
  });

  const openBulkModal = () => {
    setBulkTab("grid");
    setBulkRows([blankRow(), blankRow(), blankRow()]);
    setBulkResult(null);
    setBulkValidated(false);
    setCsvPreviewRows([]);
    setCsvError(null);
    setIsBulkModalOpen(true);
  };

  const addBulkRows = (n = 1) => setBulkRows(r => [...r, ...Array.from({ length: n }, blankRow)]);

  const updateBulkRow = (i: number, field: string, val: string | number) =>
    setBulkRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const removeBulkRow = (i: number) => setBulkRows(r => r.filter((_, idx) => idx !== i));

  const clearBlankRows = () => setBulkRows(r => r.filter(row => row.name.trim() !== ""));

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setCsvError("CSV file appears empty."); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      }).filter(r => r["name"] || r["product name"]);
      setCsvPreviewRows(rows);
      setCsvError(null);
      // Build bulk rows from CSV
      const mapped = rows.map(r => {
        const catName = (r["category"] || "").toLowerCase();
        const cat = categories.find(c => c.name.toLowerCase() === catName);
        return {
          name: r["name"] || r["product name"] || "",
          sku: r["sku"] || "",
          category_id: cat?.id || categories[0]?.id || 0,
          unit: (r["unit"] || "KG").toUpperCase(),
          price_per_kg: r["price per kg"] || r["price_per_kg"] || r["price"] || "",
          buying_cost_per_kg: r["buying cost"] || r["buying_cost_per_kg"] || "",
          current_stock: r["initial stock"] || r["current_stock"] || r["stock"] || "0",
          min_stock: r["min stock"] || r["min_stock"] || "10",
        };
      });
      setBulkRows(mapped);
    };
    reader.onerror = () => setCsvError("Failed to read file.");
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const catList = categories.map(c => c.name).join(" | ");
    const header = `name,sku,category,unit,price per kg,buying cost,initial stock,min stock`;
    const example1 = `Prime Rib,,Beef,KG,1200,,50,10`;
    const example2 = `Beef Sausages 250g,,Sausages,PACK,220,,40,10`;
    const note = `# Available categories: ${catList}`;
    const csv = `${header}\n${example1}\n${example2}\n${note}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = "bulk_products_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkSave = async () => {
    setBulkValidated(true);

    // Find rows the user has started filling (has at least a name or any field)
    const filledRows = bulkRows.filter(r =>
      r.name.trim() || r.price_per_kg || r.category_id || r.current_stock || r.min_stock
    );

    if (filledRows.length === 0) {
      await alert({ title: "Nothing to Import", message: "Please fill in at least one product row.", type: "warning" });
      return;
    }

    // Collect per-row errors for required fields
    const rowErrors: string[] = [];
    filledRows.forEach((r, idx) => {
      const rowNum = bulkRows.indexOf(r) + 1;
      if (!r.name.trim())              rowErrors.push(`Row ${rowNum}: Product Name is required.`);
      if (!r.category_id)              rowErrors.push(`Row ${rowNum}: Category is required.`);
      if (!r.price_per_kg)             rowErrors.push(`Row ${rowNum}: Price per KG is required.`);
      if (r.buying_cost_per_kg === "") rowErrors.push(`Row ${rowNum}: Buying Cost per KG is required.`);
      if (r.current_stock === "")      rowErrors.push(`Row ${rowNum}: Initial Stock is required.`);
      if (r.min_stock === "")          rowErrors.push(`Row ${rowNum}: Min Stock is required.`);
    });

    if (rowErrors.length > 0) {
      setBulkResult({ count: 0, errors: rowErrors });
      return;
    }

    // All rows valid — submit
    const validRows = filledRows;
    setIsBulkSaving(true);
    setBulkResult(null);
    try {
      const payload: BulkProductInput[] = validRows.map(r => ({
        name: r.name.trim(),
        sku: r.sku.trim() || undefined,
        category_id: Number(r.category_id),
        price_per_kg: parseFloat(r.price_per_kg),
        buying_cost_per_kg: parseFloat(r.buying_cost_per_kg),
        current_stock: parseFloat(r.current_stock),
        min_stock: parseFloat(r.min_stock),
        unit: r.unit || "KG",
      }));
      const res = await productsService.bulkCreateProducts(payload);
      setBulkResult({ count: res.count });
      setBulkValidated(false);
      fetchProducts();
    } catch (err: any) {
      const errData = err?.response?.data;
      setBulkResult({ count: 0, errors: errData?.errors || [err.message || "Import failed."] });
    } finally {
      setIsBulkSaving(false);
    }
  };

  const fetchProducts = useCallback(async (manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
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
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
      unit: "KG",
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
      unit: product.unit || "KG",
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

    if (formData.buying_cost_per_kg === "") {
      const errMsg = "Please enter the buying cost per KG.";
      setModalError(errMsg);
      await alert({
        title: "Buying Cost Required",
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
        buying_cost_per_kg: parseFloat(formData.buying_cost_per_kg),
        current_stock: parseFloat(formData.current_stock),
        min_stock: parseFloat(formData.min_stock),
        unit: formData.unit || "KG",
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

  if (isLoading && paginated.data.length === 0) {
    return <PageSkeleton variant="table" title="Products & Meat Cuts" />;
  }

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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openBulkModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Rows3 className="w-4 h-4" />
            <span>Bulk Add</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Cut</span>
          </button>
        </div>
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
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${product.unit === "PACK" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-zinc-100 text-zinc-600"}`}>
                              {product.unit || "KG"}
                            </span>
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
                          {formatWeight(product.current_stock, product.unit)}
                        </span>
                        {isLow && (
                          <span className="block text-[9px] font-semibold text-amber-600">
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500 tabular-nums">
                        {formatWeight(product.min_stock, product.unit)}
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Unit Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-semibold focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                  >
                    <option value="KG">KG (Weight)</option>
                    <option value="PACK">PACK (Package)</option>
                    <option value="PCS">PCS (Pieces)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
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
                    Selling Price / {formData.unit === "PACK" ? "Pack" : formData.unit === "PCS" ? "Pc" : "KG"} (KSh) <span className="text-rose-500">*</span>
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
                    Buying Cost / {formData.unit === "PACK" ? "Pack" : formData.unit === "PCS" ? "Pc" : "KG"} (KSh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
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
      {/* ── BULK ADD MODAL ── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-5xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Rows3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Bulk Add Products</h3>
                  <p className="text-xs text-blue-100">Import multiple cuts at once — fast, reliable, isolated to your company</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsBulkModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-5 pt-4 flex items-center gap-1 border-b border-zinc-100">
              <button type="button" onClick={() => setBulkTab("grid")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${bulkTab === "grid" ? "border-blue-600 text-blue-700 bg-blue-50/50" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
                <Rows3 className="w-3.5 h-3.5" /> Quick Grid Entry
              </button>
              <button type="button" onClick={() => setBulkTab("csv")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${bulkTab === "csv" ? "border-blue-600 text-blue-700 bg-blue-50/50" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> CSV File Import
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Success / Error Result Banner */}
              {bulkResult && (
                <div className={`rounded-xl p-3 flex items-start gap-2.5 text-xs ${bulkResult.errors ? "bg-red-50 border border-red-200 text-red-800" : "bg-emerald-50 border border-emerald-200 text-emerald-800"}`}>
                  {bulkResult.errors
                    ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />}
                  <div className="space-y-1">
                    {bulkResult.errors
                      ? <><p className="font-semibold">Import failed. Please fix the errors below:</p>{bulkResult.errors.map((e, i) => <p key={i}>{e}</p>)}</>
                      : <p className="font-semibold">✅ {bulkResult.count} product{bulkResult.count !== 1 ? "s" : ""} imported successfully! Your inventory is updated.</p>}
                  </div>
                </div>
              )}

              {bulkTab === "grid" && (
                <>
                  {/* Grid action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => addBulkRows(1)}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                    <button type="button" onClick={() => addBulkRows(5)}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> + 5 Rows
                    </button>
                    <button type="button" onClick={clearBlankRows}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1">
                      <Trash className="w-3.5 h-3.5" /> Clear Blank
                    </button>
                    <span className="ml-auto text-xs text-zinc-400">{bulkRows.filter(r => r.name.trim()).length} of {bulkRows.length} rows filled</span>
                  </div>

                  {/* Scrollable grid table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-xs min-w-[860px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                          <tr>
                            <th className="text-left p-2 pl-3 font-semibold text-zinc-600 w-6">#</th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[160px]">Product Name <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[80px]">SKU</th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[130px]">Category <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[95px]">Unit <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[100px]">Price/KG <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[100px]">Buy Cost/KG <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[90px]">Stock (KG) <span className="text-red-500">*</span></th>
                            <th className="text-left p-2 font-semibold text-zinc-600 min-w-[80px]">Min Stock <span className="text-red-500">*</span></th>
                            <th className="p-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {bulkRows.map((row, i) => {
                            const isFilled = row.name.trim() || row.price_per_kg || row.category_id || row.buying_cost_per_kg || row.current_stock || row.min_stock;
                            const isRowValid = row.name.trim() && row.category_id && row.price_per_kg && row.buying_cost_per_kg !== "" && row.current_stock !== "" && row.min_stock !== "";
                            // Per-field error classes (only show red after user clicked Import)
                            const errName    = bulkValidated && isFilled && !row.name.trim();
                            const errCat     = bulkValidated && isFilled && !row.category_id;
                            const errPrice   = bulkValidated && isFilled && !row.price_per_kg;
                            const errBuying  = bulkValidated && isFilled && row.buying_cost_per_kg === "";
                            const errStock   = bulkValidated && isFilled && row.current_stock === "";
                            const errMinStk  = bulkValidated && isFilled && row.min_stock === "";
                            const fieldBase  = "w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-1 transition-colors";
                            const ok         = `${fieldBase} border-zinc-200 focus:ring-blue-500 focus:border-blue-500`;
                            const err        = `${fieldBase} border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500`;
                            return (
                              <tr key={i} className={`${isRowValid ? "bg-white" : isFilled ? "bg-red-50/20" : "bg-zinc-50/40"} hover:bg-blue-50/20 transition-colors`}>
                                <td className="p-2 pl-3 text-zinc-400 font-mono">
                                  {bulkValidated && isFilled && !isRowValid
                                    ? <span className="text-red-400 font-bold">!</span>
                                    : i + 1}
                                </td>
                                <td className="p-1.5">
                                  <input value={row.name} onChange={e => updateBulkRow(i, "name", e.target.value)}
                                    className={errName ? err : ok} />
                                </td>
                                <td className="p-1.5">
                                  <input value={row.sku} onChange={e => updateBulkRow(i, "sku", e.target.value)}
                                    className={ok} />
                                </td>
                                <td className="p-1.5">
                                  <select value={row.category_id} onChange={e => updateBulkRow(i, "category_id", Number(e.target.value))}
                                    className={errCat ? err : ok}>
                                    <option value={0}>— Select —</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon && `${c.icon} `}{c.name}</option>)}
                                  </select>
                                </td>
                                <td className="p-1.5">
                                  <select value={row.unit || "KG"} onChange={e => updateBulkRow(i, "unit", e.target.value)}
                                    className={ok}>
                                    <option value="KG">KG</option>
                                    <option value="PACK">PACK</option>
                                    <option value="PCS">PCS</option>
                                  </select>
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={row.price_per_kg} onChange={e => updateBulkRow(i, "price_per_kg", e.target.value)}
                                    min="0" step="0.01"
                                    className={errPrice ? err : ok} />
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={row.buying_cost_per_kg} onChange={e => updateBulkRow(i, "buying_cost_per_kg", e.target.value)}
                                    min="0" step="0.01"
                                    className={errBuying ? err : ok} />
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={row.current_stock} onChange={e => updateBulkRow(i, "current_stock", e.target.value)}
                                    min="0" step="0.1"
                                    className={errStock ? err : ok} />
                                </td>
                                <td className="p-1.5">
                                  <input type="number" value={row.min_stock} onChange={e => updateBulkRow(i, "min_stock", e.target.value)}
                                    min="0"
                                    className={errMinStk ? err : ok} />
                                </td>
                                <td className="p-1.5 text-center">
                                  <button type="button" onClick={() => removeBulkRow(i)}
                                    className="w-6 h-6 rounded-md hover:bg-red-50 hover:text-red-500 text-zinc-400 flex items-center justify-center transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {bulkTab === "csv" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={downloadCsvTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs">
                      <Download className="w-4 h-4" /> Download CSV Template
                    </button>
                    <span className="text-xs text-zinc-500">Fill the template with your products, then upload it below.</span>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                    onDragLeave={() => setCsvDragOver(false)}
                    onDrop={e => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseCsvFile(f); }}
                    onClick={() => csvFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${csvDragOver ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
                  >
                    <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-700">Drop your CSV file here</p>
                    <p className="text-xs text-zinc-400 mt-1">or click to browse — .csv files only</p>
                    <input ref={csvFileRef} type="file" accept=".csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) parseCsvFile(f); e.target.value = ""; }} />
                  </div>

                  {csvError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {csvError}
                    </div>
                  )}

                  {csvPreviewRows.length > 0 && (
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700">{csvPreviewRows.length} rows detected from CSV</span>
                        <button type="button" onClick={() => { setCsvPreviewRows([]); setBulkRows([]); }}
                          className="text-xs text-red-500 hover:text-red-700">Clear</button>
                      </div>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-zinc-50 sticky top-0">
                            <tr>{Object.keys(csvPreviewRows[0]).map(h => <th key={h} className="text-left p-2 font-semibold text-zinc-600 border-b border-zinc-100">{h}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {csvPreviewRows.slice(0, 20).map((row, i) => (
                              <tr key={i} className="hover:bg-zinc-50">
                                {Object.values(row).map((v, j) => <td key={j} className="p-2 text-zinc-700">{v || <span className="text-zinc-300 italic">—</span>}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvPreviewRows.length > 20 && <p className="p-2 text-center text-xs text-zinc-400">+ {csvPreviewRows.length - 20} more rows…</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-400">
                  {bulkRows.filter(r => r.name.trim() && r.price_per_kg).length} valid product{bulkRows.filter(r => r.name.trim() && r.price_per_kg).length !== 1 ? "s" : ""} ready to import
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsBulkModalOpen(false)} disabled={isBulkSaving}
                    className="px-5 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50 transition-colors">
                    {bulkResult?.count ? "Done" : "Cancel"}
                  </button>
                  {!bulkResult?.count && (
                    <button type="button" onClick={handleBulkSave} disabled={isBulkSaving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-2">
                      {isBulkSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importing…</> : <><Upload className="w-3.5 h-3.5" />Import Products</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
