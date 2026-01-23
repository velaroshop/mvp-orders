import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOrderOwnership } from "@/lib/auth-helpers";

/**
 * Anulează o comandă: schimbă status-ul în Archived în Helpship
 * Verifică mai întâi dacă comanda este deja anulată
 * Acceptă opțional o notă de anulare
 * SECURIZAT: Necesită autentificare și verifică ownership-ul
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // PARALLELIZED: Run session, params, and body parsing concurrently
    const [session, { id: orderId }, bodyResult] = await Promise.all([
      getServerSession(authOptions),
      params,
      request.json().catch(() => ({})), // Return empty object if body parsing fails
    ]);

    const cancelNote: string | null = bodyResult?.note || null;

    // Verifică autentificarea
    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 },
      );
    }

    // PARALLELIZED: Run ownership verification and order fetch concurrently
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

    // Verifică dacă comanda este deja cancelled în DB
    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Comanda este deja anulată" },
        { status: 400 },
      );
    }

    // Actualizăm statusul în DB la "cancelled" FIRST (fast operation)
    const currentStatus = order.status;
    const cancellerName = session.user.name || session.user.email || "Unknown";
    console.log(`[Cancel] Current order status: ${currentStatus}, setting to cancelled by ${cancellerName}...`);

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_from_status: currentStatus,
        cancelled_note: cancelNote,
        canceller_name: cancellerName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("[Cancel] Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: `Failed to update order status: ${updateError.message}` },
        { status: 500 },
      );
    }

    console.log(`[Cancel] Order status updated successfully. New status: ${updatedOrder?.status}`);

    // Sync to Helpship (blocking - wait for completion)
    if (order.helpship_order_id) {
      try {
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

        if (orderStatus) {
          const statusName = orderStatus.statusName;
          if (statusName === "Archived") {
            console.log(`[Cancel] Order ${order.helpship_order_id} already archived in Helpship`);
          } else {
            console.log(`[Cancel] Canceling order ${order.helpship_order_id} in Helpship (current status: ${statusName})...`);
            await helpshipClient.cancelOrder(order.helpship_order_id);
            console.log(`[Cancel] Order ${order.helpship_order_id} canceled successfully in Helpship.`);
          }
        } else {
          console.error(`[Cancel] Failed to get order status from Helpship for ${order.helpship_order_id}`);
        }
      } catch (helpshipError) {
        console.error(`[Cancel] Failed to cancel order in Helpship:`, helpshipError);
        // DB is already updated, log the error but don't fail the request
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error canceling order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
