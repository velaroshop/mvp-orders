import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { PartialOrderStatus } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Optional filter by status

    // Build query
    let query = supabaseAdmin
      .from("partial_orders")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error listing partial orders:", error);
      return NextResponse.json(
        { error: "Failed to list partial orders" },
        { status: 500 },
      );
    }

    // Get unique landing keys to fetch store URLs
    const landingKeys = [...new Set(data?.map(row => row.landing_key).filter(Boolean))];

    // Fetch landing pages with stores for all unique landing keys
    const { data: landingPagesData } = await supabaseAdmin
      .from("landing_pages")
      .select("slug, stores(url)")
      .in("slug", landingKeys);

    // Create a map of landing_key -> store_url
    const storeUrlMap = new Map(
      landingPagesData?.map(lp => [lp.slug, lp.stores?.url]) || []
    );

    // Map to PartialOrder type
    const partialOrders = (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      partialNumber: row.partial_number,
      landingKey: row.landing_key,
      offerCode: row.offer_code,
      phone: row.phone,
      fullName: row.full_name,
      county: row.county,
      city: row.city,
      address: row.address,
      postalCode: row.postal_code,
      productName: row.product_name,
      productSku: row.product_sku,
      productQuantity: row.product_quantity,
      upsells: row.upsells || [],
      subtotal: row.subtotal ? parseFloat(row.subtotal.toString()) : undefined,
      shippingCost: row.shipping_cost
        ? parseFloat(row.shipping_cost.toString())
        : undefined,
      total: row.total ? parseFloat(row.total.toString()) : undefined,
      lastCompletedField: row.last_completed_field,
      completionPercentage: row.completion_percentage || 0,
      status: row.status as PartialOrderStatus,
      convertedToOrderId: row.converted_to_order_id,
      convertedAt: row.converted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      abandonedAt: row.abandoned_at,
      storeUrl: storeUrlMap.get(row.landing_key) || null,
    }));

    return NextResponse.json({
      partialOrders,
      total: count || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/partial-orders/list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
