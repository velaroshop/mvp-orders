import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

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
    const customerId = searchParams.get("customerId");
    const currentOrderId = searchParams.get("currentOrderId"); // Optional: exclude current order

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    // Get store settings to determine duplicate_order_days
    const { data: stores, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("duplicate_order_days")
      .eq("organization_id", activeOrganizationId)
      .limit(1);

    if (storeError) {
      console.error("Error fetching store settings:", storeError);
      return NextResponse.json(
        { error: "Failed to fetch store settings" },
        { status: 500 },
      );
    }

    const duplicateOrderDays = stores?.[0]?.duplicate_order_days || 14;

    // Calculate the date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - duplicateOrderDays);
    const thresholdISO = thresholdDate.toISOString();

    // Build query to find recent orders for this customer
    let query = supabaseAdmin
      .from("orders")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .eq("customer_id", customerId)
      .gte("created_at", thresholdISO)
      .order("created_at", { ascending: false });

    // Exclude current order if provided
    if (currentOrderId) {
      query = query.neq("id", currentOrderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error checking duplicate orders:", error);
      return NextResponse.json(
        { error: "Failed to check duplicate orders" },
        { status: 500 },
      );
    }

    // Map to Order type
    const orders = (data || []).map((row) => ({
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
      orderNote: row.order_note ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      hasDuplicates: orders.length > 0,
      duplicateCount: orders.length,
      duplicateOrderDays,
      orders,
    });
  } catch (error) {
    console.error("Error in check-duplicates API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
