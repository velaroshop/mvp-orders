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

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("orders")
      .select("county, tracking_status, total")
      .eq("organization_id", organizationId)
      .neq("status", "testing")
      .neq("status", "queue")
      .not("county", "is", null)
      .neq("county", "");

    if (period !== "all") {
      const days = parseInt(period, 10);
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte("created_at", since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ReturnsMap] DB error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

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

    return NextResponse.json({
      stats,
      summary: {
        totalOrders,
        totalReturned,
        overallRate: totalOrders > 0 ? (totalReturned / totalOrders) * 100 : 0,
        totalReturnedValue,
        syncedOrders,
        unsyncedOrders: totalOrders - syncedOrders,
      },
    });
  } catch (err) {
    console.error("[ReturnsMap] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Normalize county name to a canonical lowercase form for grouping */
function normalizeCountyName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\s+/g, " ");
}
