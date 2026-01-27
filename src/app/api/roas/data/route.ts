import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

interface RoasDataRow {
  date: string;
  adSpend: number;
  revenue: number;
  roas: number | null;
  orders: number;
  productsSold: number;
  avgOrderValue: number;
  metaPurchases: number;
  metaPurchaseValue: number;
}

/**
 * GET /api/roas/data - Get ROAS data for a product and month
 * Query params:
 *   - productId: UUID of the product
 *   - month: Month in YYYY-MM format
 *   - includeUpsells: "true" or "false" (default: true)
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
    const productId = searchParams.get("productId");
    const month = searchParams.get("month"); // Format: YYYY-MM
    const includeUpsells = searchParams.get("includeUpsells") !== "false";

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month is required in YYYY-MM format" },
        { status: 400 }
      );
    }

    // Parse month to get date range
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch ad spend data for the month
    const { data: adSpendData, error: adSpendError } = await supabase
      .from("ad_spend_data")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (adSpendError) {
      console.error("Error fetching ad spend data:", adSpendError);
      return NextResponse.json(
        { error: "Failed to fetch ad spend data" },
        { status: 500 }
      );
    }

    // Fetch orders for the month (same logic as dashboard stats - exclude cancelled and testing)
    // Filter by product_sku to match the product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, sku")
      .eq("id", productId)
      .eq("organization_id", organizationId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Use Romania timezone for date filtering (UTC+2)
    const startDateTime = `${startDateStr}T00:00:00+02:00`;
    const endDateTime = `${endDateStr}T23:59:59+02:00`;

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("product_sku", product.sku)
      .neq("status", "cancelled")
      .neq("status", "testing")
      .gte("created_at", new Date(startDateTime).toISOString())
      .lte("created_at", new Date(endDateTime).toISOString());

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Group orders by date (Romania time)
    const ROMANIA_OFFSET_HOURS = 2;
    const ordersByDate: Map<
      string,
      { revenue: number; count: number; productsSold: number }
    > = new Map();

    (orders || []).forEach((order: any) => {
      const createdAt = new Date(order.created_at);
      // Convert to Romania time
      const romaniaTime = new Date(
        createdAt.getTime() + ROMANIA_OFFSET_HOURS * 60 * 60 * 1000
      );
      const dateKey = `${romaniaTime.getUTCFullYear()}-${String(romaniaTime.getUTCMonth() + 1).padStart(2, "0")}-${String(romaniaTime.getUTCDate()).padStart(2, "0")}`;

      const existing = ordersByDate.get(dateKey) || {
        revenue: 0,
        count: 0,
        productsSold: 0,
      };

      // Calculate revenue based on includeUpsells flag
      let orderRevenue = order.subtotal || 0;
      if (includeUpsells && order.upsells && Array.isArray(order.upsells)) {
        order.upsells.forEach((upsell: any) => {
          orderRevenue += (upsell.price || 0) * (upsell.quantity || 1);
        });
      }
      // Add shipping cost
      orderRevenue += order.shipping_cost || 0;

      existing.revenue += orderRevenue;
      existing.count += 1;
      existing.productsSold += order.product_quantity || 1;

      ordersByDate.set(dateKey, existing);
    });

    // Build ROAS data rows (only for days with ad spend data)
    const roasData: RoasDataRow[] = (adSpendData || []).map((adRow: any) => {
      const orderData = ordersByDate.get(adRow.date) || {
        revenue: 0,
        count: 0,
        productsSold: 0,
      };

      const roas =
        adRow.amount_spent > 0
          ? orderData.revenue / adRow.amount_spent
          : null;

      return {
        date: adRow.date,
        adSpend: parseFloat(adRow.amount_spent) || 0,
        revenue: orderData.revenue,
        roas,
        orders: orderData.count,
        productsSold: orderData.productsSold,
        avgOrderValue:
          orderData.count > 0 ? orderData.revenue / orderData.count : 0,
        metaPurchases: adRow.meta_purchases || 0,
        metaPurchaseValue: parseFloat(adRow.meta_purchase_value) || 0,
      };
    });

    // Calculate totals
    const totals = roasData.reduce(
      (acc, row) => ({
        adSpend: acc.adSpend + row.adSpend,
        revenue: acc.revenue + row.revenue,
        orders: acc.orders + row.orders,
        productsSold: acc.productsSold + row.productsSold,
        metaPurchases: acc.metaPurchases + row.metaPurchases,
        metaPurchaseValue: acc.metaPurchaseValue + row.metaPurchaseValue,
      }),
      {
        adSpend: 0,
        revenue: 0,
        orders: 0,
        productsSold: 0,
        metaPurchases: 0,
        metaPurchaseValue: 0,
      }
    );

    const totalRoas = totals.adSpend > 0 ? totals.revenue / totals.adSpend : null;
    const avgOrderValue = totals.orders > 0 ? totals.revenue / totals.orders : 0;

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
      month,
      includeUpsells,
      data: roasData,
      totals: {
        ...totals,
        roas: totalRoas,
        avgOrderValue,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/roas/data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roas/data - Delete ad spend data for a product and date range
 * Query params:
 *   - productId: UUID of the product
 *   - month: Month in YYYY-MM format
 */
export async function DELETE(request: NextRequest) {
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
    const productId = searchParams.get("productId");
    const month = searchParams.get("month");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month is required in YYYY-MM format" },
        { status: 400 }
      );
    }

    // Parse month to get date range
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1))
      .toISOString()
      .split("T")[0];
    const endDate = new Date(Date.UTC(year, monthNum, 0))
      .toISOString()
      .split("T")[0];

    const { error: deleteError, count } = await supabase
      .from("ad_spend_data")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (deleteError) {
      console.error("Error deleting ad spend data:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete ad spend data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
    });
  } catch (error) {
    console.error("Error in DELETE /api/roas/data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
