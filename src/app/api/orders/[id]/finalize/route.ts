import { NextRequest, NextResponse } from "next/server";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/orders/[id]/finalize - Finalize order without postsale
 * Called when user declines postsale or countdown expires
 * Changes status from 'queue' to 'pending' and syncs to Helpship
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log("[Finalize] Finalizing order without postsale:", orderId);

    // Verify order exists and is in queue or testing status
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[Finalize] Order not found:", orderError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Testing orders: just mark as finalized, don't sync to Helpship
    if (order.status === "testing") {
      console.log("[Finalize] Testing order - skipping Helpship sync");
      return NextResponse.json({
        success: true,
        orderId: orderId,
        message: "Testing order marked as finalized (not synced to Helpship)",
        isTesting: true,
      });
    }

    if (order.status !== "queue") {
      console.log("[Finalize] Order already finalized, status:", order.status);
      return NextResponse.json(
        {
          success: true,
          message: "Order already finalized",
          status: order.status,
        },
        { status: 200 }
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
      message: "Order finalized and synced to Helpship",
    });
  } catch (error) {
    console.error("[Finalize] Error finalizing order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
