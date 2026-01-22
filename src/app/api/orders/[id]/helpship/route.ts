import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { HelpshipClient } from "@/lib/helpship";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";

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

    // Dacă comanda are helpshipOrderId, obține datele din Helpship
    if (order.helpship_order_id) {
      // Get Helpship credentials for organization
      const credentials = await getHelpshipCredentials(order.organization_id);
      const helpshipClient = new HelpshipClient(credentials);

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
