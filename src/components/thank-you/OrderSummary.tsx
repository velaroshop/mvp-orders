"use client";

import type { OrderSummaryBlock } from "@/lib/page-blocks";
import { useThankYou } from "./ThankYouProvider";

const MUTED = "#94a3b8";
const money = (value: number) => `${value.toFixed(2)} RON`;

export default function OrderSummary({ block }: { block: OrderSummaryBlock }) {
  const ctx = useThankYou();
  if (!ctx) return null; // not on the thank-you page

  const box = { backgroundColor: block.bg, borderColor: `${block.accent}55`, color: block.color };

  if (ctx.loading) {
    return (
      <div className="px-4 py-2">
        <div className="rounded-2xl border p-5 text-center text-sm" style={box}>
          Se încarcă comanda…
        </div>
      </div>
    );
  }

  const details = ctx.data?.orderDetails;
  if (ctx.error || !details) {
    return (
      <div className="px-4 py-2">
        <div className="rounded-2xl border p-5 text-center text-sm" style={box}>
          Nu am putut încărca detaliile comenzii.
        </div>
      </div>
    );
  }

  // An offer accepted on this page is added to the lines and to the total (the API response predates it)
  const accepted = ctx.accepted;
  const upsells = [...(details.upsells ?? []), ...(accepted ? [accepted] : [])];
  const shipping = details.shippingCost ?? 0;
  const total = (details.total ?? 0) + (accepted ? accepted.price * accepted.quantity : 0);

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl border p-5" style={box}>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: MUTED }}>
          {block.heading}
        </p>

        {details.productName && (
          <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
            <span>
              {details.productQuantity ?? 1}x {details.productName}
            </span>
            <span className="whitespace-nowrap" style={{ color: MUTED }}>
              {money(details.subtotal ?? 0)}
            </span>
          </div>
        )}

        {upsells.length > 0 && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: `${block.accent}33` }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
              Produse în ofertă
            </p>
            {upsells.map((upsell, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                <span>
                  {upsell.quantity}x {upsell.name}
                </span>
                <span className="whitespace-nowrap" style={{ color: MUTED }}>
                  {money(upsell.price * upsell.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm" style={{ borderColor: `${block.accent}33`, color: MUTED }}>
          <span>Livrare</span>
          <span>{shipping > 0 ? money(shipping) : "GRATUITĂ"}</span>
        </div>

        <div className="mt-2 flex items-center justify-between border-t-2 pt-3" style={{ borderColor: `${block.accent}66` }}>
          <span className="font-bold" style={{ color: "#ffffff" }}>
            Total de plată:
          </span>
          <span className="text-lg font-extrabold" style={{ color: block.accent }}>
            {money(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
