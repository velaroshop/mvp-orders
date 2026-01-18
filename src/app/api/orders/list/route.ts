import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

export async function GET(request: Request) {
  try {
    // Obține session-ul utilizatorului
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obține organization_id activ din session
    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Get search query and pagination params from URL
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabaseAdmin
      .from("orders")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId);

    // Add search filter if query provided
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      query = query.or(
        `phone.ilike.%${searchQuery}%,` +
        `full_name.ilike.%${searchQuery}%,` +
        `county.ilike.%${searchQuery}%,` +
        `city.ilike.%${searchQuery}%,` +
        `address.ilike.%${searchQuery}%`
      );
    }

    // Add ordering and pagination
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    // Get unique landing keys to fetch order_series
    const landingKeys = [...new Set((data || []).map(order => order.landing_key))];

    // Fetch landing pages with store_ids
    const landingPageMap = new Map<string, string>(); // slug -> store_id
    if (landingKeys.length > 0) {
      const { data: landingPages } = await supabaseAdmin
        .from("landing_pages")
        .select("slug, store_id")
        .in("slug", landingKeys);

      if (landingPages) {
        landingPages.forEach((lp: any) => {
          if (lp.store_id) {
            landingPageMap.set(lp.slug, lp.store_id);
          }
        });
      }
    }

    // Fetch order_series for unique store_ids
    const storeIds = [...new Set(Array.from(landingPageMap.values()))];
    const orderSeriesMap = new Map<string, string>(); // store_id -> order_series
    if (storeIds.length > 0) {
      const { data: stores } = await supabaseAdmin
        .from("stores")
        .select("id, order_series")
        .in("id", storeIds);

      if (stores) {
        stores.forEach((store: any) => {
          if (store.order_series) {
            orderSeriesMap.set(store.id, store.order_series);
          }
        });
      }
    }

    // Map Supabase rows to Order type
    const orders = (data || []).map((row) => {
      const storeId = landingPageMap.get(row.landing_key);
      const orderSeries = storeId ? orderSeriesMap.get(storeId) : undefined;

      return {
        id: row.id,
        customerId: row.customer_id,
        landingKey: row.landing_key,
        offerCode: row.offer_code,
        phone: row.phone,
        fullName: row.full_name,
        county: row.county,
        city: row.city,
        address: row.address,
        postalCode: row.postal_code ?? undefined,
        productName: row.product_name ?? undefined,
        productSku: row.product_sku ?? undefined,
        productQuantity: row.product_quantity ?? undefined,
        upsells: row.upsells,
        subtotal: parseFloat(row.subtotal.toString()),
        shippingCost: parseFloat(row.shipping_cost.toString()),
        total: parseFloat(row.total.toString()),
        status: row.status as OrderStatus,
        helpshipOrderId: row.helpship_order_id ?? undefined,
        orderNumber: row.order_number ?? undefined,
        orderSeries: orderSeries,
        orderNote: row.order_note ?? undefined,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      orders,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error listing orders", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

