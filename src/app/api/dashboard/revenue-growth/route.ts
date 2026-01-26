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
 * GET /api/dashboard/revenue-growth - Get revenue data with adaptive granularity
 * Granularity: hourly (1 day), daily (2-31 days), monthly (>31 days)
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

    // Build datetime range using Romania timezone (UTC+2 winter, UTC+3 summer)
    // This ensures "Today" shows orders from 00:00 to 23:59 Romania time
    const startDateTime = startDate
      ? new Date(`${startDate}T00:00:00.000+02:00`).toISOString()
      : new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const endDateTime = endDate
      ? new Date(`${endDate}T23:59:59.999+02:00`).toISOString()
      : new Date().toISOString().split("T")[0] + "T23:59:59.999Z";

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

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Calculate the difference in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Determine granularity: hourly (1 day), daily (2-31 days), monthly (>31 days)
    let granularity: 'hourly' | 'daily' | 'monthly' = 'hourly';
    if (diffDays > 31) {
      granularity = 'monthly';
    } else if (diffDays > 1) {
      granularity = 'daily';
    }

    const revenueData: Record<string, { totalRevenue: number; upsellRevenue: number; count: number }> = {};

    // For monthly granularity, adjust start date to the first order's month if it's later than the specified start
    let adjustedStart = start;
    if (granularity === 'monthly' && filteredOrders.length > 0) {
      const firstOrderDate = new Date(filteredOrders[0].created_at);
      if (firstOrderDate > start) {
        adjustedStart = new Date(firstOrderDate.getUTCFullYear(), firstOrderDate.getUTCMonth(), 1);
      }
    }

    // Generate all time periods in the date range with 0 values
    if (granularity === 'hourly') {
      // Generate all 24 hours
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = `${String(hour).padStart(2, '0')}:00`;
        revenueData[hourKey] = { totalRevenue: 0, upsellRevenue: 0, count: 0 };
      }
    } else if (granularity === 'daily') {
      // Generate all days in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        revenueData[dayKey] = { totalRevenue: 0, upsellRevenue: 0, count: 0 };
      }
    } else {
      // Generate all months in the range (starting from first order month)
      const currentDate = new Date(adjustedStart);
      while (currentDate <= end) {
        const monthKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`;
        revenueData[monthKey] = { totalRevenue: 0, upsellRevenue: 0, count: 0 };
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Fill in actual order data
    filteredOrders.forEach((order: any) => {
      const createdAt = new Date(order.created_at);
      let key: string;

      if (granularity === 'hourly') {
        key = `${String(createdAt.getUTCHours()).padStart(2, '0')}:00`;
      } else if (granularity === 'daily') {
        key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}-${String(createdAt.getUTCDate()).padStart(2, '0')}`;
      } else {
        key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
      }

      if (revenueData[key]) {
        // Add total revenue
        revenueData[key].totalRevenue += order.total || 0;
        revenueData[key].count += 1;

        // Calculate upsell revenue from upsells JSONB field
        const upsells = order.upsells || [];
        if (Array.isArray(upsells)) {
          upsells.forEach((upsell: any) => {
            const quantity = upsell.quantity || 1;
            const price = upsell.price || 0;
            revenueData[key].upsellRevenue += quantity * price;
          });
        }
      }
    });

    // Convert to array and sort by time
    const hourlyRevenue = Object.entries(revenueData)
      .map(([period, data]) => ({
        period,
        totalRevenue: data.totalRevenue,
        upsellRevenue: data.upsellRevenue,
        orderCount: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

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
      data: hourlyRevenue,
      granularity,
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
