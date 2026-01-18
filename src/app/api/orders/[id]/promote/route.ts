import { NextRequest, NextResponse } from "next/server";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/orders/[id]/promote - Promote testing order to real order
 * Changes status from 'testing' to 'pending' and syncs to Helpship
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log("[Promote] Promoting testing order to real order:", orderId);

    // Verify order exists and is in testing status
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[Promote] Order not found:", orderError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "testing") {
      console.log("[Promote] Order is not in testing status:", order.status);
      return NextResponse.json(
        { error: "Only testing orders can be promoted" },
        { status: 400 }
      );
    }

    // Update order to mark as promoted from testing (before sync)
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        promoted_from_testing: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[Promote] Failed to update order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order", details: updateError.message },
        { status: 500 }
      );
    }

    // Sync order to Helpship (will update status to 'pending' on success)
    const syncResult = await syncOrderToHelpship(orderId);

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: "Failed to sync order to Helpship",
          details: syncResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: orderId,
      helpshipOrderId: syncResult.helpshipOrderId,
      message: "Testing order promoted to real order and synced to Helpship",
    });
  } catch (error) {
    console.error("[Promote] Error promoting order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
