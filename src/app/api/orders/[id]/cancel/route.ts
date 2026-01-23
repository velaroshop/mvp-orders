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

    // Dacă comanda are helpshipOrderId, anulăm în Helpship
    if (order.helpship_order_id) {
      try {
        // Obține credențialele Helpship pentru organizație
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

        if (!orderStatus) {
          return NextResponse.json(
            { error: "Nu s-a putut verifica statusul comenzii în Helpship" },
            { status: 500 },
          );
        }

        // Verificăm dacă comanda este deja anulată (Archived)
        const statusName = orderStatus.statusName;
        if (statusName === "Archived") {
          // E deja anulată în Helpship, actualizăm doar DB-ul
          console.log(`[Cancel] Order already archived in Helpship, updating DB only`);
        } else {
          console.log(`[Cancel] Canceling order ${order.helpship_order_id} in Helpship (current status: ${statusName})...`);

          // Folosim endpoint-ul specific pentru cancel
          await helpshipClient.cancelOrder(order.helpship_order_id);

          console.log(`[Cancel] Order ${order.helpship_order_id} canceled successfully in Helpship.`);
        }
      } catch (helpshipError) {
        console.error("Failed to cancel order in Helpship:", helpshipError);
        const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la anularea comenzii în Helpship";
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 },
        );
      }
    }

    // Actualizăm statusul în DB la "cancelled"
    // Salvăm statusul curent în cancelled_from_status pentru a-l putea restabili la uncancel
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error canceling order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
