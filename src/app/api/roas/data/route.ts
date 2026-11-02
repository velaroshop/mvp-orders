import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { bucharestDateKey, bucharestDayEndIso, bucharestDayStartIso } from "@/lib/romania-time";

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

interface ProductRoasRow {
  id: string;
  name: string;
  adSpend: number;
  revenue: number;
  roas: number;
  orders: number;
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

    const isAllProducts = productId === "all";

    // Parse month to get date range
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch ad spend data for the month
    let adSpendQuery = supabase
      .from("ad_spend_data")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (!isAllProducts) {
      adSpendQuery = adSpendQuery.eq("product_id", productId);
    }

    const { data: adSpendData, error: adSpendError } = await adSpendQuery;

    if (adSpendError) {
      console.error("Error fetching ad spend data:", adSpendError);
      return NextResponse.json(
        { error: "Failed to fetch ad spend data" },
        { status: 500 }
      );
    }

    // When "all", aggregate ad spend by date (sum across all products)
    let aggregatedAdSpend = adSpendData || [];
    if (isAllProducts && aggregatedAdSpend.length > 0) {
      const adSpendByDate: Map<string, { date: string; amount_spent: number; meta_purchases: number; meta_purchase_value: number }> = new Map();
      aggregatedAdSpend.forEach((row: any) => {
        const existing = adSpendByDate.get(row.date);
        if (existing) {
          existing.amount_spent += parseFloat(row.amount_spent) || 0;
          existing.meta_purchases += row.meta_purchases || 0;
          existing.meta_purchase_value += parseFloat(row.meta_purchase_value) || 0;
        } else {
          adSpendByDate.set(row.date, {
            date: row.date,
            amount_spent: parseFloat(row.amount_spent) || 0,
            meta_purchases: row.meta_purchases || 0,
            meta_purchase_value: parseFloat(row.meta_purchase_value) || 0,
          });
        }
      });
      aggregatedAdSpend = Array.from(adSpendByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Fetch product info (only for single product)
    let product: { id: string; name: string; sku: string | null } = {
      id: "all",
      name: "All Products",
      sku: null,
    };

    if (!isAllProducts) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("id", productId)
        .eq("organization_id", organizationId)
        .single();

      if (productError || !productData) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
      product = productData;
    }

    // Use Romania time (winter/summer aware) for date filtering
    const startDateTime = bucharestDayStartIso(startDateStr);
    const endDateTime = bucharestDayEndIso(endDateStr);

    // Fetch all orders using pagination (Supabase server-side max_rows caps single requests to 1000)
    const allOrders: any[] = [];
    const batchSize = 1000;
    let offset = 0;

    while (true) {
      let batchQuery = supabase
        .from("orders")
        .select("id, created_at, total, product_quantity, product_sku, upsells")
        .eq("organization_id", organizationId)
        .neq("status", "cancelled")
        .neq("status", "testing")
        .gte("created_at", startDateTime)
        .lte("created_at", endDateTime)
        .order("created_at", { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (!isAllProducts && product.sku) {
        batchQuery = batchQuery.eq("product_sku", product.sku);
      }

      const { data: batch, error: batchError } = await batchQuery;

      if (batchError) {
        console.error("Error fetching orders batch:", batchError);
        return NextResponse.json(
          { error: "Failed to fetch orders" },
          { status: 500 }
        );
      }

      if (!batch || batch.length === 0) break;
      allOrders.push(...batch);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    const orders = allOrders;

    // Use order.total directly (consistent with Dashboard KPI)
    // order.total already includes: subtotal + upsells + shipping
    // When includeUpsells is false, subtract upsell values from total
    const getOrderRevenue = (order: any): number => {
      let orderRevenue = order.total || 0;
      if (!includeUpsells && order.upsells && Array.isArray(order.upsells)) {
        order.upsells.forEach((upsell: any) => {
          orderRevenue -= (upsell.price || 0) * (upsell.quantity || 1);
        });
      }
      return orderRevenue;
    };

    // Group orders by date (Romania time)
    const ordersByDate: Map<
      string,
      { revenue: number; count: number; productsSold: number }
    > = new Map();

    (orders || []).forEach((order: any) => {
      const dateKey = bucharestDateKey(new Date(order.created_at));

      const existing = ordersByDate.get(dateKey) || {
        revenue: 0,
        count: 0,
        productsSold: 0,
      };

      const orderRevenue = getOrderRevenue(order);

      existing.revenue += orderRevenue;
      existing.count += 1;
      existing.productsSold += order.product_quantity || 1;

      ordersByDate.set(dateKey, existing);
    });

    // Build ROAS data rows (only for days with ad spend data)
    const roasData: RoasDataRow[] = (aggregatedAdSpend).map((adRow: any) => {
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

    // Per-product breakdown (only for "all"): same rules as the single-product view,
    // i.e. revenue counts only on days where that product has ad spend
    let byProduct: ProductRoasRow[] | undefined;
    if (isAllProducts) {
      const { data: orgProducts } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("organization_id", organizationId);

      const spendByProduct = new Map<string, { adSpend: number; dates: Set<string> }>();
      (adSpendData || []).forEach((row: any) => {
        const entry = spendByProduct.get(row.product_id) || { adSpend: 0, dates: new Set<string>() };
        entry.adSpend += parseFloat(row.amount_spent) || 0;
        entry.dates.add(row.date);
        spendByProduct.set(row.product_id, entry);
      });

      const ordersBySkuDate = new Map<string, Map<string, { revenue: number; count: number }>>();
      orders.forEach((order: any) => {
        if (!order.product_sku) return;
        const dateKey = bucharestDateKey(new Date(order.created_at));
        const byDate = ordersBySkuDate.get(order.product_sku) || new Map();
        const entry = byDate.get(dateKey) || { revenue: 0, count: 0 };
        entry.revenue += getOrderRevenue(order);
        entry.count += 1;
        byDate.set(dateKey, entry);
        ordersBySkuDate.set(order.product_sku, byDate);
      });

      byProduct = (orgProducts || [])
        .filter((p: any) => (spendByProduct.get(p.id)?.adSpend || 0) > 0)
        .map((p: any) => {
          const spend = spendByProduct.get(p.id)!;
          const byDate = (p.sku && ordersBySkuDate.get(p.sku)) || new Map<string, { revenue: number; count: number }>();
          let revenue = 0;
          let orderCount = 0;
          spend.dates.forEach((date) => {
            const entry = byDate.get(date);
            if (entry) {
              revenue += entry.revenue;
              orderCount += entry.count;
            }
          });
          return {
            id: p.id,
            name: p.name,
            adSpend: spend.adSpend,
            revenue,
            roas: revenue / spend.adSpend,
            orders: orderCount,
          };
        })
        .sort((a, b) => b.roas - a.roas);
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
      month,
      includeUpsells,
      data: roasData,
      byProduct,
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
