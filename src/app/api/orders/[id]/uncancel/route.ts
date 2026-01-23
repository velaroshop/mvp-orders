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
    // Verifică autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 },
      );
    }

    const { id: orderId } = await params;

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

    // Verifică dacă comanda este cancelled în DB
    if (order.status !== "cancelled") {
      return NextResponse.json(
        { error: "Comanda nu este anulată" },
        { status: 400 },
      );
    }

    // Dacă comanda are helpshipOrderId, facem uncancel în Helpship
    if (order.helpship_order_id) {
      try {
        // Obține credențialele Helpship pentru organizație
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

        if (orderStatus) {
          const statusName = orderStatus.statusName;
          if (statusName === "Archived") {
            console.log(`[Uncancel] Uncanceling order ${order.helpship_order_id} in Helpship...`);
            await helpshipClient.uncancelOrder(order.helpship_order_id);
            console.log(`[Uncancel] Order ${order.helpship_order_id} uncanceled successfully in Helpship.`);
          } else {
            console.log(`[Uncancel] Order not archived in Helpship (status: ${statusName}), updating DB only`);
          }
        }
      } catch (helpshipError) {
        console.error("Failed to uncancel order in Helpship:", helpshipError);
        const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la anularea anulării comenzii în Helpship";
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 },
        );
      }
    }

    // Restabilim statusul inițial în DB și ștergem datele de anulare
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
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error uncanceling order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
