// Verdict and diagnosis per ad for the own-pages statistics.
// Thresholds (cpaMax / stopAbove / scaleBelow) come from the break-even system (break-even-data.ts), so this screen and the
// break-even screen agree. The CPA here is the ad's spend (Meta) / orders placed from the own pages in the same period.

export interface AdThresholds {
  cpaMax: number;
  stopAbove: number;
  scaleBelow: number;
}

export type AdVerdictCode = "scale" | "watch" | "stop" | "early" | "paused" | "nospend" | "noprice";

export interface AdVerdict {
  code: AdVerdictCode;
  reason: string;
}

export interface AdJudgeInput {
  spend: number;
  visits: number;
  orders: number;
  active: boolean | null; // null = status unknown
  thresholds: AdThresholds | null;
  minOrdersScale?: number; // campaigns need more orders than a single ad before they are scaled
  recent3?: { spend: number; orders: number } | null; // last 3 days of the period (null when the period itself is that short)
  stopOnRecent3?: boolean; // default true; a single ad has too few orders in 3 days to be stopped on them (inside a CBO it is noise)
}

export const MIN_VISITS = 50; // below this (and a small spend) an ad is too new to judge
export const MIN_ORDERS_SCALE = 5;
export const MIN_SPEND_STOP_MULT = 2; // spend needed to stop an ad, as a multiple of the CPA max

const lei = (n: number) => `${Math.round(n)} lei`;

export function judgeAd(a: AdJudgeInput): AdVerdict {
  const t = a.thresholds;
  if (a.spend <= 0) return { code: "nospend", reason: "Nu am cheltuială de la Meta pentru această reclamă (ID sau nume care nu se potrivește)" };
  if (!t) return { code: "noprice", reason: "Lipsește pragul de CPA al produsului (costul produsului sau istoricul de comenzi)" };

  const cpa = a.orders > 0 ? a.spend / a.orders : null;
  const cpaText = cpa === null ? "fără comenzi" : `CPA ${lei(cpa)}`;

  if (a.active === false) return { code: "paused", reason: `Pauzată sau oprită. În perioadă: ${cpaText}, cheltuit ${lei(a.spend)}` };

  if (a.visits < MIN_VISITS && a.spend < t.cpaMax) {
    return { code: "early", reason: `Prea devreme: ${a.visits} vizite și ${lei(a.spend)} cheltuiți. Mai are nevoie de date` };
  }

  // Last 3 days: stop reacts fast, scale needs them to be in profit too (a good 7-day average can hide a fresh decline)
  const r3 = a.recent3 ?? null;
  const cpa3 = r3 && r3.orders > 0 ? r3.spend / r3.orders : null;
  const cpa3Text = r3 ? (cpa3 === null ? "ultimele 3 zile fără comenzi" : `ultimele 3 zile CPA ${lei(cpa3)}`) : "";
  const stop3 = (a.stopOnRecent3 ?? true) && r3 !== null && r3.spend >= MIN_SPEND_STOP_MULT * t.cpaMax && (cpa3 === null || cpa3 > t.stopAbove);

  if (a.spend >= MIN_SPEND_STOP_MULT * t.cpaMax && (cpa === null || cpa > t.stopAbove)) {
    return { code: "stop", reason: `${cpaText}, peste pragul de oprire (${lei(t.stopAbove)}), după ${lei(a.spend)} cheltuiți` };
  }
  if (stop3) {
    return { code: "stop", reason: `${cpaText} în perioadă, dar ${cpa3Text}, peste pragul de oprire (${lei(t.stopAbove)}), după ${lei(r3!.spend)} cheltuiți în 3 zile` };
  }
  if (cpa !== null && cpa < t.scaleBelow && a.orders >= (a.minOrdersScale ?? MIN_ORDERS_SCALE)) {
    if (r3 && (cpa3 === null || cpa3 > t.cpaMax)) {
      return { code: "watch", reason: `${cpaText} e bun, dar ${cpa3Text}, peste costul maxim (${lei(t.cpaMax)}). Nu scala până nu se repară` };
    }
    return { code: "scale", reason: `${cpaText}, sub pragul de scalare (${lei(t.scaleBelow)}), din ${a.orders} comenzi${cpa3 !== null ? `; ${cpa3Text}` : ""}` };
  }
  if (cpa !== null && cpa < t.scaleBelow) {
    return { code: "watch", reason: `${cpaText} e bun, dar sunt doar ${a.orders} comenzi. Mai așteaptă înainte să scalezi` };
  }
  if (cpa !== null && cpa <= t.cpaMax) {
    return { code: "watch", reason: `${cpaText}: în profit, dar fără marjă pentru scalare (pragul de scalare ${lei(t.scaleBelow)})` };
  }
  if (cpa !== null && cpa <= t.stopAbove) {
    return { code: "watch", reason: `${cpaText}: peste echilibru (${lei(t.cpaMax)}), încă sub pragul de oprire (${lei(t.stopAbove)})` };
  }
  return { code: "watch", reason: `${cpaText} e mare, dar cheltuiala (${lei(a.spend)}) e încă mică pentru o decizie` };
}

export type Trend = "better" | "worse" | "same" | null;

/** CPA now vs the previous period of the same length; a change of more than 15% counts. */
export function cpaTrend(spend: number, orders: number, prevSpend: number, prevOrders: number): { trend: Trend; changePct: number | null } {
  if (orders <= 0 || spend <= 0 || prevOrders <= 0 || prevSpend <= 0) return { trend: null, changePct: null };
  const change = (spend / orders - prevSpend / prevOrders) / (prevSpend / prevOrders);
  const changePct = Math.round(change * 100);
  return { trend: change <= -0.15 ? "better" : change >= 0.15 ? "worse" : "same", changePct };
}

export interface Funnel {
  visits: number;
  formSeen: number;
  started: number;
  ordered: number;
}

/**
 * Where an ad loses people compared to the average of the same page, in plain words.
 * Only said when there is enough data to be a signal (a few visits can show anything).
 */
export function diagnose(ad: Funnel, page: Funnel): string | null {
  if (ad.visits < 40 || page.visits < 100) return null;

  const rate = (num: number, den: number) => (den > 0 ? num / den : null);
  const steps = [
    { ratio: relative(rate(ad.formSeen, ad.visits), rate(page.formSeen, page.visits)), enough: true, text: "Mulți intră, dar puțini ajung la formular: reclama aduce public care nu rămâne pe pagină sau promite altceva decât găsește" },
    { ratio: relative(rate(ad.started, ad.formSeen), rate(page.started, page.formSeen)), enough: ad.formSeen >= 20, text: "Văd formularul, dar nu încep să-l completeze: oferta sau prețul nu convinge acest public" },
    { ratio: relative(rate(ad.ordered, ad.started), rate(page.ordered, page.started)), enough: ad.started >= 10, text: "Încep formularul, dar nu trimit comanda: fricțiune în formular sau ezitare la final" },
  ];
  const weak = steps.filter((s) => s.enough && s.ratio !== null && s.ratio < 0.75).sort((a, b) => (a.ratio as number) - (b.ratio as number));
  if (weak.length > 0) return weak[0].text;

  const overall = relative(rate(ad.ordered, ad.visits), rate(page.ordered, page.visits));
  if (overall !== null && overall >= 1.25) return `Convertește cu ${Math.round((overall - 1) * 100)}% peste media paginii`;
  return null;
}

function relative(value: number | null, base: number | null): number | null {
  if (value === null || base === null || base <= 0) return null;
  return value / base;
}

// ---- Ids and names in the links ----
// Some ads carry Meta ids in utm_campaign / utm_content, others carry names. Both end up on the same ad.

export interface AdRef {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
}

export const normalizeKey = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export interface AdIndex {
  byId: Map<string, AdRef>;
  byName: Map<string, AdRef[]>;
  groups: Map<string, AdRef[]>;
}

/** The same ad name inside the same campaign (several ad sets, copies) counts as one ad: its spend is added up. */
const groupKeyOf = (ad: AdRef) => `${ad.campaignId}|${normalizeKey(ad.adName) || ad.adId}`;

export function buildAdIndex(ads: AdRef[]): AdIndex {
  const byId = new Map<string, AdRef>();
  const byName = new Map<string, AdRef[]>();
  const groups = new Map<string, AdRef[]>();
  for (const ad of ads) {
    if (byId.has(ad.adId)) continue;
    byId.set(ad.adId, ad);
    groups.set(groupKeyOf(ad), [...(groups.get(groupKeyOf(ad)) ?? []), ad]);
    const key = normalizeKey(ad.adName);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), ad]);
  }
  return { byId, byName, groups };
}

export interface ResolvedAd {
  groupKey: string;
  refs: AdRef[];
}

/** The ad (group of identical ads) a visit came from, or null when the link does not match any ad of the account. */
export function resolveAd(index: AdIndex, campaign: string | null, content: string | null): ResolvedAd | null {
  const raw = (content ?? "").trim();
  if (!raw) return null;

  const byId = index.byId.get(raw);
  if (byId) {
    const groupKey = groupKeyOf(byId);
    return { groupKey, refs: index.groups.get(groupKey) ?? [byId] };
  }

  // In links, "+" stands for a space
  const candidates = index.byName.get(normalizeKey(raw)) ?? index.byName.get(normalizeKey(raw.replace(/\+/g, " ")));
  if (!candidates || candidates.length === 0) return null;

  const keys = [...new Set(candidates.map(groupKeyOf))];
  let groupKey: string | null = keys.length === 1 ? keys[0] : null;
  if (!groupKey) {
    // Same ad name in several campaigns: the campaign of the link decides
    const wanted = (campaign ?? "").trim();
    const wantedName = normalizeKey(wanted.replace(/\+/g, " "));
    const inCampaign = keys.filter((k) => candidates.some((c) => groupKeyOf(c) === k && (c.campaignId === wanted || normalizeKey(c.campaignName) === wantedName)));
    groupKey = inCampaign.length === 1 ? inCampaign[0] : null;
  }
  return groupKey ? { groupKey, refs: index.groups.get(groupKey) ?? [] } : null;
}
