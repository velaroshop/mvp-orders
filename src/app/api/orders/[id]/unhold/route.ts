import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * Scoate o comandă din hold: revine la status "pending" în DB și Pending în Helpship
 *
 * Logica:
 * - UNHOLD revine la "pending" în DB
 * - Nota (order_note) se șterge la UNHOLD
 * - Helpship se sincronizează la status Pending (via /unhold endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

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

    // Verificăm că comanda este pe hold
    if (order.status !== "hold") {
      return NextResponse.json(
        { error: `Comanda nu este pe hold (status actual: ${order.status})` },
        { status: 400 },
      );
    }

    console.log(`[Unhold] Removing hold from order ${orderId}, reverting to pending`);

    // UNHOLD: Revine la "pending" în DB
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "pending",
        order_note: null, // Ștergem nota
        hold_from_status: null, // Ștergem statusul salvat
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to remove hold from order" },
        { status: 500 },
      );
    }

    console.log(`[Unhold] Order ${orderId} DB status changed from hold to pending`);

    // Sync to Helpship (blocking - wait for completion)
    if (order.helpship_order_id) {
      try {
        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

        if (orderStatus) {
          const statusName = orderStatus.statusName;
          if (statusName === "OnHold") {
            console.log(`[Unhold] Setting order ${order.helpship_order_id} to Pending in Helpship...`);
            await helpshipClient.setOrderStatus(order.helpship_order_id, "Pending");
            console.log(`[Unhold] Order ${order.helpship_order_id} set to Pending in Helpship.`);
          } else {
            console.log(`[Unhold] Order ${order.helpship_order_id} not OnHold in Helpship (status: ${statusName}), no action needed`);
          }
        } else {
          console.error(`[Unhold] Failed to get order status from Helpship for ${order.helpship_order_id}`);
        }
      } catch (helpshipError) {
        console.error(`[Unhold] Failed to unhold order in Helpship:`, helpshipError);
        // DB is already updated, log the error but don't fail the request
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing hold from order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
