import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any)?.activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const now = new Date();

    // Start of today (midnight local → UTC)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of yesterday
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 7 days ago
    const days7 = new Date(now);
    days7.setDate(days7.getDate() - 7);

    // 30 days ago
    const days30 = new Date(now);
    days30.setDate(days30.getDate() - 30);

    // Run all counts in parallel
    const [todayRes, yesterdayRes, days7Res, days30Res, totalRes] = await Promise.all([
      supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .gte("created_at", todayStart.toISOString()),

      supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .gte("created_at", yesterdayStart.toISOString())
        .lt("created_at", todayStart.toISOString()),

      supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .gte("created_at", days7.toISOString()),

      supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .gte("created_at", days30.toISOString()),

      supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId),
    ]);

    const today = todayRes.count ?? 0;
    const yesterday = yesterdayRes.count ?? 0;

    // Trend: today vs yesterday (percentage change, null if yesterday = 0)
    const trend =
      yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;

    return NextResponse.json({
      today,
      yesterday,
      last7days: days7Res.count ?? 0,
      last30days: days30Res.count ?? 0,
      total: totalRes.count ?? 0,
      trend, // null | number (positive = up, negative = down)
    });
  } catch (error) {
    console.error("Error fetching partial stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
