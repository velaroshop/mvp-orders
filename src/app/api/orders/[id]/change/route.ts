import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOrderOwnership } from "@/lib/auth-helpers";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * POST /api/orders/[id]/change
 * Modifies product quantities, prices, upsells, and shipping on an order.
 * If order is synced to Helpship: cancels old order and recreates with updated data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [session, { id: orderId }, body] = await Promise.all([
      getServerSession(authOptions),
      params,
      request.json(),
    ]);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 },
      );
    }

    const [ownership, orderResult] = await Promise.all([
      verifyOrderOwnership(orderId, session.user.activeOrganizationId),
      supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single(),
    ]);

    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.error || "Access denied" },
        { status: 403 },
      );
    }

    const { data: order, error: fetchError } = orderResult;

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    // Only allow changes for these statuses
    const allowedStatuses = ["pending", "confirmed", "hold"];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Comanda nu poate fi modificată în statusul "${order.status}"` },
        { status: 400 },
      );
    }

    const { productQuantity, unitPrice, upsells, shippingCost } = body;

    // Server-side recalculation
    const serverSubtotal = unitPrice * productQuantity;
    const serverUpsellsTotal = (upsells || []).reduce(
      (sum: number, u: any) => sum + (u.price * u.quantity),
      0
    );
    const serverTotal = serverSubtotal + serverUpsellsTotal + shippingCost;

    console.log("[ChangeOrder] Updating order:", {
      orderId,
      productQuantity,
      unitPrice,
      subtotal: serverSubtotal,
      upsellsTotal: serverUpsellsTotal,
      shippingCost,
      total: serverTotal,
    });

    // Update order in DB
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        product_quantity: productQuantity,
        subtotal: serverSubtotal,
        shipping_cost: shippingCost,
        total: serverTotal,
        upsells: upsells || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[ChangeOrder] DB update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to update order in database" },
        { status: 500 },
      );
    }

    // If order has been synced to Helpship, cancel old and recreate
    let newHelpshipOrderId: string | undefined;
    let helpshipWarning: string | undefined;

    if (order.helpship_order_id) {
      try {
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Cancel old Helpship order
        console.log(`[ChangeOrder] Canceling old Helpship order: ${order.helpship_order_id}`);
        await helpshipClient.cancelOrder(order.helpship_order_id);

        // Save original status before syncOrderToHelpship changes it to "pending"
        const originalStatus = order.status;

        // Recreate order in Helpship (reads updated data from DB)
        const syncResult = await syncOrderToHelpship(orderId);

        if (syncResult.success && syncResult.helpshipOrderId) {
          newHelpshipOrderId = syncResult.helpshipOrderId;

          // Restore original status if it was not "pending"
          if (originalStatus !== "pending") {
            await supabaseAdmin
              .from("orders")
              .update({
                status: originalStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("id", orderId);
          }

          // If order was confirmed (Pending in Helpship), unhold the new order
          if (originalStatus === "confirmed") {
            try {
              await helpshipClient.setOrderStatus(syncResult.helpshipOrderId, "Pending");
            } catch (unholdErr) {
              console.error("[ChangeOrder] Failed to unhold new Helpship order:", unholdErr);
              helpshipWarning = "Comanda a fost recreată dar nu s-a putut face unhold. Verifică manual în Helpship.";
            }
          }

          console.log(`[ChangeOrder] New Helpship order created: ${newHelpshipOrderId}`);
        } else {
          helpshipWarning = `Comanda a fost actualizată în DB dar recrearea în Helpship a eșuat: ${syncResult.error}`;
          console.error("[ChangeOrder] Helpship recreate failed:", syncResult.error);
        }
      } catch (helpshipErr) {
        console.error("[ChangeOrder] Helpship cancel/recreate failed:", helpshipErr);
        helpshipWarning = "Comanda a fost actualizată în DB dar sincronizarea cu Helpship a eșuat.";
      }
    }

    return NextResponse.json({
      success: true,
      newHelpshipOrderId,
      helpshipWarning,
    });
  } catch (error) {
    console.error("[ChangeOrder] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
