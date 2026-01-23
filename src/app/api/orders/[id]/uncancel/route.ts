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
async function syncUncancelToHelpship(
  helpshipOrderId: string,
  organizationId: string,
) {
  try {
    const credentials = await getHelpshipCredentials(organizationId);
    const helpshipClient = new HelpshipClient(credentials);

    // Verificăm statusul comenzii în Helpship
    const orderStatus = await helpshipClient.getOrderStatus(helpshipOrderId);

    if (!orderStatus) {
      console.error(`[Uncancel Background] Failed to get order status from Helpship for ${helpshipOrderId}`);
      return;
    }

    const statusName = orderStatus.statusName;
    if (statusName !== "Archived") {
      console.log(`[Uncancel Background] Order ${helpshipOrderId} not archived in Helpship (status: ${statusName}), no action needed`);
      return;
    }

    console.log(`[Uncancel Background] Uncanceling order ${helpshipOrderId} in Helpship...`);
    await helpshipClient.uncancelOrder(helpshipOrderId);
    console.log(`[Uncancel Background] Order ${helpshipOrderId} uncanceled successfully in Helpship.`);
  } catch (error) {
    console.error(`[Uncancel Background] Failed to uncancel order ${helpshipOrderId} in Helpship:`, error);
    // Don't throw - this is background processing
  }
}

/**
 * Anulează anularea unei comenzi: schimbă status-ul din Archived în Pending în Helpship
 * Verifică mai întâi dacă comanda este anulată
 * SECURIZAT: Necesită autentificare și verifică ownership-ul
 *
 * OPTIMIZED: Updates DB first, returns immediately, syncs to Helpship in background
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // PARALLELIZED: Run session and params concurrently
    const [session, { id: orderId }] = await Promise.all([
      getServerSession(authOptions),
      params,
    ]);

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

    // Verifică dacă comanda este cancelled în DB
    if (order.status !== "cancelled") {
      return NextResponse.json(
        { error: "Comanda nu este anulată" },
        { status: 400 },
      );
    }

    // Restabilim statusul inițial în DB și ștergem datele de anulare FIRST (fast operation)
    const previousStatus = (order.cancelled_from_status as string) || "pending";
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: previousStatus,
        cancelled_from_status: null,
        cancelled_note: null,
        canceller_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    console.log(`[Uncancel] Order ${orderId} restored to status: ${previousStatus}`);

    // Start background sync to Helpship (fire and forget)
    if (order.helpship_order_id) {
      // Don't await - let it run in the background
      syncUncancelToHelpship(order.helpship_order_id, order.organization_id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error uncanceling order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
