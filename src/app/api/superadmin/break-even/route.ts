import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { bucharestDateKey, bucharestDayEndIso, bucharestDayStartIso, shiftDateKey } from "@/lib/romania-time";
import {
  DEFAULT_PARAMS,
  computeThreshold,
  decide,
  matchCampaign,
  recentWindow,
  type BreakEvenParams,
  type OrderForThreshold,
} from "@/lib/break-even";

const MATURITY_DAYS = 30; // orders newer than this don't have a final delivery/return status yet
const HISTORY_DAYS = 90;  // mature window used for the thresholds
const PAGE_SIZE = 1000;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

/**
 * GET /api/superadmin/break-even
 * Per product: CPA max / stop / scale thresholds (from mature orders), real CPA on the last
 * 3 and 7 closed days (ad spend of the product's campaigns / placed orders) and a verdict.
 * Read-only. Superadmin only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }
    const organizationId: string | undefined = user.activeOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    // Closed days only: today is incomplete (spend and orders still accumulating)
    const today = bucharestDateKey(new Date());
    const lastDay = shiftDateKey(today, -1);
    const start3 = shiftDateKey(today, -3);
    const start7 = shiftDateKey(today, -7);
    const matureFrom = shiftDateKey(today, -(MATURITY_DAYS + HISTORY_DAYS));
    const matureTo = shiftDateKey(today, -MATURITY_DAYS);

    const [settingsRes, productsRes, lps] = await Promise.all([
      supabaseAdmin
        .from("settings")
        .select("vat_enabled, courier_cost, packaging_cost")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabaseAdmin.from("products").select("id, name, import_price").eq("organization_id", organizationId),
      fetchAll<any>((f, t) =>
        supabaseAdmin
          .from("landing_pages")
          .select("slug, product_id, quantity_offer_1, quantity_offer_2, quantity_offer_3")
          .eq("organization_id", organizationId)
          .range(f, t)
      ),
    ]);

    const settings = settingsRes.data as any;
    const shipping = Number(settings?.courier_cost || 0) + Number(settings?.packaging_cost || 0);
    const params: BreakEvenParams = {
      ...DEFAULT_PARAMS,
      vat: settings?.vat_enabled ? DEFAULT_PARAMS.vat : 0,
      courierPack: shipping > 0 ? shipping : DEFAULT_PARAMS.courierPack,
    };

    const products = (productsRes.data || []) as { id: string; name: string; import_price: number | null }[];
    const productById = new Map(products.map((p) => [p.id, p]));
    const unitCostByName = new Map(products.map((p) => [p.name, p.import_price == null ? null : Number(p.import_price)]));
    const lpBySlug = new Map(lps.map((l: any) => [l.slug, l]));

    const productNameOf = (o: any): string => {
      const lp = lpBySlug.get(o.landing_key);
      return o.product_name || (lp?.product_id && productById.get(lp.product_id)?.name) || o.landing_key || "necunoscut";
    };

    const [matureOrders, recentOrders, insights] = await Promise.all([
      fetchAll<any>((f, t) =>
        supabaseAdmin
          .from("orders")
          .select("created_at, status, tracking_status, offer_code, product_name, product_quantity, total, upsells, landing_key")
          .eq("organization_id", organizationId)
          .neq("status", "testing")
          .gte("created_at", bucharestDayStartIso(matureFrom))
          .lt("created_at", bucharestDayStartIso(matureTo))
          .order("created_at", { ascending: true })
          .range(f, t)
      ),
      fetchAll<any>((f, t) =>
        supabaseAdmin
          .from("orders")
          .select("created_at, product_name, landing_key")
          .eq("organization_id", organizationId)
          .neq("status", "testing")
          .gte("created_at", bucharestDayStartIso(start7))
          .lte("created_at", bucharestDayEndIso(lastDay))
          .order("created_at", { ascending: true })
          .range(f, t)
      ),
      fetchAll<any>((f, t) =>
        supabaseAdmin
          .from("ad_campaign_insights")
          .select("campaign_id, campaign_name, date, spend, fetched_at")
          .eq("organization_id", organizationId)
          .gte("date", start7)
          .lte("date", lastDay)
          .order("date", { ascending: true })
          .range(f, t)
      ),
    ]);

    // Mature orders per product
    const matureByProduct = new Map<string, OrderForThreshold[]>();
    for (const o of matureOrders) {
      const lp = lpBySlug.get(o.landing_key);
      const qty = o.product_quantity || (lp && Number(lp[`quantity_${o.offer_code}`])) || 1;
      const name = productNameOf(o);
      if (!matureByProduct.has(name)) matureByProduct.set(name, []);
      matureByProduct.get(name)!.push({
        total: o.total,
        status: o.status,
        tracking_status: o.tracking_status,
        offer_code: o.offer_code,
        upsells: o.upsells,
        quantity: qty,
      });
    }

    // Recent placed orders per product, split into the 3-day and 7-day windows
    const orders3 = new Map<string, number>();
    const orders7 = new Map<string, number>();
    for (const o of recentOrders) {
      const name = productNameOf(o);
      const day = bucharestDateKey(new Date(o.created_at));
      orders7.set(name, (orders7.get(name) || 0) + 1);
      if (day >= start3) orders3.set(name, (orders3.get(name) || 0) + 1);
    }

    // Ad spend per product: campaign -> product by name
    const productNames = [...new Set([...matureByProduct.keys(), ...orders7.keys(), ...products.map((p) => p.name)])]
      .filter((n) => matureByProduct.has(n) || orders7.has(n) || products.some((p) => p.name === n && unitCostByName.get(n) != null));
    const spend3 = new Map<string, number>();
    const spend7 = new Map<string, number>();
    const campaignMatch = new Map<string, string | "ambiguous" | null>();
    const unmapped = new Map<string, { name: string; spend7: number; reason: "unmapped" | "ambiguous" }>();
    let lastInsightDate: string | null = null;
    let fetchedAt: string | null = null;

    for (const row of insights) {
      if (!lastInsightDate || row.date > lastInsightDate) lastInsightDate = row.date;
      if (row.fetched_at && (!fetchedAt || row.fetched_at > fetchedAt)) fetchedAt = row.fetched_at;
      if (!campaignMatch.has(row.campaign_id)) {
        campaignMatch.set(row.campaign_id, matchCampaign(row.campaign_name, productNames));
      }
      const spend = Number(row.spend) || 0;
      const match = campaignMatch.get(row.campaign_id);
      if (!match || match === "ambiguous") {
        const entry = unmapped.get(row.campaign_id) || { name: row.campaign_name, spend7: 0, reason: match === "ambiguous" ? "ambiguous" as const : "unmapped" as const };
        entry.spend7 += spend;
        unmapped.set(row.campaign_id, entry);
        continue;
      }
      spend7.set(match, (spend7.get(match) || 0) + spend);
      if (row.date >= start3) spend3.set(match, (spend3.get(match) || 0) + spend);
    }

    const names = new Set<string>([...matureByProduct.keys(), ...orders7.keys(), ...spend7.keys()]);
    const rows = [...names].map((name) => {
      const unitCost = unitCostByName.get(name) ?? null;
      const mature = matureByProduct.get(name) || [];
      const t = computeThreshold(mature, unitCost, params);
      const w3 = recentWindow(spend3.get(name) || 0, orders3.get(name) || 0);
      const w7 = recentWindow(spend7.get(name) || 0, orders7.get(name) || 0);
      const verdict = decide(t, unitCost != null, w3, w7, params);
      return {
        product: name,
        verdict,
        cpaMax: t.cpaMax,
        stopAbove: t.stopAbove,
        scaleBelow: t.scaleBelow,
        lowSample: t.placed > 0 && t.placed < params.minOrdersThreshold,
        w3,
        w7,
        detail: {
          matureOrders: t.placed,
          offerMix: t.mix,
          avgQty: t.avgQty,
          upsellShare: t.upsellShare,
          aov: t.aov,
          net: t.net,
          confirmed: t.confirmed,
          confRate: t.confRate,
          delivered: t.delivered,
          returned: t.returned,
          unresolved: t.unresolved,
          retRate: t.retRate,
          unitCost,
          productCost: t.productCost,
          costDelivered: t.costDelivered,
          profitDelivered: t.profitDelivered,
          returnLoss: t.returnLoss,
        },
      };
    });

    // Rows with nothing to show (no thresholds and no recent activity) stay out of the table
    const visible = rows.filter(
      (r) => r.detail.matureOrders > 0 || r.w7.spend > 0 || r.w7.orders > 0
    );
    const rank: Record<string, number> = { stop: 0, scale: 1, insufficient: 2, hold: 3, nocost: 4, nohistory: 5, inactive: 6 };
    visible.sort((a, b) => rank[a.verdict.code] - rank[b.verdict.code] || b.w7.spend - a.w7.spend);

    return NextResponse.json({
      periods: { start3, start7, lastDay, matureFrom, matureTo },
      params,
      meta: { lastInsightDate, fetchedAt },
      rows: visible,
      unmappedCampaigns: [...unmapped.values()].sort((a, b) => b.spend7 - a.spend7),
    });
  } catch (error) {
    console.error("Error in GET /api/superadmin/break-even:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
