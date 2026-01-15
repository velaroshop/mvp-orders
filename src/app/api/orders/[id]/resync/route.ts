import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { HelpshipClient } from "@/lib/helpship";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*, landing_pages!inner(organization_id, store_id)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify user has access to this organization
    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const orderOrganizationId = (order.landing_pages as any).organization_id;

    if (activeOrganizationId !== orderOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order already has a Helpship ID
    if (order.helpship_order_id) {
      return NextResponse.json(
        { error: "Order already synced with Helpship" },
        { status: 400 }
      );
    }

    // Get order series from store
    let orderSeries = "VLR";
    if ((order.landing_pages as any).store_id) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("order_series")
        .eq("id", (order.landing_pages as any).store_id)
        .single();

      if (store?.order_series) {
        orderSeries = store.order_series;
      }
    }

    // Get Helpship credentials for organization
    const credentials = await getHelpshipCredentials(orderOrganizationId);
    const helpshipClient = new HelpshipClient(credentials);

    // Try to create order in Helpship
    try {
      console.log(`[Resync] Attempting to sync order ${orderId} to Helpship...`);

      const helpshipResult = await helpshipClient.createOrder({
        orderId: order.id,
        orderNumber: order.order_number || 0,
        orderSeries: orderSeries,
        customerName: order.full_name,
        customerPhone: order.phone,
        county: order.county,
        city: order.city,
        address: order.address,
        offerCode: order.offer_code,
        subtotal: parseFloat(order.subtotal.toString()),
        shippingCost: parseFloat(order.shipping_cost.toString()),
        total: parseFloat(order.total.toString()),
        upsells: order.upsells || [],
      });

      console.log(`[Resync] Order synced successfully:`, helpshipResult);

      // Update order with helpship_order_id and change status to pending
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          helpship_order_id: helpshipResult.orderId,
          status: "pending",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("[Resync] Failed to update order:", updateError);
        throw new Error("Failed to update order status");
      }

      return NextResponse.json({
        success: true,
        helpshipOrderId: helpshipResult.orderId,
        message: "Order synced successfully with Helpship",
      });
    } catch (err) {
      console.error("[Resync] Failed to sync order:", err);

      // Keep the sync_error status since resync failed
      return NextResponse.json(
        {
          error: "Failed to sync with Helpship",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in resync endpoint", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
