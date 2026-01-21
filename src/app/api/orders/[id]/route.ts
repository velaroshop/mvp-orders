import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/orders/[id] - Get order details (public endpoint for client-side tracking)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Fetch order with minimal data needed for client-side tracking
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        product_name,
        product_sku,
        product_quantity,
        upsells,
        subtotal,
        shipping_cost,
        total,
        created_at
      `)
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error in GET /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
