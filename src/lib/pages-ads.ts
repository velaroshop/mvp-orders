import { supabaseAdmin } from "@/lib/supabase";
import { bucharestDayEndIso, bucharestDayStartIso, shiftDateKey } from "@/lib/romania-time";
import { fetchAdInsights, fetchAdStatuses, type MetaAdInsightRow } from "@/lib/meta-ads";
import { loadBreakEven } from "@/lib/break-even-data";
import { buildAdIndex, cpaTrend, diagnose, judgeAd, normalizeKey, resolveAd, type AdThresholds, type Funnel } from "@/lib/ads-verdict";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/** The columns of a visit that the per-ad analysis needs */
export type AdsVisit = {
  slug: string;
  utm_campaign: string | null;
  utm_content: string | null;
  form_seen: boolean;
  form_started: boolean;
  ordered: boolean;
};

type AdAgg = Funnel & { slugs: Map<string, number> };
const emptyAgg = (): AdAgg => ({ visits: 0, formSeen: 0, started: 0, ordered: 0, slugs: new Map() });
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;

/** Visits of a period reduced to the columns needed to count orders per ad (used for the previous period). */
async function fetchAdVisits(organizationId: string, from: string, to: string) {
  const rows: { slug: string; utm_campaign: string | null; utm_content: string | null; ordered: boolean }[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("page_visits")
      .select("slug, utm_campaign, utm_content, ordered")
      .eq("organization_id", organizationId)
      .gte("created_at", bucharestDayStartIso(from))
      .lte("created_at", bucharestDayEndIso(to))
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Per ad: spend from Meta + visits and orders from the own pages, the CPA against the break-even thresholds of the
 * product, a verdict (scale / watch / stop / too early), the trend against the previous period and a plain-words diagnosis.
 * Never throws: when Meta is not connected or fails, the rest of the statistics still load.
 */
export async function buildAds(organizationId: string, from: string, to: string, visits: AdsVisit[]) {
  try {
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("meta_ads_access_token, meta_ads_account_id")
      .eq("organization_id", organizationId)
      .maybeSingle();
    const token = settings?.meta_ads_access_token as string | undefined;
    if (!token) return { connected: false as const, error: "Meta Ads nu e conectat pentru această organizație (Setări → Meta Ads)." };

    const length = daysBetween(from, to);
    const prevTo = shiftDateKey(from, -1);
    const prevFrom = shiftDateKey(from, -length);

    // The ads live in several ad accounts: the ones the Meta dashboard already pulled data for (plus the default account)
    const { data: known } = await supabaseAdmin
      .from("ad_campaign_insights")
      .select("ad_account_id")
      .eq("organization_id", organizationId)
      .gte("date", shiftDateKey(from, -60))
      .order("date", { ascending: false })
      .limit(2000);
    const accounts = [...new Set([...(known ?? []).map((r: any) => r.ad_account_id as string), ...(settings?.meta_ads_account_id ? [settings.meta_ads_account_id as string] : [])])];
    if (accounts.length === 0) return { connected: false as const, error: "Nu există niciun cont de reclame cu date în sistem. Deschide întâi pagina Ads dashboard." };

    const perAccount = async <T,>(fetcher: (account: string) => Promise<T[]>) => (await Promise.all(accounts.map((a) => fetcher(a).catch((e) => { console.error("[Pages Ads]", a, String(e)); return [] as T[]; })))).flat();
    const statusesOf = async () => Object.assign({}, ...(await Promise.all(accounts.map((a) => fetchAdStatuses(token, a).catch(() => ({}))))));

    const [current, previous, statuses, prevVisits, breakEven, pages, landings, products] = await Promise.all([
      perAccount((a) => fetchAdInsights({ accessToken: token, adAccountId: a, since: from, until: to })),
      perAccount((a) => fetchAdInsights({ accessToken: token, adAccountId: a, since: prevFrom, until: prevTo })),
      statusesOf() as Promise<Record<string, string>>,
      fetchAdVisits(organizationId, prevFrom, prevTo),
      loadBreakEven(organizationId),
      supabaseAdmin.from("landing_page_content").select("slug, blocks").eq("organization_id", organizationId),
      supabaseAdmin.from("landing_pages").select("slug, product_id").eq("organization_id", organizationId),
      supabaseAdmin.from("products").select("id, name").eq("organization_id", organizationId),
    ]);

    // Page -> product -> break-even thresholds
    const productById = new Map((products.data ?? []).map((p: any) => [p.id, p.name as string]));
    const productOfLanding = new Map((landings.data ?? []).map((l: any) => [l.slug as string, productById.get(l.product_id) ?? null]));
    const productOfPage = new Map<string, string>();
    for (const page of pages.data ?? []) {
      const form = ((page as any).blocks ?? []).find((b: any) => b?.type === "form");
      const product = form?.landingSlug ? productOfLanding.get(form.landingSlug) : null;
      if (product && !productOfPage.has((page as any).slug)) productOfPage.set((page as any).slug, product);
    }
    const thresholdsOf = new Map<string, AdThresholds>();
    for (const row of breakEven.rows) {
      if (row.cpaMax != null && row.stopAbove != null && row.scaleBelow != null && row.cpaMax > 0) {
        thresholdsOf.set(row.product, { cpaMax: row.cpaMax, stopAbove: row.stopAbove, scaleBelow: row.scaleBelow });
      }
    }

    const index = buildAdIndex([...current, ...previous].map((a) => ({ adId: a.adId, adName: a.adName, campaignId: a.campaignId, campaignName: a.campaignName })));
    const metaById = new Map<string, MetaAdInsightRow>(current.map((a) => [a.adId, a]));
    const prevMetaById = new Map<string, MetaAdInsightRow>(previous.map((a) => [a.adId, a]));

    // Visits per ad (an ad = Meta ad id when the link matches one, otherwise the text of the link)
    const aggs = new Map<string, { agg: AdAgg; adIds: string[]; name: string; campaign: string; campaignId: string | null }>();
    const campaignAggs = new Map<string, AdAgg>();
    const pageFunnel = new Map<string, Funnel>();
    // Campaigns: the budget (CBO) is set there, so the scale / stop decision is taken per campaign
    const campaignNames = new Map<string, string>();
    const campaignByName = new Map<string, Set<string>>();
    for (const a of [...current, ...previous]) {
      campaignNames.set(a.campaignId, a.campaignName);
      const key = normalizeKey(a.campaignName);
      campaignByName.set(key, (campaignByName.get(key) ?? new Set()).add(a.campaignId));
    }
    const campaignIdOf = (campaign: string | null, content: string | null): string | null => {
      const ad = resolveAd(index, campaign, content);
      if (ad) return ad.refs[0].campaignId;
      const raw = (campaign ?? "").trim();
      if (!raw) return null;
      if (campaignNames.has(raw)) return raw;
      const ids = campaignByName.get(normalizeKey(raw)) ?? campaignByName.get(normalizeKey(raw.replace(/\+/g, " ")));
      return ids && ids.size === 1 ? [...ids][0] : null;
    };
    const keyOf = (campaign: string | null, content: string | null) => {
      const ad = resolveAd(index, campaign, content);
      if (ad) return { key: `ad:${ad.groupKey}`, adIds: ad.refs.map((r) => r.adId), name: ad.refs[0].adName || ad.refs[0].adId, campaign: ad.refs[0].campaignName };
      if (!content && !campaign) return null;
      return { key: `txt:${campaign ?? ""}|${content ?? ""}`, adIds: [] as string[], name: content || "(fără reclamă în link)", campaign: campaign || "(fără campanie)" };
    };
    for (const v of visits) {
      const page = pageFunnel.get(v.slug) ?? { visits: 0, formSeen: 0, started: 0, ordered: 0 };
      page.visits += 1;
      if (v.form_seen) page.formSeen += 1;
      if (v.form_started) page.started += 1;
      if (v.ordered) page.ordered += 1;
      pageFunnel.set(v.slug, page);

      const cid = campaignIdOf(v.utm_campaign, v.utm_content);
      if (cid) {
        const c = campaignAggs.get(cid) ?? emptyAgg();
        c.visits += 1;
        if (v.form_seen) c.formSeen += 1;
        if (v.form_started) c.started += 1;
        if (v.ordered) c.ordered += 1;
        c.slugs.set(v.slug, (c.slugs.get(v.slug) ?? 0) + 1);
        campaignAggs.set(cid, c);
      }

      const k = keyOf(v.utm_campaign, v.utm_content);
      if (!k) continue;
      const entry = aggs.get(k.key) ?? { agg: emptyAgg(), adIds: k.adIds, name: k.name, campaign: k.campaign, campaignId: cid };
      entry.agg.visits += 1;
      if (v.form_seen) entry.agg.formSeen += 1;
      if (v.form_started) entry.agg.started += 1;
      if (v.ordered) entry.agg.ordered += 1;
      entry.agg.slugs.set(v.slug, (entry.agg.slugs.get(v.slug) ?? 0) + 1);
      aggs.set(k.key, entry);
    }

    const prevOrders = new Map<string, number>();
    const prevCampaignOrders = new Map<string, number>();
    for (const v of prevVisits) {
      if (!v.ordered) continue;
      const cid = campaignIdOf(v.utm_campaign, v.utm_content);
      if (cid) prevCampaignOrders.set(cid, (prevCampaignOrders.get(cid) ?? 0) + 1);
      const k = keyOf(v.utm_campaign, v.utm_content);
      if (k) prevOrders.set(k.key, (prevOrders.get(k.key) ?? 0) + 1);
    }

    const sumOf = (map: Map<string, MetaAdInsightRow>, ids: string[]) => ids.reduce((sum, id) => sum + (map.get(id)?.spend ?? 0), 0);
    const rows = [...aggs.entries()].map(([key, { agg, adIds, name, campaign, campaignId }]) => {
      const adsets = [...new Set(adIds.map((id) => metaById.get(id)?.adsetName).filter(Boolean))] as string[];
      const slug = [...agg.slugs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const product = productOfPage.get(slug) ?? null;
      const thresholds = product ? thresholdsOf.get(product) ?? null : null;
      const spend = sumOf(metaById, adIds);
      const knownStatuses = adIds.map((id) => statuses[id]).filter(Boolean);
      const active = knownStatuses.length > 0 ? knownStatuses.some((st) => st === "ACTIVE") : null;
      const verdict = judgeAd({ spend, visits: agg.visits, orders: agg.ordered, active, thresholds });
      const trend = cpaTrend(spend, agg.ordered, sumOf(prevMetaById, adIds), prevOrders.get(key) ?? 0);
      return {
        key,
        name,
        campaign,
        campaignId,
        adset: adsets.length === 1 ? adsets[0] : adsets.length > 1 ? `${adsets.length} grupuri de reclame` : "",
        slug,
        product,
        active,
        spend,
        visits: agg.visits,
        formSeen: agg.formSeen,
        started: agg.started,
        ordered: agg.ordered,
        cpa: agg.ordered > 0 && spend > 0 ? spend / agg.ordered : null,
        cpaMax: thresholds?.cpaMax ?? null,
        scaleBelow: thresholds?.scaleBelow ?? null,
        stopAbove: thresholds?.stopAbove ?? null,
        verdict,
        trend: trend.trend,
        trendPct: trend.changePct,
        diagnosis: diagnose(agg, pageFunnel.get(slug) ?? agg),
      };
    });

    // Spend of ads that sent nobody to the own pages (other pages / stores): not judged, shown as a note
    const matchedIds = new Set([...aggs.values()].flatMap((e) => e.adIds));
    const other = current.filter((a) => a.spend > 0 && !matchedIds.has(a.adId)).sort((a, b) => b.spend - a.spend);

    const matchedAdIds = new Set([...aggs.values()].flatMap((e) => e.adIds));
    const campaigns = [...campaignAggs.entries()].map(([cid, agg]) => {
      const inCampaign = current.filter((a) => a.campaignId === cid);
      const spend = inCampaign.reduce((sum, a) => sum + a.spend, 0);
      const prevSpend = previous.filter((a) => a.campaignId === cid).reduce((sum, a) => sum + a.spend, 0);
      const slug = [...agg.slugs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const product = productOfPage.get(slug) ?? null;
      const thresholds = product ? thresholdsOf.get(product) ?? null : null;
      const known = [...current, ...previous].filter((a) => a.campaignId === cid).map((a) => statuses[a.adId]).filter(Boolean);
      const active = known.length > 0 ? known.some((st) => st === "ACTIVE") : null;
      const verdict = judgeAd({ spend, visits: agg.visits, orders: agg.ordered, active, thresholds, minOrdersScale: 10 });
      const trend = cpaTrend(spend, agg.ordered, prevSpend, prevCampaignOrders.get(cid) ?? 0);
      const idle = inCampaign.filter((a) => a.spend > 0 && !matchedAdIds.has(a.adId));
      return {
        key: cid,
        name: campaignNames.get(cid) ?? cid,
        slug,
        product,
        active,
        spend,
        visits: agg.visits,
        formSeen: agg.formSeen,
        started: agg.started,
        ordered: agg.ordered,
        cpa: agg.ordered > 0 && spend > 0 ? spend / agg.ordered : null,
        cpaMax: thresholds?.cpaMax ?? null,
        scaleBelow: thresholds?.scaleBelow ?? null,
        stopAbove: thresholds?.stopAbove ?? null,
        verdict,
        trend: trend.trend,
        trendPct: trend.changePct,
        adCount: inCampaign.filter((a) => a.spend > 0).length,
        idleAds: { count: idle.length, spend: idle.reduce((sum, a) => sum + a.spend, 0) },
      };
    });
    campaigns.sort((a, b) => b.spend - a.spend);

    rows.sort((a, b) => b.spend - a.spend || b.visits - a.visits);
    return {
      connected: true as const,
      rows,
      campaigns,
      otherSpend: { total: other.reduce((sum, a) => sum + a.spend, 0), count: other.length, top: other.slice(0, 14).map((a) => ({ name: a.adName, campaign: a.campaignName, spend: a.spend })) },
    };
  } catch (error) {
    console.error("[Pages Stats] ads failed:", error);
    return { connected: true as const, error: error instanceof Error ? error.message : "Nu am putut citi reclamele de la Meta", rows: [], campaigns: [] };
  }
}

