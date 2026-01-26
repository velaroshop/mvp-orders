import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { HelpshipClient } from "@/lib/helpship";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";

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
 * GET /api/dashboard/stock-analysis - Get stock analysis for a specific product
 * Query params: productName, days (1, 3, 7, or 14)
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
    const productName = searchParams.get("productName");
    const days = parseInt(searchParams.get("days") || "7");

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1); // Include today

    const startDateTime = startDate.toISOString().split("T")[0] + "T00:00:00.000Z";
    const endDateTime = endDate.toISOString().split("T")[0] + "T23:59:59.999Z";

    // Query orders for this product in the period
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("product_name", productName)
      .neq("status", "cancelled")
      .neq("status", "testing")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime);

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch stock analysis" },
        { status: 500 }
      );
    }

    const filteredOrders = orders || [];

    // Calculate total sold
    const totalSold = filteredOrders.reduce((sum, order: any) => {
      return sum + (order.product_quantity || 1);
    }, 0);

    // Calculate daily average
    const dailyAverage = totalSold / days;

    // Get product SKU from database to fetch stock from HelpShip
    const { data: product } = await supabase
      .from("products")
      .select("sku")
      .eq("organization_id", organizationId)
      .eq("name", productName)
      .eq("status", "active")
      .single();

    let currentStock: number | null = null;
    let daysUntilStockout: number | null = null;

    // Fetch current stock from HelpShip if product has SKU
    if (product?.sku) {
      try {
        // Get credentials with correct environment from system_settings
        const credentials = await getHelpshipCredentials(organizationId);
        const helpshipClient = new HelpshipClient(credentials);

        currentStock = await helpshipClient.getProductStock(product.sku);

        // Calculate how many days the stock will last
        if (currentStock !== null && dailyAverage > 0) {
          daysUntilStockout = Math.floor(currentStock / dailyAverage);
        }
      } catch (error) {
        console.error("Error fetching stock from HelpShip:", error);
        // Continue without stock data if HelpShip API fails
      }
    }

    return NextResponse.json({
      name: productName,
      totalSold,
      dailyAverage,
      daysInPeriod: days,
      currentStock,
      daysUntilStockout,
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/stock-analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
