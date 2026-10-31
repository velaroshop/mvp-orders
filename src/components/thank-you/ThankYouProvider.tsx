"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Shape of GET /api/thank-you/verify (same endpoint the Shopify thank-you embed uses)
export interface ThankYouOrderDetails {
  productName?: string;
  productQuantity?: number;
  upsells?: { name: string; quantity: number; price: number }[];
  subtotal?: number;
  shippingCost?: number;
  total?: number;
}

export interface PostsaleUpsell {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
  srp: number;
  mediaUrl?: string;
  productId: string;
  productSku?: string;
  productName?: string;
}

export interface ThankYouData {
  orderId: string;
  status: string;
  customerName?: string;
  showPostsale?: boolean;
  queueExpiresAt?: string;
  postsaleUpsells?: PostsaleUpsell[];
  orderDetails?: ThankYouOrderDetails;
}

export interface AcceptedPostsale {
  name: string;
  quantity: number;
  price: number;
}

/** "offer": the postsale offer is open; "final": order settled (also when there is no offer) */
export type ThankYouPhase = "loading" | "offer" | "final";

interface ThankYouContextValue {
  orderId: string;
  loading: boolean;
  error: string | null;
  data: ThankYouData | null;
  phase: ThankYouPhase;
  accepted: AcceptedPostsale | null;
  busy: boolean;
  acceptPostsale: (upsell: PostsaleUpsell) => Promise<void>;
  /** Finalizes the order without the offer (button "no thanks" and the countdown reaching zero) */
  declinePostsale: () => Promise<void>;
}

const ThankYouContext = createContext<ThankYouContextValue | null>(null);

/** null outside the thank-you page: order blocks render nothing there */
export function useThankYou() {
  return useContext(ThankYouContext);
}

const RETRY_MESSAGE = "A apărut o eroare. Te rugăm să reîncarci pagina.";

export default function ThankYouProvider({ orderId, children }: { orderId: string; children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: ThankYouData | null; phase: ThankYouPhase }>({
    loading: true,
    error: null,
    data: null,
    phase: "loading",
  });
  const [accepted, setAccepted] = useState<AcceptedPostsale | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/thank-you/verify?order=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Order not found");
        return (await res.json()) as ThankYouData;
      })
      .then((data) => {
        if (cancelled) return;
        const hasOffer = !!data.showPostsale && (data.postsaleUpsells?.length ?? 0) > 0;
        setState({ loading: false, error: null, data, phase: hasOffer ? "offer" : "final" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: err instanceof Error ? err.message : "Error", data: null, phase: "final" });
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // One request at a time (a double click must not send the offer twice)
  const run = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      console.error("Thank-you action failed:", error);
      alert(RETRY_MESSAGE);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const acceptPostsale = useCallback(
    (upsell: PostsaleUpsell) =>
      run(async () => {
        const response = await fetch(`/api/orders/${orderId}/add-postsale-upsell`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upsellId: upsell.id,
            title: upsell.title,
            quantity: upsell.quantity,
            price: upsell.price,
            productId: upsell.productId,
            productSku: upsell.productSku,
            productName: upsell.productName,
          }),
        });
        if (!response.ok) throw new Error("Failed to add postsale upsell");
        setAccepted({ name: upsell.productName || upsell.title, quantity: upsell.quantity, price: upsell.price });
        setState((prev) => ({ ...prev, phase: "final" }));
      }),
    [orderId, run],
  );

  const declinePostsale = useCallback(
    () =>
      run(async () => {
        const response = await fetch(`/api/orders/${orderId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to finalize order");
        setState((prev) => ({ ...prev, phase: "final" }));
      }),
    [orderId, run],
  );

  return (
    <ThankYouContext.Provider value={{ orderId, ...state, accepted, busy, acceptPostsale, declinePostsale }}>
      {children}
      {state.phase === "loading" && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center text-sm text-slate-300">
          Se încarcă…
        </div>
      )}
    </ThankYouContext.Provider>
  );
}
