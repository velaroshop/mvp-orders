import { bucharestDateKey, bucharestDayEndIso, bucharestDayStartIso, shiftDateKey } from "@/lib/romania-time";

// Time filters of the partials page. Days are calendar days in Romania; "3 zile" = today and the 2 days before it.

export type PartialPeriod = "today" | "yesterday" | "3" | "7" | "30" | "all";

export const PARTIAL_PERIODS: { value: PartialPeriod; label: string }[] = [
  { value: "today", label: "Azi" },
  { value: "yesterday", label: "Ieri" },
  { value: "3", label: "3 zile" },
  { value: "7", label: "7 zile" },
  { value: "30", label: "30 zile" },
  { value: "all", label: "Tot" },
];

export function parsePartialPeriod(value: string | null | undefined, fallback: PartialPeriod): PartialPeriod {
  return PARTIAL_PERIODS.some((p) => p.value === value) ? (value as PartialPeriod) : fallback;
}

/** UTC bounds of the period; `null` = no bound on that side */
export function partialPeriodRange(period: PartialPeriod, now = new Date()): { start: string | null; end: string | null } {
  const today = bucharestDateKey(now);
  if (period === "all") return { start: null, end: null };
  if (period === "today") return { start: bucharestDayStartIso(today), end: null };
  if (period === "yesterday") {
    const yesterday = shiftDateKey(today, -1);
    return { start: bucharestDayStartIso(yesterday), end: bucharestDayEndIso(yesterday) };
  }
  return { start: bucharestDayStartIso(shiftDateKey(today, -(Number(period) - 1))), end: null };
}

/** Return rates only mean something over a long window: parcels of the last weeks have no final status yet */
export function showsReturnRate(period: PartialPeriod): boolean {
  return period === "30" || period === "all";
}
