import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { bucharestDateKey, bucharestDayEndIso, bucharestDayStartIso, shiftDateKey } from "@/lib/romania-time";
import { addOrder, computeProfit, daysBetween, daysInMonth, emptyDay, type DayBucket, type ProfitParams } from "@/lib/profit";

const PAGE_SIZE = 1000;
const MONTHS_BACK = 6;
const VAT_RATE = 0.21;
// Used only when Settings has no courier / packaging cost (without VAT)
const DEFAULT_COURIER = 10.8;
const DEFAULT_PACKAGING = 4.5;

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

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = session.user as any;
  if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
    return { error: NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 }) };
  }
  if (!user.activeOrganizationId) return { error: NextResponse.json({ error: "No organization" }, { status: 400 }) };
  return { organizationId: user.activeOrganizationId as string };
}

function monthKeyOf(day: string) {
  return day.slice(0, 7);
}

function shiftMonth(monthKey: string, delta: number): string {
  const d = new Date(Date.UTC(+monthKey.slice(0, 4), +monthKey.slice(5, 7) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function parseUpsells(value: unknown): { productSku?: string; quantity?: number }[] {
  let x = value;
  if (typeof x === "string") {
    try { x = JSON.parse(x); } catch { return []; }
  }
  return Array.isArray(x) ? x : [];
}

/**
 * GET /api/superadmin/profit
 * Net profit per month. Days after the cutoff (the day before the latest order day that has a returned parcel) are left
 * out: returns arrive weeks later, so those days would look better than they are. Read-only. Superadmin only.
 */
export async function GET() {
  try {
    const auth = await requireSuperadmin();
    if (auth.error) return auth.error;
    const organizationId = auth.organizationId!;

    const today = bucharestDateKey(new Date());
    const firstMonth = shiftMonth(monthKeyOf(today), -(MONTHS_BACK - 1));
    const rangeStart = `${firstMonth}-01`;

    // Settings: the fixed costs column comes from migration 105, older databases do not have it yet
    let fixedMonthly = 0;
    let fixedColumn = true;
    let settings: any = null;
    {
      const full = await supabaseAdmin
        .from("settings")
        .select("vat_enabled, courier_cost, packaging_cost, fixed_costs_monthly")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (full.error) {
        fixedColumn = false;
        const base = await supabaseAdmin
          .from("settings")
          .select("vat_enabled, courier_cost, packaging_cost")
          .eq("organization_id", organizationId)
          .maybeSingle();
        settings = base.data;
      } else {
        settings = full.data;
        fixedMonthly = Number(settings?.fixed_costs_monthly || 0);
      }
    }

    const courier = settings?.courier_cost != null ? Number(settings.courier_cost) : DEFAULT_COURIER;
    const packaging = settings?.packaging_cost != null ? Number(settings.packaging_cost) : DEFAULT_PACKAGING;
    const params: ProfitParams = {
      vat: settings?.vat_enabled ? VAT_RATE : 0,
      courierPack: courier + packaging,
      fixedMonthly,
    };

    // Cutoff: the day before the latest order day with a returned parcel
    const { data: lastReturned } = await supabaseAdmin
      .from("orders")
      .select("created_at")
      .eq("organization_id", organizationId)
      .neq("status", "testing")
      .eq("tracking_status", "Returned")
      .order("created_at", { ascending: false })
      .limit(1);
    const cutoff = lastReturned && lastReturned[0] ? shiftDateKey(bucharestDateKey(new Date(lastReturned[0].created_at)), -1) : null;

    const productsRes = await supabaseAdmin.from("products").select("name, sku, import_price").eq("organization_id", organizationId);
    const costBySku = new Map<string, number | null>();
    const costByName = new Map<string, number | null>();
    for (const p of (productsRes.data || []) as { name: string; sku: string | null; import_price: number | null }[]) {
      const cost = p.import_price == null ? null : Number(p.import_price);
      if (p.sku) costBySku.set(p.sku.toUpperCase(), cost);
      costByName.set(p.name, cost);
    }

    const buckets: Record<string, DayBucket> = {};
    const ads: Record<string, number> = {};
    let lastInsightDate: string | null = null;

    if (cutoff && cutoff >= rangeStart) {
      const [orders, insights] = await Promise.all([
        fetchAll<any>((f, t) =>
          supabaseAdmin
            .from("orders")
            .select("created_at, status, tracking_status, total, product_sku, product_name, product_quantity, upsells")
            .eq("organization_id", organizationId)
            .neq("status", "testing")
            .gte("created_at", bucharestDayStartIso(rangeStart))
            .lte("created_at", bucharestDayEndIso(cutoff))
            .order("created_at", { ascending: true })
            .range(f, t)
        ),
        fetchAll<any>((f, t) =>
          supabaseAdmin
            .from("ad_campaign_insights")
            .select("date, spend")
            .eq("organization_id", organizationId)
            .gte("date", rangeStart)
            .lte("date", cutoff)
            .order("date", { ascending: true })
            .range(f, t)
        ),
      ]);

      for (const o of orders) {
        // Product cost: main product + every upsell (a free gift costs the same as a sold one)
        let cost = 0;
        let missing = false;
        const unit = (o.product_sku ? costBySku.get(String(o.product_sku).toUpperCase()) : undefined) ?? costByName.get(o.product_name) ?? null;
        if (unit == null) missing = true;
        else cost += unit * (Number(o.product_quantity) || 1);
        for (const u of parseUpsells(o.upsells)) {
          const uc = u.productSku ? costBySku.get(String(u.productSku).toUpperCase()) : null;
          if (uc == null) missing = true;
          else cost += uc * (Number(u.quantity) || 1);
        }
        const day = bucharestDateKey(new Date(o.created_at));
        if (!buckets[day]) buckets[day] = emptyDay();
        addOrder(buckets[day], { status: o.status, tracking_status: o.tracking_status, total: Number(o.total) || 0, cost, costMissing: missing });
      }

      for (const row of insights) {
        ads[row.date] = (ads[row.date] || 0) + (Number(row.spend) || 0);
        if (!lastInsightDate || row.date > lastInsightDate) lastInsightDate = row.date;
      }
    }

    // Delivered / returned ratio of the whole range, for months without any final parcel yet
    let allDelivered = 0;
    let allReturned = 0;
    for (const b of Object.values(buckets)) {
      allDelivered += b.delivered;
      allReturned += b.returned;
    }
    const fallbackRate = allDelivered + allReturned > 0 ? allDelivered / (allDelivered + allReturned) : 0.8;

    const months = [];
    const daily: { day: string; placed: number; delivered: number; returned: number; transit: number; ads: number; profit: number }[] = [];
    for (let i = 0; i < MONTHS_BACK; i++) {
      const key = shiftMonth(firstMonth, i);
      const monthStart = `${key}-01`;
      const monthEnd = `${key}-${String(daysInMonth(key)).padStart(2, "0")}`;
      const to = cutoff && cutoff < monthEnd ? cutoff : monthEnd;
      if (!cutoff || to < monthStart) {
        months.push({ key, available: false, complete: false, result: null });
        continue;
      }
      const result = computeProfit(buckets, ads, monthStart, to, params, fallbackRate);
      months.push({ key, available: true, complete: to === monthEnd, result });
      for (const day of daysBetween(monthStart, to)) {
        const r = computeProfit(buckets, ads, day, day, params, fallbackRate, result.deliveredRate);
        daily.push({ day, placed: r.placed, delivered: r.delivered, returned: r.returned, transit: r.transit, ads: r.ads, profit: r.profit });
      }
    }

    return NextResponse.json({
      cutoff,
      params: { ...params, courier, packaging, fixedColumn },
      meta: { lastInsightDate },
      months: months.reverse(),
      daily,
    });
  } catch (error) {
    console.error("Error computing profit:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

/** PUT /api/superadmin/profit — body { fixedMonthly }: the fixed costs per month, kept in Settings */
export async function PUT(request: Request) {
  try {
    const auth = await requireSuperadmin();
    if (auth.error) return auth.error;
    const body = await request.json();
    const value = Number(body.fixedMonthly);
    if (!Number.isFinite(value) || value < 0 || value > 10_000_000) {
      return NextResponse.json({ error: "Valoare invalidă" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("settings")
      .update({ fixed_costs_monthly: value })
      .eq("organization_id", auth.organizationId!)
      .select("organization_id");
    if (error) {
      return NextResponse.json({ error: "Nu am putut salva. Ai rulat migrarea 105?" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Nu există rândul de setări al organizației." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, fixedMonthly: value });
  } catch (error) {
    console.error("Error saving fixed costs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
