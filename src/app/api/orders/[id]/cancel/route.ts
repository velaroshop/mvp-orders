import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOrderOwnership } from "@/lib/auth-helpers";

/**
 * Background sync to Helpship - fire and forget
 * Logs errors but doesn't block the response
 */
async function syncCancelToHelpship(
  helpshipOrderId: string,
  organizationId: string,
) {
  try {
    const credentials = await getHelpshipCredentials(organizationId);
    const helpshipClient = new HelpshipClient(credentials);

    // Verificăm statusul comenzii în Helpship
    const orderStatus = await helpshipClient.getOrderStatus(helpshipOrderId);

    if (!orderStatus) {
      console.error(`[Cancel Background] Failed to get order status from Helpship for ${helpshipOrderId}`);
      return;
    }

    const statusName = orderStatus.statusName;
    if (statusName === "Archived") {
      console.log(`[Cancel Background] Order ${helpshipOrderId} already archived in Helpship`);
      return;
    }

    console.log(`[Cancel Background] Canceling order ${helpshipOrderId} in Helpship (current status: ${statusName})...`);
    await helpshipClient.cancelOrder(helpshipOrderId);
    console.log(`[Cancel Background] Order ${helpshipOrderId} canceled successfully in Helpship.`);
  } catch (error) {
    console.error(`[Cancel Background] Failed to cancel order ${helpshipOrderId} in Helpship:`, error);
    // Don't throw - this is background processing
  }
}

/**
 * Anulează o comandă: schimbă status-ul în Archived în Helpship
 * Verifică mai întâi dacă comanda este deja anulată
 * Acceptă opțional o notă de anulare
 * SECURIZAT: Necesită autentificare și verifică ownership-ul
 *
 * OPTIMIZED: Updates DB first, returns immediately, syncs to Helpship in background
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verifică autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 },
      );
    }

    const { id: orderId } = await params;

    // Parse body pentru nota de anulare (opțională)
    let cancelNote: string | null = null;
    try {
      const body = await request.json();
      cancelNote = body.note || null;
    } catch {
      // Body gol sau invalid - nota rămâne null
    }

    // Verifică că comanda aparține organizației userului
    const ownership = await verifyOrderOwnership(orderId, session.user.activeOrganizationId);
    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.error || "Access denied" },
        { status: 403 },
      );
    }

    // Găsește comanda în DB
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

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

    // Start background sync to Helpship (fire and forget)
    if (order.helpship_order_id) {
      // Don't await - let it run in the background
      syncCancelToHelpship(order.helpship_order_id, order.organization_id);
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
