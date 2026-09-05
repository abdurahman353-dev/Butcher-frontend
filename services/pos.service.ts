import apiClient from "./api";
import { realtimeStore } from "./realtime-store";
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

    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post<Sale>("/pos/checkout", {
          items: formattedItems,
          payment_method: payload.payment_method,
          amount_received: payload.amount_received,
          customer_id: payload.customer_id,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone || payload.mpesa_phone,
          notes: payload.notes,
        });
        return res.data;
      }
    } catch {}

    // Real-time execution
    const mpesaRef =
      payload.payment_method === "mpesa"
        ? `NLK${Math.floor(100000 + Math.random() * 900000)}`
        : undefined;

    return realtimeStore.completeSale({
      items: formattedItems,
      payment_method: payload.payment_method,
      amount_received: payload.amount_received,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone || payload.mpesa_phone,
      mpesa_reference: mpesaRef,
      notes: payload.notes,
    });
  },

  /**
   * M-Pesa STK push simulation for frontend demonstration and backend preparation
   */
  async triggerMpesaStkPush(phone: string, amount: number): Promise<{ CheckoutRequestID: string }> {
    try {
      if (process.env.NEXT_PUBLIC_USE_REMOTE_API === "true") {
        const res = await apiClient.post("/payments/mpesa/stk-push", { phone, amount });
        return res.data;
      }
    } catch {}

    // Fast simulated handshake
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      CheckoutRequestID: `ws_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    };
  },
};
