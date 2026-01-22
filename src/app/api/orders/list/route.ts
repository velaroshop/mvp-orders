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
    const statusesParam = searchParams.get("statuses") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query - include confirmer user name
    let query = supabaseAdmin
      .from("orders")
      .select("*, confirmer:users!confirmed_by(name)", { count: "exact" })
      .eq("organization_id", activeOrganizationId);

    // Add status filter if statuses provided
    if (statusesParam.trim()) {
      const statuses = statusesParam.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query = query.in("status", statuses);
      }
    }

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

    // Map Supabase rows to Order type
    const orders = (data || []).map((row: any) => {
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
        orderSeries: row.order_series ?? undefined,
        orderNote: row.order_note ?? undefined,
        promotedFromTesting: row.promoted_from_testing ?? undefined,
        fromPartialId: row.from_partial_id ?? undefined,
        confirmerName: row.confirmer?.name ?? undefined,
        scheduledDate: row.scheduled_date ?? undefined,
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

