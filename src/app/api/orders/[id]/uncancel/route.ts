import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Anulează anularea unei comenzi: schimbă status-ul din Archived în Pending în Helpship
 * Verifică mai întâi dacă comanda este anulată
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

    // Dacă comanda are helpshipOrderId, verificăm statusul în Helpship
    if (order.helpship_order_id) {
      try {
        // Verificăm statusul comenzii în Helpship
        const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);
        
        if (!orderStatus) {
          return NextResponse.json(
            { error: "Nu s-a putut verifica statusul comenzii în Helpship" },
            { status: 500 },
          );
        }

        // Verificăm dacă comanda este anulată (Archived)
        const statusName = orderStatus.statusName;
        if (statusName !== "Archived") {
          return NextResponse.json(
            { error: "Comanda nu este anulată" },
            { status: 400 },
          );
        }

        console.log(`[Helpship] Uncancel order ${order.helpship_order_id} (current status: ${statusName})...`);

        // Folosim endpoint-ul specific pentru uncancel
        await helpshipClient.uncancelOrder(order.helpship_order_id);
        
        console.log(`[Helpship] Order ${order.helpship_order_id} uncanceled successfully.`);
      } catch (helpshipError) {
        console.error("Failed to uncancel order in Helpship:", helpshipError);
        const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Eroare la anularea anulării comenzii în Helpship";
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 },
        );
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
