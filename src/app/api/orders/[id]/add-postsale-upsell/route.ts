import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { sendMetaPurchaseEvent } from "@/lib/meta-tracking";

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
      .select("id, organization_id, upsells, helpship_order_id, total, status, queue_expires_at")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order is in queue status
    if (order.status !== "queue") {
      return NextResponse.json(
        { error: "Order is not in queue status" },
        { status: 400 }
      );
    }

    // Check if queue has expired
    if (order.queue_expires_at) {
      const expiresAt = new Date(order.queue_expires_at);
      const now = new Date();

      if (now >= expiresAt) {
        console.log("[Postsale] Queue expired:", {
          orderId,
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString(),
          expired: true,
        });

        return NextResponse.json(
          {
            error: "Postsale offer has expired",
            message: "The time window for accepting postsale offer has passed",
          },
          { status: 410 } // 410 Gone
        );
      }
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
      type: "postsale",
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

    // Send Meta CAPI Purchase event (if landing page has Meta tracking configured)
    try {
      const { data: fullOrder } = await supabaseAdmin
        .from("orders")
        .select(`
          landing_key,
          event_source_url
        `)
        .eq("id", orderId)
        .single();

      if (fullOrder?.landing_key) {
        const { data: landingPage } = await supabaseAdmin
          .from("landing_pages")
          .select("fb_pixel_id, fb_conversion_token, meta_test_mode, meta_test_event_code")
          .eq("slug", fullOrder.landing_key)
          .single();

        // Only send if landing page has Meta tracking configured
        if (landingPage?.fb_pixel_id && landingPage?.fb_conversion_token) {
          console.log("[Postsale] Sending Meta Purchase event for order:", orderId);

          await sendMetaPurchaseEvent({
            orderId,
            pixelId: landingPage.fb_pixel_id,
            accessToken: landingPage.fb_conversion_token,
            eventSourceUrl: fullOrder.event_source_url || 'https://mvp-orders.vercel.app/widget',
            testEventCode: landingPage.meta_test_mode ? landingPage.meta_test_event_code : undefined,
          });
        }
      }
    } catch (metaError) {
      // Don't fail the request if Meta tracking fails
      console.error("[Postsale] Meta CAPI error (non-fatal):", metaError);
    }

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
