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
 * GET /api/dashboard/stats - Get dashboard statistics
 * Query params: startDate, endDate, landingPage (optional)
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
    const landingPageId = searchParams.get("landingPage");

    // Build the query - filter by organization first
    let query = supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .gte("created_at", startDate || new Date().toISOString().split("T")[0])
      .lte("created_at", endDate || new Date().toISOString().split("T")[0] + "T23:59:59");

    // Filter by landing page if specified
    if (landingPageId && landingPageId !== "all") {
      query = query.eq("landing_page_id", landingPageId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch dashboard stats" },
        { status: 500 }
      );
    }

    const filteredOrders = orders || [];

    // Calculate stats
    const totalRevenue = filteredOrders.reduce(
      (sum, order: any) => sum + (order.total || 0),
      0
    );
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Calculate products sold (sum of product_quantity from each order)
    const productsSold = filteredOrders.reduce((sum, order: any) => {
      return sum + (order.product_quantity || 0);
    }, 0);

    // Calculate upsell rate (percentage of orders with at least one upsell)
    // Check if order has upsells in the upsells JSONB field
    const ordersWithUpsells = filteredOrders.filter((order: any) => {
      const upsells = order.upsells || [];
      return Array.isArray(upsells) && upsells.length > 0;
    }).length;
    const upsellRate = orderCount > 0 ? (ordersWithUpsells / orderCount) * 100 : 0;

    return NextResponse.json({
      totalRevenue,
      avgOrderValue,
      orderCount,
      productsSold,
      upsellRate,
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
