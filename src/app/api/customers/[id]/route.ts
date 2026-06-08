import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: customerId } = await params;

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get customer details
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (customerError || !customerData) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Get customer's orders WITH PAGINATION
    const { data: ordersData, error: ordersError, count } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact" })
      .eq("customer_id", customerId)
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Map customer data - we'll override totalSpent with confirmed-only calculation later
    const customer = {
      id: customerData.id,
      organizationId: customerData.organization_id,
      phone: customerData.phone,
      firstOrderDate: customerData.first_order_date,
      lastOrderDate: customerData.last_order_date,
      totalOrders: customerData.total_orders || 0,
      totalSpent: 0, // Will be calculated from confirmed orders
      createdAt: customerData.created_at,
      updatedAt: customerData.updated_at,
      isBlacklisted: customerData.is_blacklisted || false,
      blacklistedAt: customerData.blacklisted_at || null,
      blacklistedReason: customerData.blacklisted_reason || null,
    };

    // Calculate totalSpent only from confirmed orders
    const confirmedTotal = (ordersData || [])
      .filter((row) => row.status === "confirmed")
      .reduce((sum, row) => sum + parseFloat(row.total?.toString() || "0"), 0);

    // Count confirmed orders
    const confirmedOrdersCount = (ordersData || []).filter(
      (row) => row.status === "confirmed"
    ).length;

    // Map orders data
    const orders = (ordersData || []).map((row) => ({
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
      trackingStatus: row.tracking_status ?? undefined,
      trackingUpdatedAt: row.tracking_updated_at ?? undefined,
      createdAt: row.created_at,
    }));

    // Set confirmed-only totals
    customer.totalSpent = confirmedTotal;

    return NextResponse.json({
      customer,
      orders,
      total: count || 0,
      confirmedOrdersCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching customer details", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
