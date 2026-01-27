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

    // Get query params for pagination and search
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const statusesParam = searchParams.get("statuses") || ""; // Multiple statuses filter
    const dateRangeParam = searchParams.get("dateRange") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Parse statuses first to determine if we should show converted orders
    const statuses = statusesParam.trim()
      ? statusesParam.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    // Check if user explicitly wants to see "accepted" (confirmed) partials
    const includeConverted = statuses.includes("accepted");

    console.log("[Partials List] Query params:", {
      statuses,
      includeConverted,
      searchQuery: searchQuery.trim() || "(none)",
    });

    // Build base query
    let query = supabaseAdmin
      .from("partial_orders")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId);

    // Only filter out converted orders if user is NOT filtering by "accepted" status
    // This allows users to see confirmed partials when they explicitly filter for them
    if (!includeConverted) {
      query = query.is("converted_to_order_id", null);
    }

    // Filter by statuses if provided
    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }

    // Debug: count all accepted partials for this org
    if (includeConverted) {
      const { count: acceptedCount } = await supabaseAdmin
        .from("partial_orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .eq("status", "accepted");
      console.log("[Partials List] Total accepted partials in DB:", acceptedCount);
    }

    // Add date range filter when searching (for performance optimization)
    if (searchQuery.trim() && dateRangeParam) {
      const days = parseInt(dateRangeParam);
      if (!isNaN(days) && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte("created_at", cutoffDate.toISOString());
      }
    }

    // Add search filter if query provided
    if (searchQuery.trim()) {
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
      console.error("Error listing partial orders:", error);
      return NextResponse.json(
        { error: "Failed to list partial orders" },
        { status: 500 },
      );
    }

    console.log(`[Partials List] Returned ${data?.length || 0} records (offset: ${offset}, limit: ${limit}, total: ${count})`);

    // Get unique landing keys to fetch store URLs (only for current page)
    const landingKeys = [...new Set(data?.map(row => row.landing_key).filter(Boolean))];

    // Fetch landing pages with stores for current page only
    const { data: landingPagesData } = await supabaseAdmin
      .from("landing_pages")
      .select("slug, stores(url)")
      .in("slug", landingKeys);

    // Create a map of landing_key -> store_url
    const storeUrlMap = new Map<string, string | null>(
      landingPagesData?.map(lp => [lp.slug, (lp.stores as any)?.url || null]) || []
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
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/partial-orders/list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
