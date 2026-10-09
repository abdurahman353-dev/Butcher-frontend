import apiClient from "./api";
import { RestaurantTable, RestaurantBill, RestaurantBillItem, Sale } from "@/types";

export const restaurantService = {
  async getTables(): Promise<RestaurantTable[]> {
    const res = await apiClient.get<{ data: RestaurantTable[] }>("/restaurant/tables");
    return res.data.data;
  },

  async createTable(payload: {
    name: string;
    table_number: string;
    capacity?: number;
    zone?: string;
  }): Promise<RestaurantTable> {
    const res = await apiClient.post<{ data: RestaurantTable }>("/restaurant/tables", payload);
    return res.data.data;
  },

  async deleteTable(tableId: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/restaurant/tables/${tableId}`);
    return res.data;
  },

  async createBill(
    tableId: number,
    payload: {
      waiter_name?: string;
      waiter_pin?: string;
      guest_count?: number;
      customer_name?: string;
      customer_phone?: string;
      customer_address?: string;
      customer_id?: number;
      notes?: string;
    }
  ): Promise<RestaurantBill> {
    const res = await apiClient.post<{ data: RestaurantBill }>(`/restaurant/tables/${tableId}/bills`, payload);
    return res.data.data;
  },

  async updateBillCustomer(
    billId: number,
    payload: {
      customer_id?: number | null;
      customer_name?: string | null;
      customer_phone?: string | null;
      customer_address?: string | null;
    }
  ): Promise<{ message: string; data: RestaurantBill }> {
    const res = await apiClient.put<{ message: string; data: RestaurantBill }>(
      `/restaurant/bills/${billId}/customer`,
      payload
    );
    return res.data;
  },

  async verifyWaiterPin(pin: string): Promise<{ verified: boolean; user?: { id: number; name: string; role: string }; message?: string }> {
    const res = await apiClient.post<{ verified: boolean; user?: { id: number; name: string; role: string }; message?: string }>(
      "/restaurant/verify-waiter-pin",
      { pin }
    );
    return res.data;
  },

  async saveOrder(
    billId: number,
    payload: {
      items: RestaurantBillItem[];
      customer_name?: string;
      customer_phone?: string;
      customer_id?: number;
      waiter_name?: string;
      guest_count?: number;
      notes?: string;
    }
  ): Promise<{ message: string; data: RestaurantBill; table_status: string }> {
    const res = await apiClient.put<{ message: string; data: RestaurantBill; table_status: string }>(
      `/restaurant/bills/${billId}/save-order`,
      payload
    );
    return res.data;
  },

  async printBill(billId: number): Promise<{ message: string; data: RestaurantBill; table_status: string }> {
    const res = await apiClient.post<{ message: string; data: RestaurantBill; table_status: string }>(
      `/restaurant/bills/${billId}/print-bill`
    );
    return res.data;
  },

  async settleBill(
    billId: number,
    payload: {
      payment_method: string;
      amount_received?: number;
      mpesa_reference?: string;
      customer_id?: number;
      customer_name?: string;
      customer_phone?: string;
      notes?: string;
    }
  ): Promise<{ message: string; data: Sale; bill: RestaurantBill }> {
    const res = await apiClient.post<{ message: string; data: Sale; bill: RestaurantBill }>(
      `/restaurant/bills/${billId}/settle`,
      payload
    );
    return res.data;
  },

  async cancelBill(
    billId: number,
    reason?: string
  ): Promise<{ message: string; data: RestaurantBill; table_status: string }> {
    const res = await apiClient.post<{ message: string; data: RestaurantBill; table_status: string }>(
      `/restaurant/bills/${billId}/cancel`,
      { reason }
    );
    return res.data;
  },

  async lockTable(tableId: number): Promise<{ message: string; locked_by_name?: string }> {
    const res = await apiClient.post<{ message: string; locked_by_name?: string }>(
      `/restaurant/tables/${tableId}/lock`
    );
    return res.data;
  },

  async unlockTable(tableId: number): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(
      `/restaurant/tables/${tableId}/unlock`
    );
    return res.data;
  },

  async splitBill(
    billId: number,
    payload: {
      items: { product_id: number; quantity: number }[];
      target_bill_id?: number | null;
      customer_name?: string;
      customer_phone?: string;
      notes?: string;
    }
  ): Promise<{ message: string; source_bill: RestaurantBill; target_bill: RestaurantBill }> {
    const res = await apiClient.post<{
      message: string;
      source_bill: RestaurantBill;
      target_bill: RestaurantBill;
    }>(`/restaurant/bills/${billId}/split`, payload);
    return res.data;
  },
};
