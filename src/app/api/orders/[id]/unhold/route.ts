import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Scoate o comandă din hold: revine întotdeauna la status "pending" în MVP
 * Helpship rămâne OnHold (comanda așteaptă confirmare înainte de procesare)
 *
 * Logica simplificată:
 * - Indiferent de statusul anterior (pending sau confirmed), UNHOLD revine la "pending"
 * - Utilizatorul trebuie să facă CONFIRM manual pentru a trimite comanda la procesare
 * - Nota (order_note) se șterge la UNHOLD
 * - Helpship rămâne OnHold până la următoarea confirmare
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

    // Verificăm că comanda este pe hold
    if (order.status !== "hold") {
      return NextResponse.json(
        { error: `Comanda nu este pe hold (status actual: ${order.status})` },
        { status: 400 },
      );
    }

    console.log(`[Unhold] Removing hold from order ${orderId}, reverting to pending`);

    // UNHOLD: Întotdeauna revine la "pending" în MVP
    // Helpship rămâne OnHold (comanda așteaptă confirmare)
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "pending",
        order_note: null, // Ștergem nota
        hold_from_status: null, // Ștergem statusul salvat
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to remove hold from order" },
        { status: 500 },
      );
    }

    console.log(`[Unhold] Order ${orderId} status changed from hold to pending (Helpship remains OnHold)`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing hold from order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
