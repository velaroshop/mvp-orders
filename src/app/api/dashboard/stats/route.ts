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

    // Build the query
    let query = supabase
      .from("orders")
      .select("*, landing_pages!inner(store_id)")
      .neq("status", "cancelled")
      .gte("created_at", startDate || new Date().toISOString().split("T")[0])
      .lte("created_at", endDate || new Date().toISOString().split("T")[0] + "T23:59:59");

    // Filter by landing page if specified
    if (landingPageId && landingPageId !== "all") {
      query = query.eq("landing_page_id", landingPageId);
    }

    // Filter by organization through landing_pages join
    const { data: orders, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch dashboard stats" },
        { status: 500 }
      );
    }

    // Filter orders to only include those from stores in the organization
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .eq("organization_id", organizationId);

    const storeIds = stores?.map((s) => s.id) || [];
    const filteredOrders = orders?.filter((order: any) =>
      storeIds.includes(order.landing_pages?.store_id)
    ) || [];

    // Calculate stats
    const totalRevenue = filteredOrders.reduce(
      (sum, order: any) => sum + (order.total || 0),
      0
    );
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Calculate products sold (sum of all product quantities)
    const productsSold = filteredOrders.reduce((sum, order: any) => {
      const products = order.products || [];
      const orderProductCount = products.reduce(
        (productSum: number, product: any) => productSum + (product.quantity || 0),
        0
      );
      return sum + orderProductCount;
    }, 0);

    // Calculate upsell rate (percentage of orders with at least one upsell)
    const ordersWithUpsells = filteredOrders.filter((order: any) => {
      const upsells = order.upsells || [];
      return upsells.length > 0;
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
