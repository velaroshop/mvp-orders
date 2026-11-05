// Net profit over a period, from placed orders. Money is net of VAT (the company is a VAT payer: VAT on revenue is not income,
// VAT on courier and packaging is deducted), ad spend has no VAT (reverse charge).
//
// Per order: delivered = revenue minus product cost minus courier + packaging; returned = courier + packaging only (the product
// goes back to stock, only the way there is paid); confirmed but still travelling = counted with the delivered/returned ratio of
// the parcels that already have a final status (an estimate); not confirmed or cancelled = nothing.

export interface ProfitParams {
  vat: number;          // 0.21 when the company charges VAT, else 0
  courierPack: number;  // courier + packaging per shipped parcel, without VAT
  fixedMonthly: number; // fixed costs per month, spread evenly over the days
}

export type OrderOutcome = "delivered" | "returned" | "transit" | "unconfirmed";

const CONFIRMED_STATUSES = ["confirmed", "scheduled"];
const SHIPPED_FINAL = ["Delivered", "Returned", "Returning"];
const RETURNED = ["Returned", "Returning"];

export function orderOutcome(status: string, trackingStatus: string | null): OrderOutcome {
  if (trackingStatus === "Delivered") return "delivered";
  if (trackingStatus === "Cancelled") return "unconfirmed"; // never delivered, no courier cost counted
  if (trackingStatus != null && RETURNED.includes(trackingStatus)) return "returned";
  const confirmed = CONFIRMED_STATUSES.includes(status) || (trackingStatus != null && SHIPPED_FINAL.includes(trackingStatus));
  return confirmed ? "transit" : "unconfirmed";
}

export interface DayBucket {
  placed: number;
  unconfirmed: number;
  delivered: number;
  returned: number;
  transit: number;
  deliveredRevenue: number; // order totals, VAT included
  transitRevenue: number;
  deliveredCost: number;    // product cost of the orders
  transitCost: number;
  missingCost: number;      // delivered or travelling orders with a product without a purchase price
}

export function emptyDay(): DayBucket {
  return { placed: 0, unconfirmed: 0, delivered: 0, returned: 0, transit: 0, deliveredRevenue: 0, transitRevenue: 0, deliveredCost: 0, transitCost: 0, missingCost: 0 };
}

export function addOrder(day: DayBucket, o: { status: string; tracking_status: string | null; total: number; cost: number; costMissing: boolean }) {
  day.placed += 1;
  const outcome = orderOutcome(o.status, o.tracking_status);
  if (outcome === "unconfirmed") day.unconfirmed += 1;
  else if (outcome === "returned") day.returned += 1;
  else if (outcome === "delivered") {
    day.delivered += 1;
    day.deliveredRevenue += o.total;
    day.deliveredCost += o.cost;
    if (o.costMissing) day.missingCost += 1;
  } else {
    day.transit += 1;
    day.transitRevenue += o.total;
    day.transitCost += o.cost;
    if (o.costMissing) day.missingCost += 1;
  }
}

/** "YYYY-MM-DD" days from `from` to `to`, both included */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  for (let t = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10)); t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function daysInMonth(monthKey: string): number {
  return new Date(Date.UTC(+monthKey.slice(0, 4), +monthKey.slice(5, 7), 0)).getUTCDate();
}

export interface ProfitResult {
  from: string;
  to: string;
  placed: number;
  unconfirmed: number;
  delivered: number;
  returned: number;
  transit: number;
  deliveredRate: number;      // delivered / (delivered + returned), used for the parcels still travelling
  revenueNet: number;         // delivered + estimated share of the travelling ones
  productCost: number;
  courier: number;            // every shipped parcel, returned included
  ads: number;
  fixed: number;
  profit: number;
  estimate: { parcels: number; profit: number }; // part of the profit that comes from parcels without a final status
  missingCost: number;
  adsDays: number;            // days of the period with Meta data
  days: number;
}

export function computeProfit(
  buckets: Record<string, DayBucket>,
  ads: Record<string, number>,
  from: string,
  to: string,
  p: ProfitParams,
  fallbackDeliveredRate: number,
  forcedDeliveredRate?: number // a day on its own has few final parcels: the month's rate is used instead
): ProfitResult {
  const dayList = daysBetween(from, to);
  const sum = emptyDay();
  let adsTotal = 0;
  let adsDays = 0;
  let fixed = 0;
  for (const day of dayList) {
    const b = buckets[day];
    if (b) for (const k of Object.keys(sum) as (keyof DayBucket)[]) sum[k] += b[k];
    if (ads[day] != null) {
      adsTotal += ads[day];
      adsDays += 1;
    }
    fixed += p.fixedMonthly / daysInMonth(day.slice(0, 7));
  }

  const resolved = sum.delivered + sum.returned;
  const deliveredRate = forcedDeliveredRate ?? (resolved > 0 ? sum.delivered / resolved : fallbackDeliveredRate);
  const net = (amount: number) => amount / (1 + p.vat);

  const transitRevenueNet = net(sum.transitRevenue) * deliveredRate;
  const transitCost = sum.transitCost * deliveredRate;
  const transitCourier = sum.transit * p.courierPack;

  const revenueNet = net(sum.deliveredRevenue) + transitRevenueNet;
  const productCost = sum.deliveredCost + transitCost;
  const courier = (sum.delivered + sum.returned + sum.transit) * p.courierPack;
  const profit = revenueNet - productCost - courier - adsTotal - fixed;

  return {
    from, to,
    placed: sum.placed, unconfirmed: sum.unconfirmed, delivered: sum.delivered, returned: sum.returned, transit: sum.transit,
    deliveredRate, revenueNet, productCost, courier, ads: adsTotal, fixed, profit,
    estimate: { parcels: sum.transit, profit: transitRevenueNet - transitCost - transitCourier },
    missingCost: sum.missingCost,
    adsDays, days: dayList.length,
  };
}
