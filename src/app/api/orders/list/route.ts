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
    const trackingStatusesParam = searchParams.get("trackingStatuses") || "";
    const dateRangeParam = searchParams.get("dateRange") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Parse statuses
    const statuses = statusesParam.trim()
      ? statusesParam.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    // Parse tracking statuses
    const trackingStatuses = trackingStatusesParam.trim()
      ? trackingStatusesParam.split(",").map(s => s.trim()).filter(Boolean)
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
        trackingStatuses,
        dateCutoff,
        limit,
        offset
      );
    }

    // Filter by tracking status if specified (done in JS since RPC doesn't support it yet)
    // Note: This may result in fewer results per page when filtering
    let filteredData = data || [];
    if (trackingStatuses && trackingStatuses.length > 0) {
      filteredData = filteredData.filter((row: any) => {
        // Handle special "NULL" value for orders without tracking status
        if (trackingStatuses.includes("NULL")) {
          if (row.tracking_status === null || row.tracking_status === undefined) {
            return true;
          }
        }
        // Check if the tracking status matches any of the selected ones
        return trackingStatuses.includes(row.tracking_status);
      });
    }

    // Get total count - if filtering by tracking status, count filtered results
    // Note: When filtering by tracking status, total count is approximate
    const totalCount = trackingStatuses && trackingStatuses.length > 0
      ? filteredData.length
      : (data && data.length > 0 ? Number(data[0].total_count) : 0);

    // Map rows to Order type
    const orders = filteredData.map((row: any) => ({
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
  trackingStatuses: string[] | null,
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

  // Filter by tracking status
  if (trackingStatuses && trackingStatuses.length > 0) {
    // Handle special "NULL" case for orders without tracking status
    const hasNull = trackingStatuses.includes("NULL");
    const nonNullStatuses = trackingStatuses.filter(s => s !== "NULL");

    if (hasNull && nonNullStatuses.length > 0) {
      // Both NULL and other statuses selected
      query = query.or(`tracking_status.is.null,tracking_status.in.(${nonNullStatuses.join(",")})`);
    } else if (hasNull) {
      // Only NULL selected
      query = query.is("tracking_status", null);
    } else {
      // Only non-NULL statuses selected
      query = query.in("tracking_status", nonNullStatuses);
    }
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

