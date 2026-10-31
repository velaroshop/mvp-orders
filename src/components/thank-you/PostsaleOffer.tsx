"use client";

import { useEffect, useRef, useState } from "react";
import type { PostsaleOfferBlock } from "@/lib/page-blocks";
import { useThankYou } from "./ThankYouProvider";

const GOLD = "#FFD700";

function secondsUntil(iso: string | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export default function PostsaleOffer({ block }: { block: PostsaleOfferBlock }) {
  const ctx = useThankYou();
  const upsell = ctx?.data?.postsaleUpsells?.[0];
  const expiresAt = ctx?.data?.queueExpiresAt;

  const [tick, setSeconds] = useState<number | null>(null);
  const seconds = tick ?? secondsUntil(expiresAt);
  const declineRef = useRef(ctx?.declinePostsale);
  declineRef.current = ctx?.declinePostsale;

  // Countdown from the server-side expiry; at zero the order is finalized without the offer (same as the Shopify embed)
  useEffect(() => {
    if (!upsell || ctx?.phase !== "offer") return;
    setSeconds(secondsUntil(expiresAt));
    const interval = setInterval(() => {
      const remaining = secondsUntil(expiresAt);
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        void declineRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [upsell, expiresAt, ctx?.phase]);

  if (!ctx || !upsell) return null;

  const discount = upsell.srp > 0 ? Math.round(((upsell.srp - upsell.price) / upsell.srp) * 100) : 0;
  const disabled = ctx.busy;

  return (
    <div className="px-4 py-2">
      <style>{`
        @keyframes postsalePulse { 0%,100% { opacity: 1 } 50% { opacity: .7 } }
        @keyframes postsaleBounce { 0%,100% { transform: translateY(0) rotate(0deg) } 50% { transform: translateY(-5px) rotate(3deg) } }
        @media (prefers-reduced-motion: reduce) { .postsale-anim { animation: none !important } }
      `}</style>

      <div className="mx-auto flex max-w-[400px] flex-col items-center">
        <div
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5"
          style={{ backgroundColor: `${block.accent}26`, borderColor: `${block.accent}66`, color: block.accent }}
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[13px] font-bold">{block.confirmedText}</span>
        </div>

        <p
          className="mb-1 text-center text-xl font-extrabold leading-tight"
          style={{ color: GOLD, textShadow: "0 0 15px #FFD700, 0 0 30px #FFA500, 0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {block.headline}
        </p>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1">
          <span className="text-xs font-semibold tracking-wide text-red-400">{block.timerLabel}</span>
          <span className="text-sm font-extrabold tabular-nums text-red-300">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>

        {upsell.mediaUrl && (
          <div className="relative mb-4 w-[92%]">
            <div
              className="postsale-anim absolute -inset-1 rounded-[20px] opacity-60 blur-[15px]"
              style={{ background: "linear-gradient(135deg, #ffd700, #ff6b6b, #ffd700)", animation: "postsalePulse 3s ease-in-out infinite" }}
              aria-hidden="true"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upsell.mediaUrl} alt={upsell.title} className="relative h-auto w-full rounded-2xl shadow-2xl" />
            {discount > 0 && (
              <div
                className="postsale-anim absolute -right-2.5 -top-2.5 flex h-[70px] w-[70px] items-center justify-center rounded-full text-xl font-black text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #22c55e, #15803d)", animation: "postsaleBounce 1s ease-in-out infinite" }}
              >
                -{discount}%
              </div>
            )}
          </div>
        )}

        <h2 className="mb-2 text-center text-xl font-bold leading-snug text-white">{upsell.title}</h2>

        {upsell.description && (
          <p className="mb-4 px-2 text-center text-sm leading-relaxed text-slate-300">{upsell.description}</p>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <span className="text-lg text-slate-400 opacity-80">{upsell.srp.toFixed(2)} LEI</span>
          <span className="text-base text-slate-500" aria-hidden="true">
            →
          </span>
          <span className="text-[32px] font-black" style={{ color: block.accent, textShadow: `0 0 20px ${block.accent}80` }}>
            {upsell.price.toFixed(2)} LEI
          </span>
        </div>

        {block.urgencyText && <p className="mb-5 text-center text-sm font-semibold text-amber-400">{block.urgencyText}</p>}

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => void ctx.declinePostsale()}
            disabled={disabled}
            className="w-full rounded-xl border border-slate-600 bg-slate-500/15 px-6 py-3.5 text-[15px] font-semibold text-slate-300 transition-colors hover:bg-slate-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "SE PROCESEAZĂ..." : block.declineText}
          </button>
          <button
            type="button"
            onClick={() => void ctx.acceptPostsale(upsell)}
            disabled={disabled}
            className="w-full rounded-xl px-6 py-[18px] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 20px rgba(34, 197, 94, 0.4)" }}
          >
            {disabled ? "SE PROCESEAZĂ..." : block.acceptText}
          </button>
        </div>
      </div>
    </div>
  );
}
