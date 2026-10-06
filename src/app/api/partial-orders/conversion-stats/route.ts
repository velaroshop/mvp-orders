import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any)?.activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // "30", "90", "all"

    // Build date filter
    let dateFilter: string | null = null;
    if (period !== "all") {
      const days = parseInt(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      dateFilter = cutoff.toISOString();
    }

    // Total partials in period
    let partialsQuery = supabaseAdmin
      .from("partial_orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrganizationId);
    if (dateFilter) partialsQuery = partialsQuery.gte("created_at", dateFilter);
    const { count: totalPartials } = await partialsQuery;

    // Converted orders (from_partial_id is set) in period
    let convertedQuery = supabaseAdmin
      .from("orders")
      .select("id, confirmed_by, from_partial_id", { count: "exact" })
      .eq("organization_id", activeOrganizationId)
      .not("from_partial_id", "is", null);
    if (dateFilter) convertedQuery = convertedQuery.gte("created_at", dateFilter);
    const { data: convertedOrders, count: totalConverted } = await convertedQuery;

    // Per-agent breakdown — group converted orders by confirmed_by
    const agentMap = new Map<string, number>();
    (convertedOrders || []).forEach((order) => {
      if (order.confirmed_by) {
        agentMap.set(order.confirmed_by, (agentMap.get(order.confirmed_by) || 0) + 1);
      }
    });

    // Fetch agent names
    const agentIds = Array.from(agentMap.keys());
    let agentBreakdown: { id: string; name: string; email: string; converted: number }[] = [];

    if (agentIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name, email")
        .in("id", agentIds);

      agentBreakdown = (users || []).map((u) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        converted: agentMap.get(u.id) || 0,
      })).sort((a, b) => b.converted - a.converted);
    }

    const conversionRate = totalPartials && totalPartials > 0
      ? Math.round(((totalConverted || 0) / totalPartials) * 100 * 10) / 10
      : 0;

    return NextResponse.json({
      totalPartials: totalPartials || 0,
      totalConverted: totalConverted || 0,
      conversionRate,
      agentBreakdown,
      period,
    });
  } catch (error) {
    console.error("Error fetching conversion stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
