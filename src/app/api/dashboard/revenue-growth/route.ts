import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

    // Build datetime range using Romania timezone (UTC+3 summer time)
    // This ensures "Today" shows orders from 00:00 to 23:59 Romania time
    const startDateTime = startDate
      ? new Date(`${startDate}T00:00:00.000+03:00`).toISOString()
      : new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const endDateTime = endDate
      ? new Date(`${endDate}T23:59:59.999+03:00`).toISOString()
      : new Date().toISOString().split("T")[0] + "T23:59:59.999Z";

    // Fetch ALL orders using pagination (Supabase default limit is 1000)
    const PAGE_SIZE = 1000;
    let allOrders: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("total, upsells, created_at")
        .eq("organization_id", organizationId)
        .neq("status", "cancelled")
        .neq("status", "testing")
        .gte("created_at", startDateTime)
        .lte("created_at", endDateTime)
        .order("created_at", { ascending: true })
        .range(from, to);

      if (fetchError) {
        console.error("Error fetching orders for revenue growth:", fetchError);
        return NextResponse.json(
          { error: "Failed to fetch revenue growth data" },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allOrders = allOrders.concat(data);
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }

      page++;
    }

    const filteredOrders = allOrders;

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
      // Generate all days using original Romania local date strings (not UTC-converted dates)
      // startDate/endDate are "YYYY-MM-DD" representing Romania local dates
      const actualStart = startDate || new Date().toISOString().split("T")[0];
      const actualEnd = endDate || actualStart;
      const currentDay = new Date(actualStart + 'T12:00:00Z'); // noon UTC to avoid DST edge cases
      const lastDay = new Date(actualEnd + 'T12:00:00Z');
      while (currentDay <= lastDay) {
        const dayKey = currentDay.toISOString().split('T')[0];
        revenueData[dayKey] = { totalRevenue: 0, upsellRevenue: 0, count: 0 };
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
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
    // Romania timezone offset (UTC+3 summer time)
    const ROMANIA_OFFSET_HOURS = 3;

    filteredOrders.forEach((order: any) => {
      const createdAt = new Date(order.created_at);
      // Convert to Romania time by adding the offset
      const romaniaTime = new Date(createdAt.getTime() + ROMANIA_OFFSET_HOURS * 60 * 60 * 1000);
      let key: string;

      if (granularity === 'hourly') {
        key = `${String(romaniaTime.getUTCHours()).padStart(2, '0')}:00`;
      } else if (granularity === 'daily') {
        key = `${romaniaTime.getUTCFullYear()}-${String(romaniaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(romaniaTime.getUTCDate()).padStart(2, '0')}`;
      } else {
        key = `${romaniaTime.getUTCFullYear()}-${String(romaniaTime.getUTCMonth() + 1).padStart(2, '0')}`;
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
