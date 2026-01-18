import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrderToHelpship } from "@/lib/helpship-sync";

/**
 * POST /api/orders/[id]/add-postsale-upsell - Add a postsale upsell to an existing order
 * Public endpoint - used after order is placed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { upsellId } = body;

    if (!upsellId) {
      return NextResponse.json(
        { error: "Missing upsell ID" },
        { status: 400 }
      );
    }

    // Get the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, organization_id, upsells, helpship_order_id, total")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Get the upsell details with product info
    const { data: upsell, error: upsellError } = await supabaseAdmin
      .from("upsells")
      .select(`
        *,
        product:products!product_id(id, name, sku)
      `)
      .eq("id", upsellId)
      .eq("organization_id", order.organization_id)
      .eq("type", "postsale")
      .eq("active", true)
      .single();

    if (upsellError || !upsell) {
      return NextResponse.json(
        { error: "Postsale upsell not found" },
        { status: 404 }
      );
    }

    // Fetch product name from products table using SKU
    let productName = upsell.title; // Fallback
    if (upsell.product?.sku) {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("name, sku")
        .eq("sku", upsell.product.sku)
        .eq("organization_id", order.organization_id)
        .single();

      if (product?.name) {
        productName = product.name;
      }
    }

    // Add upsell to order's upsells array
    const currentUpsells = Array.isArray(order.upsells) ? order.upsells : [];
    const newUpsell = {
      upsellId: upsell.id,
      title: upsell.title,
      quantity: upsell.quantity,
      price: upsell.price,
      productSku: upsell.product?.sku || null,
      productName: productName,
    };

    const updatedUpsells = [...currentUpsells, newUpsell];

    // Calculate new total including postsale upsell (price * quantity)
    const postsaleTotal = Number(upsell.price) * Number(upsell.quantity);
    const newTotal = Number(order.total) + postsaleTotal;

    console.log("[Postsale] Updating order total:", {
      oldTotal: Number(order.total),
      postsalePrice: Number(upsell.price),
      postsaleQuantity: Number(upsell.quantity),
      postsaleTotal: postsaleTotal,
      newTotal: newTotal,
    });

    // Update order in database with new upsell and updated total
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        upsells: updatedUpsells,
        total: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[Postsale] Failed to update order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    console.log("[Postsale] Upsell added to order, now syncing to Helpship");

    // Sync complete order to Helpship (main product + presale + postsale)
    // This will also change status from 'queue' to 'pending'
    const syncResult = await syncOrderToHelpship(orderId);

    if (!syncResult.success) {
      console.error("[Postsale] Failed to sync to Helpship:", syncResult.error);
      return NextResponse.json(
        {
          error: "Failed to sync order to Helpship",
          details: syncResult.error,
        },
        { status: 500 }
      );
    }

    console.log("[Postsale] Order synced successfully to Helpship:", syncResult.helpshipOrderId);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      upsell: newUpsell,
      helpshipOrderId: syncResult.helpshipOrderId,
    });
  } catch (error) {
    console.error("Error adding postsale upsell:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
