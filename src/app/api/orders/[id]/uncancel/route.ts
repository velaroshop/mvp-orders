import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOrderOwnership } from "@/lib/auth-helpers";

/**
 * Anulează anularea unei comenzi: schimbă status-ul din Archived în Pending în Helpship
 * Verifică mai întâi dacă comanda este anulată
 * SECURIZAT: Necesită autentificare și verifică ownership-ul
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

    // Sync to Helpship (blocking - wait for completion)
    if (order.helpship_order_id) {
      try {
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

        if (orderStatus) {
          const statusName = orderStatus.statusName;
          if (statusName !== "Archived") {
            console.log(`[Uncancel] Order ${order.helpship_order_id} not archived in Helpship (status: ${statusName}), no action needed`);
          } else {
            console.log(`[Uncancel] Uncanceling order ${order.helpship_order_id} in Helpship...`);
            await helpshipClient.uncancelOrder(order.helpship_order_id);
            console.log(`[Uncancel] Order ${order.helpship_order_id} uncanceled successfully in Helpship.`);
          }
        } else {
          console.error(`[Uncancel] Failed to get order status from Helpship for ${order.helpship_order_id}`);
        }
      } catch (helpshipError) {
        console.error(`[Uncancel] Failed to uncancel order in Helpship:`, helpshipError);
        // DB is already updated, log the error but don't fail the request
      }
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
