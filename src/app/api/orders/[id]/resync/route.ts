import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrderToHelpship } from "@/lib/helpship-sync";

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

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, organization_id, helpship_order_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[Resync] Order not found:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (activeOrganizationId !== order.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (order.helpship_order_id) {
      return NextResponse.json(
        { error: "Order already synced with Helpship" },
        { status: 400 }
      );
    }

    console.log(`[Resync] Attempting to sync order ${orderId} to Helpship...`);

    // Same path as the regular sync: variations, VAT, quantities and upsell names stay consistent
    const syncResult = await syncOrderToHelpship(orderId);

    if (!syncResult.success) {
      console.error("[Resync] Failed to sync order:", syncResult.error);
      return NextResponse.json(
        {
          error: "Failed to sync with Helpship",
          details: syncResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      helpshipOrderId: syncResult.helpshipOrderId,
      message: "Order synced successfully with Helpship",
    });
  } catch (error) {
    console.error("Error in resync endpoint", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
