import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Pune o comandă pe hold: schimbă status-ul în OnHold în Helpship și în "hold" în MVP
 * Primește o notă opțională (max 2 linii) care va fi salvată în DB
 *
 * Logica simplificată:
 * - Încearcă să pună comanda pe hold în Helpship folosind POST /api/Order/{id}/hold
 * - Dacă reușește, actualizează statusul în MVP la "hold" și salvează nota
 * - Dacă Helpship returnează eroare (ex: statusul nu permite hold), eroarea este afișată utilizatorului
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { note } = body;

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

    // Verificăm dacă comanda are Helpship ID
    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Comanda nu are Helpship ID" },
        { status: 400 },
      );
    }

    // Încercăm să punem comanda pe hold în Helpship
    // Endpoint-ul /hold va returna eroare dacă statusul nu permite această acțiune
    console.log(`[Hold] Setting order ${orderId} to OnHold in Helpship...`);

    try {
      await helpshipClient.setOrderStatus(order.helpship_order_id, "OnHold");
      console.log(`[Helpship] Order ${order.helpship_order_id} set to OnHold successfully.`);
    } catch (helpshipError) {
      console.error("Failed to set order to OnHold in Helpship:", helpshipError);
      const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la punerea comenzii pe hold în Helpship";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 },
      );
    }

    // Actualizăm statusul în DB la "hold" și salvăm nota
    const updateData: any = {
      status: "hold",
    };

    if (note !== undefined) {
      updateData.order_note = note.trim() || null;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    console.log(`[Hold] Order ${orderId} set to hold status with note: ${note || "none"}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error holding order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
