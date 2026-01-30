import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { HelpshipClient } from "@/lib/helpship";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";

const HELPSHIP_TO_MVP_STATUS: Record<string, string> = {
  Pending: "pending",
  Packing: "confirmed",
  Packed: "confirmed",
  Fulfilled: "confirmed",
  Incomplete: "confirmed",
  Archived: "cancelled",
  OnHold: "hold",
};

/**
 * GET /api/orders/[id]/sync-status - Check Helpship status vs local status
 * Returns both statuses for comparison before user confirms the sync
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (activeOrganizationId !== order.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Order not synced to Helpship yet" },
        { status: 400 }
      );
    }

    const credentials = await getHelpshipCredentials(order.organization_id);
    const helpshipClient = new HelpshipClient(credentials);
    const helpshipStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

    if (!helpshipStatus) {
      return NextResponse.json(
        { error: "Could not retrieve status from Helpship" },
        { status: 502 }
      );
    }

    const suggestedMvpStatus = HELPSHIP_TO_MVP_STATUS[helpshipStatus.statusName] || null;

    return NextResponse.json({
      orderId: order.id,
      currentMvpStatus: order.status,
      helpshipStatus: helpshipStatus.statusName,
      helpshipStatusCode: helpshipStatus.status,
      suggestedMvpStatus,
      needsSync: suggestedMvpStatus !== null && suggestedMvpStatus !== order.status,
    });
  } catch (error) {
    console.error("[SyncStatus] Error checking status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/sync-status - Apply the Helpship status to local DB
 * Only updates local DB status (no Helpship API writes)
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

    const orderId = params.id;
    const body = await request.json();
    const { newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "cancelled", "hold"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, helpship_order_id, organization_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (activeOrganizationId !== order.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Order not synced to Helpship yet" },
        { status: 400 }
      );
    }

    if (order.status === newStatus) {
      return NextResponse.json({
        success: true,
        message: "Status already matches",
        status: newStatus,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("[SyncStatus] Failed to update order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    console.log(
      `[SyncStatus] Order ${orderId} status updated: ${order.status} → ${newStatus} (synced from Helpship)`
    );

    return NextResponse.json({
      success: true,
      previousStatus: order.status,
      newStatus,
    });
  } catch (error) {
    console.error("[SyncStatus] Error applying status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
