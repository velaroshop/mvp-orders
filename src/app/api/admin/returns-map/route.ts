import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export interface CountyStat {
  county: string;
  totalOrders: number;
  returnedOrders: number;
  returnRate: number; // 0-100
  returnedValue: number; // RON
}

/**
 * GET /api/admin/returns-map?period=90&minOrders=5
 * Returns return rate stats grouped by county for the current user's organization.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "90"; // days; "all" = no filter
    const minOrders = parseInt(searchParams.get("minOrders") || "5", 10);

    const organizationId = (session.user as any).activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Supabase has a server-side max_rows cap (default 1000) that ignores .limit().
    // Workaround: paginate with .range() until we get all rows.
    const PAGE_SIZE = 1000;
    let allRows: { county: string; tracking_status: string | null; total: string; helpship_order_id: string | null }[] = [];
    let from = 0;

    while (true) {
      let q = supabaseAdmin
        .from("orders")
        .select("county, tracking_status, total, helpship_order_id")
        .eq("organization_id", organizationId)
        .neq("status", "testing")
        .neq("status", "queue")
        .not("county", "is", null)
        .neq("county", "");

      if (period !== "all") {
        const days = parseInt(period, 10);
        const since = new Date();
        since.setDate(since.getDate() - days);
        q = q.gte("created_at", since.toISOString());
      }

      const { data: page, error } = await q.range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[ReturnsMap] DB error:", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      if (!page || page.length === 0) break;
      allRows = allRows.concat(page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const data = allRows;

    // Aggregate by county
    const map = new Map<string, { total: number; returned: number; returnedValue: number }>();

    for (const row of data || []) {
      const county = normalizeCountyName(row.county);
      if (!county) continue;

      const existing = map.get(county) ?? { total: 0, returned: 0, returnedValue: 0 };
      existing.total += 1;
      if (row.tracking_status === "Returned") {
        existing.returned += 1;
        existing.returnedValue += parseFloat(row.total) || 0;
      }
      map.set(county, existing);
    }

    const stats: CountyStat[] = Array.from(map.entries())
      .filter(([, v]) => v.total >= minOrders)
      .map(([county, v]) => ({
        county,
        totalOrders: v.total,
        returnedOrders: v.returned,
        returnRate: v.total > 0 ? (v.returned / v.total) * 100 : 0,
        returnedValue: v.returnedValue,
      }))
      .sort((a, b) => b.returnRate - a.returnRate);

    // Summary stats
    const allData = Array.from(map.entries()).map(([county, v]) => ({
      county,
      totalOrders: v.total,
      returnedOrders: v.returned,
      returnRate: v.total > 0 ? (v.returned / v.total) * 100 : 0,
      returnedValue: v.returnedValue,
    }));

    const totalOrders = allData.reduce((s, d) => s + d.totalOrders, 0);
    const totalReturned = allData.reduce((s, d) => s + d.returnedOrders, 0);
    const totalReturnedValue = allData.reduce((s, d) => s + d.returnedValue, 0);
    const syncedOrders = (data || []).filter((r) => r.tracking_status !== null).length;
    // noHelpshipOrders = orders that never reached Helpship (can't be synced)
    const noHelpshipOrders = (data || []).filter((r) => !r.helpship_order_id).length;
    const unsyncedOrders = totalOrders - syncedOrders;

    return NextResponse.json({
      stats,
      summary: {
        totalOrders,
        totalReturned,
        overallRate: totalOrders > 0 ? (totalReturned / totalOrders) * 100 : 0,
        totalReturnedValue,
        syncedOrders,
        unsyncedOrders,
        noHelpshipOrders,
      },
    });
  } catch (err) {
    console.error("[ReturnsMap] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Whitelist of valid Romanian county names (normalized, hyphens → spaces)
const VALID_COUNTIES = new Set([
  "alba", "arges", "arad", "bacau", "bihor", "bistrita nasaud", "braila",
  "botosani", "bucuresti", "brasov", "buzau", "cluj", "calarasi",
  "caras severin", "constanta", "covasna", "dambovita", "dolj", "gorj",
  "galati", "giurgiu", "hunedoara", "harghita", "ilfov", "ialomita",
  "iasi", "mehedinti", "maramures", "mures", "neamt", "olt", "prahova",
  "sibiu", "salaj", "satu mare", "suceava", "tulcea", "timis",
  "teleorman", "valcea", "vrancea", "vaslui",
]);

/**
 * Normalize county name to canonical form:
 * - strip diacritics
 * - lowercase
 * - hyphens → spaces (unifies "bistrita-nasaud" and "bistrita nasaud")
 * Returns null if not a valid Romanian county.
 */
function normalizeCountyName(raw: string): string | null {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/-/g, " ")              // hyphens → spaces
    .replace(/\s+/g, " ");
  return VALID_COUNTIES.has(normalized) ? normalized : null;
}
