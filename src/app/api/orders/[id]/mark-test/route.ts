import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * POST /api/orders/[id]/mark-test
 * Marks a real order as "testing" - cancels it in Helpship if synced.
 * SUPERADMIN ONLY.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
    }

    const orderId = params.id;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, helpship_order_id, organization_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "testing") {
      return NextResponse.json({ error: "Order is already marked as test" }, { status: 400 });
    }

    if (order.status === "confirmed") {
      return NextResponse.json(
        { error: "Cannot mark confirmed orders as test - they may already be processed in Helpship" },
        { status: 400 }
      );
    }

    // Cancel in Helpship if synced
    if (order.helpship_order_id) {
      try {
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        const helpshipStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);
        if (helpshipStatus && helpshipStatus.statusName !== "Archived") {
          await helpshipClient.cancelOrder(order.helpship_order_id);
          console.log(`[MarkTest] Order ${order.helpship_order_id} archived in Helpship`);
        }
      } catch (helpshipError) {
        console.error(`[MarkTest] Failed to cancel in Helpship:`, helpshipError);
        // Continue - we still want to mark as test locally
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "testing" })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    console.log(`[MarkTest] Order ${orderId} marked as testing`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MarkTest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
