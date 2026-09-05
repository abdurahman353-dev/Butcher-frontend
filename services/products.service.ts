import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
import { Product, Category, PaginatedResponse, PaginationParams } from "@/types";

export const productsService = {
  async getCategories(): Promise<Category[]> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<Category[]>("/categories");
        return res.data;
      }
    } catch {
      // Fall through to real-time local store
    }
    return realtimeStore.getCategories();
  },

  async getProducts(params?: PaginationParams): Promise<PaginatedResponse<Product>> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<PaginatedResponse<Product>>("/products", { params });
        return res.data;
      }
    } catch {
      // Fall through
    }

    let list = realtimeStore.getProducts();

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    if (params?.category_id && params.category_id !== "all") {
      const catId = Number(params.category_id);
      list = list.filter((p) => p.category_id === catId);
    }

    if (params?.status === "active") {
      list = list.filter((p) => p.is_active);
    } else if (params?.status === "inactive") {
      list = list.filter((p) => !p.is_active);
    } else if (params?.status === "low_stock") {
      list = list.filter((p) => p.current_stock <= p.min_stock);
    }

    const page = params?.page || 1;
    const perPage = params?.per_page || 20;
    const total = list.length;
    const from = (page - 1) * perPage;
    const paginated = list.slice(from, from + perPage);

    return {
      data: paginated,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
      total,
      from: from + 1,
      to: Math.min(from + perPage, total),
    };
  },

  async getProductById(id: number): Promise<Product | undefined> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.get<Product>(`/products/${id}`);
        return res.data;
      }
    } catch {}
    return realtimeStore.getProductById(id);
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Product>("/products", data);
        return res.data;
      }
    } catch {}
    return realtimeStore.saveProduct(data);
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.put<Product>(`/products/${id}`, data);
        return res.data;
      }
    } catch {}
    return realtimeStore.saveProduct({ ...data, id });
  },

  async toggleStatus(id: number): Promise<Product | undefined> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.patch<Product>(`/products/${id}/toggle-status`);
        return res.data;
      }
    } catch {}
    return realtimeStore.toggleProductStatus(id);
  },
};
