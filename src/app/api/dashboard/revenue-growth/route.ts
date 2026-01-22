import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use service role key for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * GET /api/dashboard/revenue-growth - Get hourly revenue data
 * Query params: startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const organizationId = session.user.activeOrganizationId;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build datetime range
    const startDateTime = startDate ? `${startDate}T00:00:00.000Z` : `${new Date().toISOString().split("T")[0]}T00:00:00.000Z`;
    const endDateTime = endDate ? `${endDate}T23:59:59.999Z` : `${new Date().toISOString().split("T")[0]}T23:59:59.999Z`;

    // Fetch all orders in the period (excluding cancelled and testing)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .neq("status", "testing")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching orders for revenue growth:", error);
      return NextResponse.json(
        { error: "Failed to fetch revenue growth data" },
        { status: 500 }
      );
    }

    const filteredOrders = orders || [];

    // Group orders by hour
    const hourlyData: Record<string, { totalRevenue: number; upsellRevenue: number; count: number }> = {};

    filteredOrders.forEach((order: any) => {
      const createdAt = new Date(order.created_at);
      const hourKey = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}-${String(createdAt.getUTCDate()).padStart(2, '0')} ${String(createdAt.getUTCHours()).padStart(2, '0')}:00`;

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { totalRevenue: 0, upsellRevenue: 0, count: 0 };
      }

      // Add total revenue
      hourlyData[hourKey].totalRevenue += order.total || 0;
      hourlyData[hourKey].count += 1;

      // Calculate upsell revenue from upsells JSONB field
      const upsells = order.upsells || [];
      if (Array.isArray(upsells)) {
        upsells.forEach((upsell: any) => {
          const quantity = upsell.quantity || 1;
          const price = upsell.price || 0;
          hourlyData[hourKey].upsellRevenue += quantity * price;
        });
      }
    });

    // Convert to array and sort by time
    const hourlyRevenue = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour,
        totalRevenue: data.totalRevenue,
        upsellRevenue: data.upsellRevenue,
        orderCount: data.count,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Calculate Pre-Purchase vs Post-Purchase split for entire period
    let presaleRevenue = 0;
    let postsaleRevenue = 0;

    filteredOrders.forEach((order: any) => {
      const upsells = order.upsells || [];
      if (Array.isArray(upsells)) {
        upsells.forEach((upsell: any) => {
          const quantity = upsell.quantity || 1;
          const price = upsell.price || 0;
          const type = upsell.type || "presale";
          const revenue = quantity * price;

          if (type === "presale") {
            presaleRevenue += revenue;
          } else if (type === "postsale") {
            postsaleRevenue += revenue;
          }
        });
      }
    });

    return NextResponse.json({
      hourlyRevenue,
      upsellSplit: {
        presale: presaleRevenue,
        postsale: postsaleRevenue,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/revenue-growth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
