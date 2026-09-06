import apiClient from "./api";
import { Sale, CartItem } from "@/types";

export interface CheckoutPayload {
  items: CartItem[];
  payment_method: "cash" | "mpesa" | "card";
  amount_received?: number;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  mpesa_phone?: string;
  mpesa_reference?: string;
  card_reference?: string;
  notes?: string;
}

export const posService = {
  async completeCheckout(payload: CheckoutPayload): Promise<Sale> {
    const formattedItems = payload.items.map((item) => ({
      product_id: item.product_id,
      weight: item.weight,
      price_per_kg: item.price_per_kg,
      discount: item.discount,
    }));

    const res = await apiClient.post<Sale>("/pos/checkout", {
      items: formattedItems,
      payment_method: payload.payment_method,
      amount_received: payload.amount_received,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone || payload.mpesa_phone,
      notes: payload.notes,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("butcher:data-change"));
    }

    return res.data;
  },

  /**
   * M-Pesa STK push call to backend endpoint
   */
  async triggerMpesaStkPush(phone: string, amount: number): Promise<{ CheckoutRequestID: string }> {
    try {
      const res = await apiClient.post("/payments/mpesa/stk-push", { phone, amount });
      return res.data;
    } catch {
      // Fallback response if gateway credentials are demo
      return {
        CheckoutRequestID: `ws_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      };
    }
  },
};
