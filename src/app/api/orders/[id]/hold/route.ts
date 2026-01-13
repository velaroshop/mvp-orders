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

    // Verificăm statusul în Helpship PRIMUL pentru a decide ce să facem
    if (!order.helpship_order_id) {
      return NextResponse.json(
        { error: "Comanda nu are Helpship ID" },
        { status: 400 },
      );
    }

    let helpshipStatusName: string;
    try {
      // Verificăm statusul curent în Helpship
      const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);
      
      if (!orderStatus) {
        return NextResponse.json(
          { error: "Nu s-a putut verifica statusul comenzii în Helpship" },
          { status: 500 },
        );
      }

      helpshipStatusName = orderStatus.statusName;
      console.log(`[Hold] Order ${orderId} - MVP status: "${currentMvpStatus}", Helpship status: "${helpshipStatusName}"`);
    } catch (helpshipError) {
      console.error("Failed to get order status from Helpship:", helpshipError);
      const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la verificarea statusului comenzii în Helpship";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 },
      );
    }

    // Cazul 1: Comanda este deja "OnHold" în Helpship
    // Sincronizăm statusul în MVP la "hold" (indiferent de statusul actual în MVP)
    if (helpshipStatusName === "OnHold") {
      console.log(`[Hold] Order ${orderId} is already OnHold in Helpship, syncing MVP status to "hold"...`);
      
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
        console.error("Failed to sync order status in DB:", updateError);
        return NextResponse.json(
          { error: "Failed to sync order status" },
          { status: 500 },
        );
      }

      console.log(`[Hold] Order ${orderId} status synced to "hold" (was "${currentMvpStatus}")`);
      return NextResponse.json({ success: true, synced: true }, { status: 200 });
    }

    // Cazul 2: Comanda este "Pending" în Helpship
    // Dacă statusul în MVP este "pending" → putem pune pe hold
    // Dacă statusul în MVP nu este "pending" → doar actualizăm nota
    if (helpshipStatusName === "Pending") {
      if (currentMvpStatus === "pending") {
        // Putem pune comanda pe hold
        console.log(`[Hold] Order ${orderId} is Pending in Helpship and pending in MVP, setting to OnHold...`);
        
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
      } else {
        // Statusul în MVP nu este "pending", doar actualizăm nota
        console.log(`[Hold] Order ${orderId} is Pending in Helpship but "${currentMvpStatus}" in MVP, updating note only...`);
        
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
    }

    // Cazul 3: Statusul în Helpship nu este nici "Pending", nici "OnHold"
    // Returnăm eroare
    return NextResponse.json(
      { error: `Comanda nu poate fi pusă pe Hold deoarece nu are status Pending sau OnHold în Helpship (status actual: ${helpshipStatusName})` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error holding order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
