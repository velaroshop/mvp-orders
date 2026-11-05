import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { parsePartialPeriod, partialPeriodRange, showsReturnRate } from "@/lib/partial-period";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parcels with a final courier status; the return rate is measured on these only
const FINAL_TRACKING = ["Delivered", "Returned"];
const PAGE_SIZE = 1000;

type ReturnRate = { final: number; returned: number; rate: number };

function returnRate(finalCount: number, returned: number): ReturnRate {
  return { final: finalCount, returned, rate: finalCount > 0 ? Math.round((returned / finalCount) * 1000) / 10 : 0 };
}

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
    const period = parsePartialPeriod(searchParams.get("period"), "30");
    const { start, end } = partialPeriodRange(period);

    // Total partials created in the period
    let partialsQuery = supabaseAdmin
      .from("partial_orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrganizationId);
    if (start) partialsQuery = partialsQuery.gte("created_at", start);
    if (end) partialsQuery = partialsQuery.lte("created_at", end);
    const { count: totalPartials } = await partialsQuery;

    // Converted = orders made from the partials created in the period (counted by the partial's date,
    // so an order placed today from yesterday's partial belongs to yesterday)
    type ConvertedRow = { id: string; confirmed_by: string | null };
    const convertedOrders: ConvertedRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabaseAdmin
        .from("orders")
        .select("id, confirmed_by, partial_orders!from_partial_id!inner(created_at)")
        .eq("organization_id", activeOrganizationId)
        .neq("status", "testing")
        .not("from_partial_id", "is", null)
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (start) query = query.gte("partial_orders.created_at", start);
      if (end) query = query.lte("partial_orders.created_at", end);
      const { data, error } = await query;
      if (error) throw error;
      convertedOrders.push(...((data || []) as unknown as ConvertedRow[]));
      if (!data || data.length < PAGE_SIZE) break;
    }
    const totalConverted = convertedOrders.length;

    // Per-agent breakdown — group converted orders by confirmed_by
    const agentMap = new Map<string, number>();
    convertedOrders.forEach((order) => {
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
      ? Math.round((totalConverted / totalPartials) * 100 * 10) / 10
      : 0;

    // Return rates (parcels with a final status), only for the long periods. Orders made from a partial are told apart by
    // source = "partial", which stays on the order after the partial itself is deleted (partials older than 30 days are)
    let returns: { partial: ReturnRate; direct: ReturnRate } | null = null;
    if (showsReturnRate(period)) {
      const orderCount = async (fromPartial: boolean, trackingStatuses: string[]) => {
        let query = supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeOrganizationId)
          .neq("status", "testing")
          .in("tracking_status", trackingStatuses);
        query = fromPartial ? query.eq("source", "partial") : query.or("source.is.null,source.neq.partial");
        if (start) query = query.gte("created_at", start);
        const { count } = await query;
        return count ?? 0;
      };
      const [partialFinal, partialReturned, directFinal, directReturned] = await Promise.all([
        orderCount(true, FINAL_TRACKING),
        orderCount(true, ["Returned"]),
        orderCount(false, FINAL_TRACKING),
        orderCount(false, ["Returned"]),
      ]);

      returns = { partial: returnRate(partialFinal, partialReturned), direct: returnRate(directFinal, directReturned) };
    }

    return NextResponse.json({
      totalPartials: totalPartials || 0,
      totalConverted,
      conversionRate,
      returns,
      agentBreakdown,
      period,
    });
  } catch (error) {
    console.error("Error fetching conversion stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
