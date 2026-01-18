import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/store";
import { HelpshipClient } from "@/lib/helpship";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { findOrCreateCustomer, updateCustomerStats } from "@/lib/customer";
import type { OfferCode } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      landingKey,
      offerCode,
      phone,
      fullName,
      county,
      city,
      address,
      upsells = [],
      subtotal,
      shippingCost,
      total,
    } = body;

    if (
      !landingKey ||
      !offerCode ||
      !phone ||
      !fullName ||
      !county ||
      !city ||
      !address
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const validOfferCodes: OfferCode[] = ["offer_1", "offer_2", "offer_3"];
    if (!validOfferCodes.includes(offerCode)) {
      return NextResponse.json(
        { error: "Invalid offer code" },
        { status: 400 },
      );
    }

    // Obține organization_id, store_id, SKU și cantități din landing page
    const { data: landingPage } = await supabaseAdmin
      .from("landing_pages")
      .select("organization_id, store_id, product_id, main_sku, quantity_offer_1, quantity_offer_2, quantity_offer_3")
      .eq("slug", landingKey)
      .single();

    if (!landingPage) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 },
      );
    }

    // Determine quantity based on offer code
    const quantityMap: Record<string, number> = {
      offer_1: landingPage.quantity_offer_1 || 1,
      offer_2: landingPage.quantity_offer_2 || 2,
      offer_3: landingPage.quantity_offer_3 || 3,
    };
    const productQuantity = quantityMap[offerCode] || 1;
    const productSku = landingPage.main_sku || null;

    // Obține numele produsului din baza de date
    let productName: string | null = null;
    if (landingPage.product_id) {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("name")
        .eq("id", landingPage.product_id)
        .single();
      productName = product?.name || null;
    }

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

    // Step 1: Find or create customer
    const customer = await findOrCreateCustomer({
      organizationId: landingPage.organization_id,
      phone,
    });

    // Step 2: Create order with customer reference
    const order = await createOrder({
      organizationId: landingPage.organization_id,
      customerId: customer.id,
      landingKey,
      offerCode,
      phone,
      fullName,
      county,
      city,
      address,
      upsells,
      subtotal: Number(subtotal) || 0,
      shippingCost: Number(shippingCost) || 0,
      total: Number(total) || 0,
      productName,
      productSku,
      productQuantity,
    });

    // Step 3: Update customer stats
    await updateCustomerStats({
      customerId: customer.id,
      orderTotal: Number(total) || 0,
    });

    // Step 4: Mark associated partial order as converted (if exists)
    // Find the most recent partial order for this phone + landing page that hasn't been converted yet
    try {
      const { data: partialOrder } = await supabaseAdmin
        .from("partial_orders")
        .select("id")
        .eq("organization_id", landingPage.organization_id)
        .eq("phone", phone)
        .eq("landing_key", landingKey)
        .is("converted_to_order_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (partialOrder) {
        const { error: updateError } = await supabaseAdmin
          .from("partial_orders")
          .update({
            status: "accepted",
            converted_to_order_id: order.id,
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", partialOrder.id);

        if (updateError) {
          console.error("❌ Failed to mark partial order as converted:", updateError);
        } else {
          console.log("✅ Marked partial order as converted:", {
            partialId: partialOrder.id,
            orderId: order.id,
          });
        }
      } else {
        console.log("ℹ️ No partial order found to convert (direct order)");
      }
    } catch (err) {
      // Don't fail the order creation if partial update fails
      console.error("Error updating partial order:", err);
    }

    // Order created with status "queue" - will be synced to Helpship after postsale decision
    // Helpship sync is handled by:
    // - /api/orders/[id]/finalize (if user declines postsale or timeout)
    // - /api/orders/[id]/add-postsale-upsell (if user accepts postsale)
    console.log("[Order] Created with status 'queue', awaiting postsale decision");

    return NextResponse.json(
      {
        orderId: order.id,
        status: "queue",
        queueExpiresAt: order.queueExpiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

