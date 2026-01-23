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
    // Exclude cancelled and testing orders
    // Use T00:00:00Z and T23:59:59.999Z to ensure proper timezone handling
    const startDateTime = startDate ? `${startDate}T00:00:00.000Z` : `${new Date().toISOString().split("T")[0]}T00:00:00.000Z`;
    const endDateTime = endDate ? `${endDate}T23:59:59.999Z` : `${new Date().toISOString().split("T")[0]}T23:59:59.999Z`;

    let query = supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .neq("status", "testing")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime);

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

    console.log("Dashboard stats query:", {
      organizationId,
      startDate,
      endDate,
      startDateTime,
      endDateTime,
      landingPageId,
      ordersCount: orders?.length || 0,
    });

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

    // Calculate orders by status
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach((order: any) => {
      const status = order.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calculate revenue by product
    const productRevenue: Record<string, number> = {};
    filteredOrders.forEach((order: any) => {
      const productName = order.product_name || "Unknown Product";
      const orderTotal = order.total || 0;
      productRevenue[productName] = (productRevenue[productName] || 0) + orderTotal;
    });

    // Convert to array and sort by revenue (descending)
    const revenueByProduct = Object.entries(productRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate product sales analysis (units sold per product)
    const productSales: Record<string, number> = {};
    filteredOrders.forEach((order: any) => {
      const productName = order.product_name || "Unknown Product";
      const quantity = order.product_quantity || 1;
      productSales[productName] = (productSales[productName] || 0) + quantity;
    });

    // Calculate days in period for daily average
    const startDateObj = new Date(startDateTime);
    const endDateObj = new Date(endDateTime);
    const daysInPeriod = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Convert to array with daily average
    const productStockAnalysis = Object.entries(productSales)
      .map(([name, totalSold]) => ({
        name,
        totalSold,
        dailyAverage: totalSold / daysInPeriod,
        daysInPeriod,
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    // Fetch partial orders stats with same filters
    let partialQuery = supabase
      .from("partial_orders")
      .select("status")
      .eq("organization_id", organizationId)
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime);

    // Filter by landing page if specified
    if (landingPageId && landingPageId !== "all") {
      partialQuery = partialQuery.eq("landing_page_id", landingPageId);
    }

    const { data: partialOrders, error: partialError } = await partialQuery;

    // Calculate partial orders by status
    const partialsByStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      refused: 0,
      unanswered: 0,
    };

    if (!partialError && partialOrders) {
      partialOrders.forEach((partial: any) => {
        const status = partial.status || "pending";
        // Map 'accepted' to 'confirmed' for display consistency
        const displayStatus = status === "accepted" ? "confirmed" : status;
        if (displayStatus in partialsByStatus) {
          partialsByStatus[displayStatus]++;
        }
      });
    }

    // Calculate upsells split by product and type
    const upsellsByProduct: Record<string, {
      presale: number;
      postsale: number;
      presaleRevenue: number;
      postsaleRevenue: number;
    }> = {};

    filteredOrders.forEach((order: any) => {
      const upsells = order.upsells || [];
      if (Array.isArray(upsells)) {
        upsells.forEach((upsell: any) => {
          const productName = upsell.product_name || upsell.title || "Unknown Upsell";
          const quantity = upsell.quantity || 1;
          const price = upsell.price || 0;
          const type = upsell.type || "presale";
          const revenue = quantity * price;

          if (!upsellsByProduct[productName]) {
            upsellsByProduct[productName] = {
              presale: 0,
              postsale: 0,
              presaleRevenue: 0,
              postsaleRevenue: 0
            };
          }

          if (type === "presale") {
            upsellsByProduct[productName].presale += quantity;
            upsellsByProduct[productName].presaleRevenue += revenue;
          } else if (type === "postsale") {
            upsellsByProduct[productName].postsale += quantity;
            upsellsByProduct[productName].postsaleRevenue += revenue;
          }
        });
      }
    });

    // Convert to array format for frontend
    const upsellsSplit = Object.entries(upsellsByProduct).map(([name, counts]) => ({
      name,
      presale: counts.presale,
      postsale: counts.postsale,
      total: counts.presale + counts.postsale,
      presaleRevenue: counts.presaleRevenue,
      postsaleRevenue: counts.postsaleRevenue,
      totalRevenue: counts.presaleRevenue + counts.postsaleRevenue,
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      totalRevenue,
      avgOrderValue,
      orderCount,
      productsSold,
      upsellRate,
      ordersByStatus: statusCounts,
      partialsByStatus,
      revenueByProduct,
      upsellsSplit,
      productStockAnalysis,
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
