import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * Sincronizează manual tracking status pentru o comandă specifică
 * POST /api/orders/[id]/sync-tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [session, { id: orderId }] = await Promise.all([
      getServerSession(authOptions),
      params,
    ]);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Găsește comanda în DB
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, helpship_order_id, organization_id, tracking_status")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Order has no Helpship ID" },
        { status: 400 },
      );
    }

    // Obține credențialele Helpship pentru organizație
    const credentials = await getHelpshipCredentials(order.organization_id);
    const helpshipClient = new HelpshipClient(credentials);

    // Obținem tracking status
    const tracking = await helpshipClient.getTrackingStatus(order.helpship_order_id);

    if (!tracking) {
      return NextResponse.json(
        { error: "Failed to get tracking status from Helpship" },
        { status: 500 },
      );
    }

    // Actualizăm în DB
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        tracking_status: tracking.trackingStatus,
        tracking_updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[Sync Tracking] Error updating order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 },
      );
    }

    const changed = tracking.trackingStatus !== order.tracking_status;

    console.log(
      `[Sync Tracking] Order ${orderId}: ${order.tracking_status || 'null'} -> ${tracking.trackingStatus}${changed ? ' (changed)' : ' (unchanged)'}`
    );

    return NextResponse.json({
      success: true,
      trackingStatus: tracking.trackingStatus,
      trackingNumber: tracking.trackingNumber,
      deliveryService: tracking.deliveryService,
      changed,
    });
  } catch (error) {
    console.error("[Sync Tracking] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
