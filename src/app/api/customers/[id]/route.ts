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

    // Get customer's orders
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Map customer data
    const customer = {
      id: customerData.id,
      organizationId: customerData.organization_id,
      phone: customerData.phone,
      firstOrderDate: customerData.first_order_date,
      lastOrderDate: customerData.last_order_date,
      totalOrders: customerData.total_orders || 0,
      totalSpent: parseFloat(customerData.total_spent?.toString() || "0"),
      createdAt: customerData.created_at,
      updatedAt: customerData.updated_at,
    };

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
      orderNote: row.order_note ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ customer, orders });
  } catch (error) {
    console.error("Error fetching customer details", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
