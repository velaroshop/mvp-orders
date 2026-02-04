import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    const statusesParam = searchParams.get("statuses") || "";
    const dateRangeParam = searchParams.get("dateRange") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Parse statuses
    const statuses = statusesParam.trim()
      ? statusesParam.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    // Calculate date cutoff if searching with date range
    let dateCutoff: string | null = null;
    if (searchQuery.trim() && dateRangeParam) {
      const days = parseInt(dateRangeParam);
      if (!isNaN(days) && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        dateCutoff = cutoffDate.toISOString();
      }
    }

    // Use RPC for diacritics-insensitive search
    const { data, error } = await supabaseAdmin.rpc("search_orders", {
      p_organization_id: activeOrganizationId,
      p_search_query: searchQuery.trim(),
      p_statuses: statuses,
      p_date_cutoff: dateCutoff,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      // Fallback to regular query if RPC doesn't exist yet (migration not run)
      console.warn("RPC search_orders failed, falling back to regular query:", error.message);
      return await fallbackSearch(
        activeOrganizationId,
        searchQuery,
        statuses,
        dateCutoff,
        limit,
        offset
      );
    }

    // Get total count from first row (all rows have same total_count)
    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

    // Map rows to Order type
    const orders = (data || []).map((row: any) => ({
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
      subtotal: parseFloat(row.subtotal?.toString() || "0"),
      shippingCost: parseFloat(row.shipping_cost?.toString() || "0"),
      total: parseFloat(row.total?.toString() || "0"),
      status: row.status as OrderStatus,
      helpshipOrderId: row.helpship_order_id ?? undefined,
      orderNumber: row.order_number ?? undefined,
      orderSeries: row.order_series ?? undefined,
      orderNote: row.order_note ?? undefined,
      promotedFromTesting: row.promoted_from_testing ?? undefined,
      fromPartialId: row.from_partial_id ?? undefined,
      confirmerName: row.confirmer_name ?? undefined,
      cancellerName: row.canceller_name ?? undefined,
      cancelledNote: row.cancelled_note ?? undefined,
      scheduledDate: row.scheduled_date ?? undefined,
      fbclid: row.fbclid ?? undefined,
      gclid: row.gclid ?? undefined,
      ttclid: row.ttclid ?? undefined,
      trackingData: row.tracking_data ?? undefined,
      trackingStatus: row.tracking_status ?? undefined,
      trackingUpdatedAt: row.tracking_updated_at ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      orders,
      total: totalCount,
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

/**
 * Fallback search using regular Supabase query (before migration is run)
 */
async function fallbackSearch(
  organizationId: string,
  searchQuery: string,
  statuses: string[] | null,
  dateCutoff: string | null,
  limit: number,
  offset: number
) {
  let query = supabaseAdmin
    .from("orders")
    .select("*, confirmer:users!confirmed_by(name)", { count: "exact" })
    .eq("organization_id", organizationId);

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  if (dateCutoff) {
    query = query.gte("created_at", dateCutoff);
  }

  if (searchQuery.trim()) {
    query = query.or(
      `phone.ilike.%${searchQuery}%,` +
      `full_name.ilike.%${searchQuery}%,` +
      `county.ilike.%${searchQuery}%,` +
      `city.ilike.%${searchQuery}%,` +
      `address.ilike.%${searchQuery}%`
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  const orders = (data || []).map((row: any) => ({
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
    orderSeries: row.order_series ?? undefined,
    orderNote: row.order_note ?? undefined,
    promotedFromTesting: row.promoted_from_testing ?? undefined,
    fromPartialId: row.from_partial_id ?? undefined,
    confirmerName: row.confirmer?.name ?? undefined,
    cancellerName: row.canceller_name ?? undefined,
    cancelledNote: row.cancelled_note ?? undefined,
    scheduledDate: row.scheduled_date ?? undefined,
    fbclid: row.fbclid ?? undefined,
    gclid: row.gclid ?? undefined,
    ttclid: row.ttclid ?? undefined,
    trackingData: row.tracking_data ?? undefined,
    trackingStatus: row.tracking_status ?? undefined,
    trackingUpdatedAt: row.tracking_updated_at ?? undefined,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    orders,
    total: count || 0,
    limit,
    offset
  });
}

