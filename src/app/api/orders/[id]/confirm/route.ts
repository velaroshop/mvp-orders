import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Confirmă o comandă: schimbă status-ul din pending în confirmed
 * și actualizează comanda în Helpship din ONHOLD în PENDING
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

    // Găsește comanda în DB
    const { data: order, error: fetchError } = await supabase
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

    if (order.status === "confirmed") {
      return NextResponse.json(
        { error: "Order already confirmed" },
        { status: 400 },
      );
    }

    // Dacă comanda are helpshipOrderId, actualizează-o în Helpship
    if (order.helpship_order_id) {
      try {
        console.log(`[Helpship] Attempting to update order ${order.helpship_order_id} status to PENDING...`);
        await helpshipClient.updateOrder(order.helpship_order_id, {
          status: "PENDING",
          paymentStatus: "Pending", // Asigură-te că paymentStatus rămâne "Pending"
        });
        console.log(`[Helpship] Order ${order.helpship_order_id} status updated to PENDING.`);
      } catch (helpshipError) {
        // Loghează eroarea dar continuă cu update-ul local
        console.error("Failed to update order in Helpship:", helpshipError);
        // Poți alege să returnezi eroare sau să continui
        // Pentru MVP, continuăm cu update-ul local
      }
    }

    // Actualizează status-ul în DB
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error confirming order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
