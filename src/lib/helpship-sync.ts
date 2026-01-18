import { supabaseAdmin } from "./supabase";
import { HelpshipClient } from "./helpship";
import { getHelpshipCredentials } from "./helpship-credentials";

/**
 * Syncs an order to Helpship with all its products (main + presale + postsale upsells)
 * Updates order status to 'pending' and stores helpship_order_id
 */
export async function syncOrderToHelpship(orderId: string): Promise<{
  success: boolean;
  helpshipOrderId?: string;
  error?: string;
}> {
  try {
    console.log("[Helpship Sync] Starting sync for order:", orderId);

    // Get the complete order with all details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[Helpship Sync] Order not found:", orderError);
      return { success: false, error: "Order not found" };
    }

    // Get landing page details for organization_id and store_id
    const { data: landingPage, error: landingError } = await supabaseAdmin
      .from("landing_pages")
      .select("organization_id, store_id")
      .eq("slug", order.landing_key)
      .single();

    if (landingError || !landingPage) {
      console.error("[Helpship Sync] Landing page not found:", landingError);
      return { success: false, error: "Landing page not found" };
    }

    // Get order series from store
    let orderSeries = "VLR"; // Default fallback
    if (landingPage.store_id) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("order_series")
        .eq("id", landingPage.store_id)
        .single();

      if (store?.order_series) {
        orderSeries = store.order_series;
      }
    }

    // Fetch product names for upsells based on SKU
    const upsellsArray = Array.isArray(order.upsells) ? order.upsells : [];
    const upsellsWithProductNames = await Promise.all(
      upsellsArray.map(async (upsell: any) => {
        if (!upsell.productSku) {
          return {
            ...upsell,
            productName: upsell.title, // Fallback to upsell title if no SKU
          };
        }

        // Fetch product by SKU
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name, sku")
          .eq("sku", upsell.productSku)
          .eq("organization_id", landingPage.organization_id)
          .single();

        return {
          ...upsell,
          productName: product?.name || upsell.title, // Use product name or fallback to upsell title
        };
      })
    );

    // Calculate actual total including all upsells (presale + postsale)
    // Each upsell has price and quantity, so total = price * quantity
    const upsellsTotal = upsellsWithProductNames.reduce(
      (sum, upsell) => sum + (Number(upsell.price) || 0) * (Number(upsell.quantity) || 1),
      0
    );
    const actualTotal = Number(order.subtotal) + Number(order.shipping_cost) + upsellsTotal;

    console.log("[Helpship Sync] Total calculation:", {
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shipping_cost),
      upsellsTotal: upsellsTotal,
      calculatedTotal: actualTotal,
      originalTotal: Number(order.total),
    });

    // Get Helpship credentials and create client
    const credentials = await getHelpshipCredentials(landingPage.organization_id);
    const helpshipClient = new HelpshipClient(credentials);

    // Create order in Helpship
    const helpshipResult = await helpshipClient.createOrder({
      orderId: order.id,
      orderNumber: order.order_number || 0,
      orderSeries: orderSeries,
      customerName: order.full_name,
      customerPhone: order.phone,
      county: order.county,
      city: order.city,
      address: order.address,
      offerCode: order.offer_code,
      productSku: order.product_sku || null,
      productName: order.product_name || null,
      productQuantity: order.product_quantity || 1,
      subtotal: Number(order.subtotal) || 0,
      shippingCost: Number(order.shipping_cost) || 0,
      total: actualTotal, // Use calculated total including all upsells
      upsells: upsellsWithProductNames,
    });

    console.log("[Helpship Sync] Order created successfully:", helpshipResult);

    // Update order with helpship_order_id and status 'pending'
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        helpship_order_id: helpshipResult.orderId,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[Helpship Sync] Failed to update order:", updateError);
      return {
        success: false,
        error: "Failed to update order in database",
      };
    }

    console.log("[Helpship Sync] Order synced successfully");
    return {
      success: true,
      helpshipOrderId: helpshipResult.orderId,
    };
  } catch (error) {
    console.error("[Helpship Sync] Failed to sync order:", error);

    // Update order status to 'sync_error'
    try {
      await supabaseAdmin
        .from("orders")
        .update({
          status: "sync_error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    } catch (updateErr) {
      console.error("[Helpship Sync] Failed to update status to sync_error:", updateErr);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
