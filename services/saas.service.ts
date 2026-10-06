import apiClient from "./api";
import { SaasCompany, SaasSummary } from "@/types";

export interface CreateCompanyPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  business_type?: "butchery" | "restaurant";
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_phone?: string;
  subscription_starts_at: string;
  duration_days?: number;
  plan?: "monthly_30d" | "lifetime";
}

export interface CreateCompanyResponse {
  message: string;
  company: {
    id: number;
    name: string;
    slug: string;
    status: string;
    business_type?: "butchery" | "restaurant";
    plan: string;
    subscription_starts_at: string;
    subscription_ends_at: string | null;
    remaining_seconds: number;
  };
  superadmin: {
    id: number;
    name: string;
    email: string;
    password?: string;
  };
}

export const saasService = {
  async getCompanies(): Promise<{ companies: SaasCompany[]; summary: SaasSummary }> {
    const res = await apiClient.get<{ companies: SaasCompany[]; summary: SaasSummary }>("/saas/companies");
    return res.data;
  },

  async createCompany(payload: CreateCompanyPayload): Promise<CreateCompanyResponse> {
    const res = await apiClient.post<CreateCompanyResponse>("/saas/companies", payload);
    return res.data;
  },

  async updateCompany(
    companyId: number,
    payload: Partial<CreateCompanyPayload>
  ): Promise<{ message: string; company: any }> {
    const res = await apiClient.put<{ message: string; company: any }>(`/saas/companies/${companyId}`, payload);
    return res.data;
  },

  async toggleBlock(companyId: number): Promise<{ message: string; is_blocked_manually: boolean; status: string }> {
    const res = await apiClient.post(`/saas/companies/${companyId}/toggle-block`);
    return res.data;
  },

  async extendSubscription(companyId: number, days = 30): Promise<{ message: string; subscription_ends_at: string; remaining_seconds: number; is_active: boolean; status: string }> {
    const res = await apiClient.post(`/saas/companies/${companyId}/extend-subscription`, { days });
    return res.data;
  },

  async reduceSubscription(companyId: number, days: number): Promise<{ message: string; subscription_ends_at: string; remaining_seconds: number; is_active: boolean; status: string }> {
    const res = await apiClient.post(`/saas/companies/${companyId}/reduce-subscription`, { days });
    return res.data;
  },

  async updateSubscription(
    companyId: number,
    payload: { subscription_starts_at: string; subscription_ends_at: string }
  ): Promise<{ message: string }> {
    const res = await apiClient.put(`/saas/companies/${companyId}/subscription`, payload);
    return res.data;
  },

  async setLifetime(companyId: number): Promise<{ message: string; plan: string; remaining_seconds: number }> {
    const res = await apiClient.post(`/saas/companies/${companyId}/set-lifetime`);
    return res.data;
  },

  async deleteCompany(companyId: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/saas/companies/${companyId}`);
    return res.data;
  },

  async enterCompany(companyId: number): Promise<{ message: string; user: any; company: any; impersonate?: boolean; token?: string }> {
    const res = await apiClient.post<{ message: string; user: any; company: any; impersonate?: boolean; token?: string }>(`/saas/companies/${companyId}/enter`);
    return res.data;
  },

  async leaveCompany(): Promise<{ message: string; user: any }> {
    const res = await apiClient.post<{ message: string; user: any }>('/saas/leave-company');
    return res.data;
  },
};

