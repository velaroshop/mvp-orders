import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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
      .select("id, organization_id, upsells, helpship_order_id")
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

    // Update order in database
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        upsells: updatedUpsells,
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

    // If order has been synced to Helpship, update it there too
    if (order.helpship_order_id) {
      try {
        // Import Helpship client dynamically to avoid circular deps
        const { HelpshipClient } = await import("@/lib/helpship");
        const { getHelpshipCredentials } = await import("@/lib/helpship-credentials");

        const credentials = await getHelpshipCredentials(order.organization_id);
        const helpshipClient = new HelpshipClient(credentials);

        // Get current order from Helpship
        const helpshipOrder = await helpshipClient.getOrder(order.helpship_order_id);

        if (helpshipOrder) {
          // TODO: Update Helpship order with new product line
          // This requires updating the order through Helpship API
          // For now, we'll just log it
          console.log("[Postsale] Would update Helpship order with:", {
            orderId: order.helpship_order_id,
            newProduct: {
              name: productName,
              quantity: upsell.quantity,
              price: upsell.price,
              sku: upsell.product?.sku,
            },
          });

          // Note: Helpship API might not support adding products to existing orders
          // We may need to recreate the order or handle this differently
        }
      } catch (helpshipError) {
        console.error("[Postsale] Failed to update Helpship order:", helpshipError);
        // Don't fail the request - order was updated in our DB
      }
    }

    return NextResponse.json({
      success: true,
      orderId: orderId,
      upsell: newUpsell,
    });
  } catch (error) {
    console.error("Error adding postsale upsell:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
