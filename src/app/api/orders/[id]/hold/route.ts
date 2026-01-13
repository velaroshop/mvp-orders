import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Pune o comandă pe hold: schimbă status-ul în OnHold în Helpship și în "hold" în MVP
 * Primește o notă opțională (max 2 linii) care va fi salvată în DB
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

    // Verificăm statusul curent în MVP
    const currentMvpStatus = order.status;

    // Dacă comanda NU are status "pending" în MVP, doar actualizăm nota (fără să schimbăm statusul)
    if (currentMvpStatus !== "pending") {
      console.log(`[Hold] Order ${orderId} has status "${currentMvpStatus}" (not pending), updating note only...`);
      
      // Doar actualizăm nota, fără să schimbăm statusul
      const updateData: any = {};
      if (note !== undefined) {
        updateData.order_note = note.trim() || null;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order note in DB:", updateError);
        return NextResponse.json(
          { error: "Failed to update order note" },
          { status: 500 },
        );
      }

      console.log(`[Hold] Order ${orderId} note updated (status remains "${currentMvpStatus}")`);
      return NextResponse.json({ success: true, noteOnly: true }, { status: 200 });
    }

    // Dacă comanda ARE status "pending" în MVP, o putem pune pe hold
    // Verificăm statusul în Helpship pentru a ne asigura că e "Pending"
    if (order.helpship_order_id) {
      try {
        // Verificăm statusul curent în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);
        
        if (!orderStatus) {
          return NextResponse.json(
            { error: "Nu s-a putut verifica statusul comenzii în Helpship" },
            { status: 500 },
          );
        }

        const helpshipStatusName = orderStatus.statusName;
        
        // Dacă statusul în Helpship nu este "Pending", returnăm eroare
        if (helpshipStatusName !== "Pending") {
          return NextResponse.json(
            { error: `Comanda nu poate fi pusă pe Hold deoarece nu are status Pending în Helpship (status actual: ${helpshipStatusName})` },
            { status: 400 },
          );
        }

        // Dacă statusul în Helpship este "Pending", îl putem pune pe "OnHold"
        console.log(`[Helpship] Setting order ${order.helpship_order_id} to OnHold (current status: ${helpshipStatusName})...`);
        
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
    } else {
      // Dacă comanda nu are helpshipOrderId, returnăm eroare
      return NextResponse.json(
        { error: "Comanda nu are Helpship ID" },
        { status: 400 },
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
