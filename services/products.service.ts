import apiClient from "./api";
import { Product, Category, PaginatedResponse, PaginationParams } from "@/types";

export const productsService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get<Category[]>("/categories");
    return res.data;
  },

  async getProducts(params?: PaginationParams): Promise<PaginatedResponse<Product>> {
    const res = await apiClient.get<PaginatedResponse<Product>>("/products", { params });
    return res.data;
  },

  async getProductById(id: number): Promise<Product | undefined> {
    const res = await apiClient.get<Product>(`/products/${id}`);
    return res.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await apiClient.post<Product>("/products", data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const res = await apiClient.put<Product>(`/products/${id}`, data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async toggleStatus(id: number): Promise<Product | undefined> {
    const res = await apiClient.patch<Product>(`/products/${id}/toggle-status`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
    return res.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }
  },
};
