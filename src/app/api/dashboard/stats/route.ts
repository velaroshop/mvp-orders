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

    // If filtering by landing page, get the slug first (orders use landing_key, not landing_page_id)
    let landingPageSlug: string | null = null;
    if (landingPageId && landingPageId !== "all") {
      const { data: landingPage } = await supabase
        .from("landing_pages")
        .select("slug")
        .eq("id", landingPageId)
        .single();
      landingPageSlug = landingPage?.slug || null;
    }

    // Build the query - filter by organization first
    // Exclude cancelled and testing orders
    // Use Romania timezone offset (UTC+3 summer time) for proper local date filtering
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

      let query = supabase
        .from("orders")
        .select("total, product_quantity, upsells, status, product_sku, product_name, source, from_partial_id")
        .eq("organization_id", organizationId)
        .gte("created_at", startDateTime)
        .lte("created_at", endDateTime)
        .range(from, to);

      if (landingPageSlug) {
        query = query.eq("landing_key", landingPageSlug);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching orders:", fetchError);
        return NextResponse.json(
          { error: "Failed to fetch dashboard stats" },
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

    const orders = allOrders;

    console.log("Dashboard stats query:", {
      organizationId,
      startDate,
      endDate,
      startDateTime,
      endDateTime,
      landingPageId,
      landingPageSlug,
      ordersCount: orders?.length || 0,
    });

    const filteredOrders = orders || [];

    // Orders excluding cancelled/testing for revenue/KPI calculations
    const revenueOrders = filteredOrders.filter((order: any) =>
      order.status !== "cancelled" && order.status !== "testing"
    );

    // Fetch current product names from products table (canonical names)
    const { data: products } = await supabase
      .from("products")
      .select("name, sku")
      .eq("organization_id", organizationId);

    const skuToName: Record<string, string> = {};
    if (products) {
      for (const p of products) {
        if (p.sku) skuToName[p.sku.toUpperCase()] = p.name;
      }
    }

    // Calculate orders by status (ALL orders, including cancelled/testing)
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach((order: any) => {
      const status = order.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calculate stats (excluding cancelled/testing from revenue)
    const totalRevenue = revenueOrders.reduce(
      (sum, order: any) => sum + (order.total || 0),
      0
    );
    const orderCount = revenueOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Calculate products sold (sum of product_quantity from each order)
    const productsSold = revenueOrders.reduce((sum, order: any) => {
      return sum + (order.product_quantity || 0);
    }, 0);

    // Calculate upsell rate (percentage of orders with at least one upsell)
    const ordersWithUpsells = revenueOrders.filter((order: any) => {
      const upsells = order.upsells || [];
      return Array.isArray(upsells) && upsells.length > 0;
    }).length;
    const upsellRate = orderCount > 0 ? (ordersWithUpsells / orderCount) * 100 : 0;

    // Calculate revenue by product (grouped by SKU to avoid duplicates from name changes)
    const productRevenue: Record<string, { name: string; revenue: number; unitsSold: number; orders: number; partialOrders: number }> = {};
    revenueOrders.forEach((order: any) => {
      const sku = order.product_sku || order.product_name || "Unknown Product";
      const skuKey = sku.toUpperCase();
      const displayName = skuToName[skuKey] || order.product_name || sku;
      const orderTotal = order.total || 0;
      const quantity = order.product_quantity || 1;
      const isFromPartial = order.source === "partial" || !!order.from_partial_id;
      if (!productRevenue[skuKey]) {
        productRevenue[skuKey] = { name: displayName, revenue: 0, unitsSold: 0, orders: 0, partialOrders: 0 };
      }
      productRevenue[skuKey].revenue += orderTotal;
      productRevenue[skuKey].unitsSold += quantity;
      productRevenue[skuKey].orders += 1;
      if (isFromPartial) {
        productRevenue[skuKey].partialOrders += 1;
      }
    });

    // Convert to array and sort by revenue (descending)
    const revenueByProduct = Object.values(productRevenue)
      .map((data) => ({ name: data.name, revenue: data.revenue, unitsSold: data.unitsSold, orders: data.orders, partialOrders: data.partialOrders }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate product sales analysis (units sold per product, grouped by SKU)
    const productSales: Record<string, { name: string; totalSold: number }> = {};
    revenueOrders.forEach((order: any) => {
      const sku = order.product_sku || order.product_name || "Unknown Product";
      const skuKey = sku.toUpperCase();
      const displayName = skuToName[skuKey] || order.product_name || sku;
      const quantity = order.product_quantity || 1;
      if (!productSales[skuKey]) {
        productSales[skuKey] = { name: displayName, totalSold: 0 };
      }
      productSales[skuKey].totalSold += quantity;
    });

    // Calculate days in period for daily average
    const startDateObj = new Date(startDateTime);
    const endDateObj = new Date(endDateTime);
    const daysInPeriod = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Convert to array with daily average
    const productStockAnalysis = Object.values(productSales)
      .map((data) => ({
        name: data.name,
        totalSold: data.totalSold,
        dailyAverage: data.totalSold / daysInPeriod,
        daysInPeriod,
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    // Fetch ALL partial orders using pagination (same 1000-row limit issue)
    let allPartialOrders: any[] = [];
    let partialPage = 0;
    let partialHasMore = true;
    let partialError: any = null;

    while (partialHasMore) {
      const from = partialPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let partialQuery = supabase
        .from("partial_orders")
        .select("status")
        .eq("organization_id", organizationId)
        .gte("created_at", startDateTime)
        .lte("created_at", endDateTime)
        .range(from, to);

      if (landingPageId && landingPageId !== "all") {
        partialQuery = partialQuery.eq("landing_page_id", landingPageId);
      }

      const { data, error: fetchErr } = await partialQuery;

      if (fetchErr) {
        partialError = fetchErr;
        break;
      }

      if (data && data.length > 0) {
        allPartialOrders = allPartialOrders.concat(data);
        partialHasMore = data.length === PAGE_SIZE;
      } else {
        partialHasMore = false;
      }

      partialPage++;
    }

    const partialOrders = allPartialOrders;

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
    // Uses skuToName (built at line 130) to look up product names by SKU
    const upsellsByProduct: Record<string, {
      presale: number;
      postsale: number;
      presaleRevenue: number;
      postsaleRevenue: number;
    }> = {};

    revenueOrders.forEach((order: any) => {
      const upsells = order.upsells || [];
      if (Array.isArray(upsells)) {
        upsells.forEach((upsell: any) => {
          const productName = (upsell.productSku && skuToName[upsell.productSku.toUpperCase()]) || upsell.title || "Unknown Upsell";
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
