import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { helpshipClient } from "@/lib/helpship";

/**
 * Obține datele comenzii din Helpship
 */
export async function GET(
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

    // Dacă comanda are helpshipOrderId, obține datele din Helpship
    if (order.helpship_order_id) {
      const helpshipOrder = await helpshipClient.getOrder(order.helpship_order_id);
      
      if (!helpshipOrder) {
        return NextResponse.json(
          { error: "Failed to fetch order from Helpship" },
          { status: 500 },
        );
      }

      return NextResponse.json({ order: helpshipOrder }, { status: 200 });
    }

    // Dacă nu are helpshipOrderId, returnăm null
    return NextResponse.json({ order: null }, { status: 200 });
  } catch (error) {
    console.error("Error fetching Helpship order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
