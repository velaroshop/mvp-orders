"use client";

import { useThankYou } from "./ThankYouProvider";

/** Message + "see all products" button, from the store settings (same data the Shopify thank-you embed uses) */
export default function StoreCta() {
  const cta = useThankYou()?.data?.thankYouCta;
  if (!cta?.url) return null;

  const lines = cta.message.split("\n");

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl border border-slate-400/30 bg-white/5 px-4 py-[18px] text-center">
        <p className="mb-3.5 text-[15px] leading-relaxed text-slate-200">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
        <a
          href={cta.url}
          className="block rounded-xl px-3 py-4 text-lg font-extrabold"
          style={{ backgroundColor: cta.buttonColor, color: cta.buttonTextColor }}
        >
          {cta.buttonText}
        </a>
      </div>
    </div>
  );
}
