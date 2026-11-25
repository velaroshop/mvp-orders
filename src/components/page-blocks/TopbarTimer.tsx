"use client";

import { useEffect, useState } from "react";
import type { TopbarTimerBlock } from "@/lib/page-blocks";
import { bucharestDateKey, bucharestDayStartIso, shiftDateKey } from "@/lib/romania-time";

/** End of the offer: 00:00 (Romania time) after the day that is `days` days from today (0 = tonight at midnight) */
function deadlineFor(now: Date, days: number): number {
  return new Date(bucharestDayStartIso(shiftDateKey(bucharestDateKey(now), days + 1))).getTime();
}

const pad = (n: number) => String(n).padStart(2, "0");

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d > 0 ? `${d}z ` : ""}${pad(h)}:${pad(m)}:${pad(s)}`;
}

const TEXT_TOKENS = /\{(azi|mâine|data|zi)\}/g;

/** "25 noiembrie" for a "YYYY-MM-DD" key (noon UTC keeps the calendar day whatever the visitor's time zone) */
const dayMonth = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("ro-RO", { day: "numeric", month: "long", timeZone: "UTC" });
const weekday = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("ro-RO", { weekday: "long", timeZone: "UTC" });

/** Replaces {azi}, {mâine}, {data} (expiry day) and {zi} (weekday of the expiry day) with Romania dates */
function fillTokens(text: string, now: Date, days: number): string {
  const today = bucharestDateKey(now);
  const expiry = shiftDateKey(today, days);
  return text.replace(TEXT_TOKENS, (_m, token: string) => {
    if (token === "azi") return dayMonth(today);
    if (token === "mâine") return dayMonth(shiftDateKey(today, 1));
    if (token === "data") return dayMonth(expiry);
    return weekday(expiry);
  });
}

/**
 * Top bar with a discount badge, an offer name and either a countdown to midnight of "today + days" (Romania time)
 * or a highlighted text. The countdown restarts for the next day when it reaches zero: it is a daily rolling deadline,
 * not a fixed date.
 */
export default function TopbarTimer({ block }: { block: TopbarTimerBlock }) {
  const textMode = block.mode === "text";
  const hasTokens = textMode && /\{(azi|mâine|data|zi)\}/.test(block.expiresText);

  // Nothing is shown until the page is hydrated: the time depends on the visitor's clock
  const [remaining, setRemaining] = useState<string | null>(null);
  const [filledText, setFilledText] = useState<string | null>(null);

  useEffect(() => {
    if (textMode) return;
    let deadline = deadlineFor(new Date(), block.days);
    const tick = () => {
      const now = new Date();
      if (now.getTime() >= deadline) deadline = deadlineFor(now, block.days);
      setRemaining(format(deadline - now.getTime()));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [block.days, textMode]);

  // Dates depend on the day: filled in after hydration (a cached page must not show yesterday's date) and refreshed every minute
  useEffect(() => {
    if (!hasTokens) return;
    const update = () => setFilledText(fillTokens(block.expiresText, new Date(), block.days));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hasTokens, block.expiresText, block.days]);

  return (
    <div className="space-y-1 leading-tight">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {block.label && <span className="font-bold uppercase tracking-wide">{block.label}</span>}
        {block.discount && (
          <span className="rounded px-2 py-0.5 font-bold" style={{ backgroundColor: block.discountBg, color: block.discountColor }}>
            {block.discount}
          </span>
        )}
        {textMode ? (
          block.expiresText && (
            <span
              className="rounded px-2 py-0.5 font-bold uppercase tracking-wide"
              style={{ backgroundColor: block.textBg, color: block.textColor, visibility: hasTokens && filledText === null ? "hidden" : undefined }}
            >
              {hasTokens ? filledText ?? block.expiresText : block.expiresText}
            </span>
          )
        ) : (
          <span className="font-normal opacity-90">
            {block.expiresLabel}{" "}
            <span className="font-bold tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }} aria-live="off">
              {remaining ?? "--:--:--"}
            </span>
          </span>
        )}
      </div>
      {block.offerName && <div className="font-bold uppercase tracking-wide">{block.offerName}</div>}
    </div>
  );
}
