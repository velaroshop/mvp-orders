"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Shape of GET /api/thank-you/verify (same endpoint the Shopify thank-you embed uses)
export interface ThankYouOrderDetails {
  productName?: string;
  productQuantity?: number;
  upsells?: { name: string; quantity: number; price: number }[];
  subtotal?: number;
  shippingCost?: number;
  total?: number;
}

export interface ThankYouData {
  orderId: string;
  status: string;
  customerName?: string;
  showPostsale?: boolean;
  queueExpiresAt?: string;
  orderDetails?: ThankYouOrderDetails;
}

interface ThankYouContextValue {
  orderId: string;
  loading: boolean;
  error: string | null;
  data: ThankYouData | null;
}

const ThankYouContext = createContext<ThankYouContextValue | null>(null);

/** null outside the thank-you page: order blocks render nothing there */
export function useThankYou() {
  return useContext(ThankYouContext);
}

export default function ThankYouProvider({ orderId, children }: { orderId: string; children: ReactNode }) {
  const [state, setState] = useState<Omit<ThankYouContextValue, "orderId">>({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/thank-you/verify?order=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Order not found");
        return (await res.json()) as ThankYouData;
      })
      .then((data) => !cancelled && setState({ loading: false, error: null, data }))
      .catch((err) => !cancelled && setState({ loading: false, error: err instanceof Error ? err.message : "Error", data: null }));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return <ThankYouContext.Provider value={{ orderId, ...state }}>{children}</ThankYouContext.Provider>;
}
