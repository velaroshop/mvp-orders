// CPA break-even per product + scale/stop verdict.
// Thresholds come from mature orders (final delivery/return status); the CPA that gets compared
// to them comes from the last closed days (ad spend / placed orders), so recent returns don't matter.

export interface BreakEvenParams {
  vat: number;         // VAT applied to AOV: net = AOV / (1 + vat)
  courierPack: number; // courier + packaging per shipped order (no VAT)
  returnBack: number;  // courier paid on the way back for a refused parcel (0: returns cost nothing)
  upsellCost: number;  // product cost of the upsell, per order that has one
  stopMult: number;
  scaleMult: number;
  minOrdersThreshold: number; // mature orders below this => unreliable threshold
  minOrdersScale: number;     // orders in the 7-day window needed to recommend scaling
  minSpendStopMult: number;   // spend in the 3-day window needed to recommend stopping, as multiple of CPA max
}

export const DEFAULT_PARAMS: BreakEvenParams = {
  vat: 0.21,
  courierPack: 15,
  returnBack: 0,
  upsellCost: 5,
  stopMult: 1.5,
  scaleMult: 0.7,
  minOrdersThreshold: 30,
  minOrdersScale: 10,
  minSpendStopMult: 2,
};

export interface OrderForThreshold {
  total: number | string | null;
  status: string;
  tracking_status: string | null;
  offer_code: string | null;
  upsells: unknown;
  quantity: number;
}

export interface ThresholdResult {
  placed: number;
  confirmed: number;
  delivered: number;
  returned: number;
  unresolved: number;
  aov: number;
  net: number;
  avgQty: number;
  upsellShare: number;
  confRate: number;
  retRate: number;
  productCost: number | null;
  costDelivered: number | null;
  returnLoss: number;
  profitDelivered: number | null;
  cpaMax: number | null;
  stopAbove: number | null;
  scaleBelow: number | null;
  mix: Record<string, number>;
}

const CONFIRMED_STATUSES = ["confirmed", "scheduled"];
const SHIPPED_FINAL = ["Delivered", "Returned", "Returning"];
const RETURNED = ["Returned", "Returning"];

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));

function hasUpsell(u: unknown): boolean {
  let x = u;
  if (typeof x === "string") {
    try { x = JSON.parse(x); } catch { return false; }
  }
  return Array.isArray(x) && x.length > 0;
}

export function computeThreshold(
  orders: OrderForThreshold[],
  unitCost: number | null,
  p: BreakEvenParams
): ThresholdResult {
  const placed = orders.length;
  const confirmed = orders.filter(
    (o) => CONFIRMED_STATUSES.includes(o.status) || (o.tracking_status != null && SHIPPED_FINAL.includes(o.tracking_status))
  );
  const delivered = confirmed.filter((o) => o.tracking_status === "Delivered").length;
  const returned = confirmed.filter((o) => o.tracking_status != null && RETURNED.includes(o.tracking_status)).length;
  const resolved = delivered + returned;

  const aov = placed ? orders.reduce((s, o) => s + num(o.total), 0) / placed : 0;
  const net = aov / (1 + p.vat);
  const avgQty = placed ? orders.reduce((s, o) => s + num(o.quantity), 0) / placed : 0;
  const upsellShare = placed ? orders.filter((o) => hasUpsell(o.upsells)).length / placed : 0;

  const confRate = placed ? confirmed.length / placed : 0;
  const retRate = resolved ? returned / resolved : 0;

  const productCost = unitCost == null ? null : unitCost * avgQty;
  const costDelivered = productCost == null ? null : productCost + p.courierPack + p.upsellCost * upsellShare;
  const returnLoss = p.courierPack + p.returnBack; // the product comes back to stock

  let profitDelivered: number | null = null;
  let cpaMax: number | null = null;
  if (costDelivered != null && placed > 0) {
    profitDelivered = net - costDelivered;
    cpaMax = profitDelivered * confRate * (1 - retRate) - returnLoss * confRate * retRate;
  }

  const mix: Record<string, number> = {};
  for (const o of orders) {
    const k = o.offer_code || "?";
    mix[k] = (mix[k] || 0) + 1;
  }

  return {
    placed, confirmed: confirmed.length, delivered, returned, unresolved: confirmed.length - resolved,
    aov, net, avgQty, upsellShare, confRate, retRate,
    productCost, costDelivered, returnLoss, profitDelivered,
    cpaMax,
    stopAbove: cpaMax == null ? null : cpaMax * p.stopMult,
    scaleBelow: cpaMax == null ? null : cpaMax * p.scaleMult,
    mix,
  };
}

export type VerdictCode = "stop" | "scale" | "hold" | "insufficient" | "nocost" | "nohistory" | "inactive";

export interface Verdict {
  code: VerdictCode;
  reason: string;
}

export interface RecentWindow {
  spend: number;
  orders: number;
  cpa: number | null;
}

export function recentWindow(spend: number, orders: number): RecentWindow {
  return { spend, orders, cpa: orders > 0 && spend > 0 ? spend / orders : null };
}

export function decide(
  t: ThresholdResult,
  unitCostKnown: boolean,
  w3: RecentWindow,
  w7: RecentWindow,
  p: BreakEvenParams
): Verdict {
  if (!unitCostKnown) return { code: "nocost", reason: "Lipsește cost produs (import_price)" };
  if (t.placed === 0 || t.cpaMax == null) return { code: "nohistory", reason: "Nicio comandă matură pentru prag" };
  if (w7.spend === 0) return { code: "inactive", reason: "Fără cheltuială mapată în ultimele 7 zile" };

  const max = t.cpaMax;
  if (max <= 0) return { code: "stop", reason: "Pierdere pe comandă chiar înainte de reclame" };

  const stopAbove = t.stopAbove as number;
  const scaleBelow = t.scaleBelow as number;

  if (w3.spend >= p.minSpendStopMult * max && (w3.orders === 0 || (w3.cpa as number) > stopAbove)) {
    return { code: "stop", reason: `CPA 3z ${w3.cpa == null ? "fără comenzi" : w3.cpa.toFixed(1)} peste ${stopAbove.toFixed(1)}` };
  }
  if (w7.orders >= p.minOrdersScale && (w7.cpa as number) < scaleBelow && w3.orders >= 1 && (w3.cpa as number) < max) {
    return { code: "scale", reason: `CPA 7z ${(w7.cpa as number).toFixed(1)} sub ${scaleBelow.toFixed(1)}, 3z sub CPA maxim` };
  }
  if (w3.cpa != null && w3.cpa > stopAbove) {
    return { code: "insufficient", reason: "CPA 3z mare, dar cheltuiala e încă prea mică pentru decizie" };
  }
  if (w7.cpa != null && w7.cpa < scaleBelow) {
    return { code: "insufficient", reason: `CPA 7z bun, dar sub ${p.minOrdersScale} comenzi sau 3z nu confirmă` };
  }
  return { code: "hold", reason: "Între praguri" };
}

// ---- Campaign -> product matching by name ----

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Returns the matched product name, "ambiguous", or null. */
export function matchCampaign(campaignName: string, productNames: string[]): string | "ambiguous" | null {
  const camp = ` ${normalizeName(campaignName)} `;
  const full: string[] = [];
  const partial: string[] = [];
  for (const name of productNames) {
    const norm = normalizeName(name);
    if (!norm) continue;
    if (camp.includes(` ${norm} `)) { full.push(name); continue; }
    const tokens = norm.split(" ").filter((t) => t.length >= 5);
    if (tokens.some((t) => camp.includes(` ${t} `))) partial.push(name);
  }
  const hits = full.length ? full : partial;
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return "ambiguous";
  return null;
}
